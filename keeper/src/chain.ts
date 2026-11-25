import { createPublicClient, http, type Address, type PublicClient } from "viem";
import { base, baseSepolia } from "viem/chains";
import { NETWORK } from "../../Frontend/config/network.ts";

/** Chain picked by CHAIN / NEXT_PUBLIC_CHAIN (see Frontend/config/network.ts). */
export const CHAIN = NETWORK.chainId === base.id ? base : baseSepolia;
import { CONTRACT_CONFIG } from "../../Frontend/config/hooksConf.ts";
import { CycleStatus, PotStatus, parseCycle, parsePot, parsePotConfig, type Engine } from "../../Frontend/lib/pot.ts";
import type { PotSnapshot } from "./plan.ts";

export const ENGINES: Engine[] = ["circle", "auction"];

export function engineAddress(engine: Engine): Address {
  return (engine === "circle" ? CONTRACT_CONFIG.addresses.circleEngine : CONTRACT_CONFIG.addresses.auctionEngine) as Address;
}

// Shared base functions have identical signatures on both engines.
export const engineAbi = CONTRACT_CONFIG.abis.circleEngine;
export const auctionAbi = CONTRACT_CONFIG.abis.auctionEngine;
export const vaultAbi = CONTRACT_CONFIG.abis.vault;
export const vaultAddress = CONTRACT_CONFIG.addresses.vault as Address;

export function makePublicClient(rpcUrl: string): PublicClient {
  return createPublicClient({ chain: CHAIN, transport: http(rpcUrl), batch: { multicall: true } }) as PublicClient;
}

/** Read every non-completed pot (and completed ones with unreleased slots) on both engines. */
export async function loadSnapshots(client: PublicClient, keeper: Address | undefined): Promise<PotSnapshot[]> {
  const out: PotSnapshot[] = [];
  for (const engine of ENGINES) {
    const address = engineAddress(engine);
    const count = Number(await client.readContract({ address, abi: engineAbi, functionName: "potCounter" }));
    const ids = Array.from({ length: count }, (_, i) => BigInt(i + 1));

    const snaps = await Promise.all(
      ids.map(async (potId): Promise<PotSnapshot | undefined> => {
        const pot = parsePot(await client.readContract({ address, abi: engineAbi, functionName: "getPot", args: [potId] }));
        if (!pot || pot.status === PotStatus.Open) return undefined;
        const [config, cycle] = await Promise.all([
          client.readContract({ address, abi: engineAbi, functionName: "getPotConfig", args: [potId] }).then(parsePotConfig),
          pot.currentCycle > 0
            ? client.readContract({ address, abi: engineAbi, functionName: "getCycle", args: [potId, BigInt(pot.currentCycle)] }).then(parseCycle)
            : Promise.resolve(undefined),
        ]);
        const snap: PotSnapshot = { engine, potId, pot, config, cycle };

        if (cycle?.status === CycleStatus.AwaitingVRF) {
          snap.drawReady = await client.readContract({ address, abi: engineAbi, functionName: "drawReady", args: [potId] });
          if (!snap.drawReady && keeper) {
            // The contract knows the VRF request time; simulating is the exact retry check.
            snap.retrySimulates = await client
              .simulateContract({ address, abi: engineAbi, functionName: "cancelStuckVRFCycle", args: [potId], account: keeper })
              .then(() => true, () => false);
          }
        }

        if (pot.status === PotStatus.Completed) {
          const members = (await client.readContract({ address, abi: engineAbi, functionName: "getMembers", args: [potId] })) as Address[];
          const released = await Promise.all(
            members.map((m) => client.readContract({ address, abi: engineAbi, functionName: "slotReleased", args: [potId, m] })),
          );
          snap.members = members.map((m, i) => ({ address: m, slotReleased: released[i] as boolean }));
        }
        return snap;
      }),
    );
    for (const s of snaps) if (s) out.push(s);
  }
  return out;
}

/** Claimable balances for every member of every pot. */
export async function loadBalances(client: PublicClient): Promise<Map<Address, bigint>> {
  const users = new Set<Address>();
  for (const engine of ENGINES) {
    const address = engineAddress(engine);
    const count = Number(await client.readContract({ address, abi: engineAbi, functionName: "potCounter" }));
    for (let i = 1; i <= count; i++) {
      const members = (await client.readContract({ address, abi: engineAbi, functionName: "getMembers", args: [BigInt(i)] })) as Address[];
      members.forEach((m) => users.add(m));
    }
  }
  const list = [...users];
  const amounts = await Promise.all(list.map((u) => client.readContract({ address: vaultAddress, abi: vaultAbi, functionName: "withdrawable", args: [u] })));
  return new Map(list.map((u, i) => [u, amounts[i] as bigint]));
}
