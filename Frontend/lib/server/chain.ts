import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { CONTRACT_CONFIG } from "@/config/hooksConf";
import { PotStatus, parseCycle, parsePot, type Engine } from "@/lib/pot";
import type { PotState } from "@/lib/reminders";

const client = createPublicClient({
  chain: baseSepolia,
  batch: { multicall: true },
  transport: http(process.env.BASE_SEPOLIA_RPC_URL || process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || "https://base-sepolia-rpc.publicnode.com"),
});

/** The pot's current on-chain Merkle root, or undefined if the pot doesn't exist. */
export async function readPotRoot(engine: Engine, potId: bigint): Promise<`0x${string}` | undefined> {
  const pot = await client.readContract({
    address: (engine === "circle" ? CONTRACT_CONFIG.addresses.circleEngine : CONTRACT_CONFIG.addresses.auctionEngine) as `0x${string}`,
    abi: CONTRACT_CONFIG.abis.circleEngine,
    functionName: "getPot",
    args: [potId],
  });
  return pot[0] === "0x0000000000000000000000000000000000000000" ? undefined : pot[1];
}


/** Active pots with per-member flags for the current round (reminder input). */
export async function readActivePotStates(): Promise<PotState[]> {
  const out: PotState[] = [];
  for (const engine of ["circle", "auction"] as const) {
    const address = (engine === "circle" ? CONTRACT_CONFIG.addresses.circleEngine : CONTRACT_CONFIG.addresses.auctionEngine) as `0x${string}`;
    const abi = CONTRACT_CONFIG.abis.circleEngine;
    const count = Number(await client.readContract({ address, abi, functionName: "potCounter" }));
    for (let i = 1; i <= count; i++) {
      const potId = BigInt(i);
      const pot = parsePot(await client.readContract({ address, abi, functionName: "getPot", args: [potId] }));
      if (!pot || pot.status !== PotStatus.Active || pot.currentCycle === 0) continue;
      const idx = BigInt(pot.currentCycle);
      const [cycleRaw, members] = await Promise.all([
        client.readContract({ address, abi, functionName: "getCycle", args: [potId, idx] }),
        client.readContract({ address, abi, functionName: "getMembers", args: [potId] }),
      ]);
      const flags = await Promise.all(
        members.map((m) =>
          Promise.all([
            client.readContract({ address, abi, functionName: "paidForCycle", args: [potId, idx, m] }),
            client.readContract({ address, abi, functionName: "hasWonInPot", args: [potId, m] }),
            client.readContract({ address, abi, functionName: "defaulted", args: [potId, m] }),
          ]),
        ),
      );
      out.push({
        engine,
        potId,
        pot,
        cycle: parseCycle(cycleRaw),
        members: members.map((m, j) => ({ address: m, paid: flags[j][0], hasWon: flags[j][1], defaulted: flags[j][2] })),
      });
    }
  }
  return out;
}

const usdcBalanceAbi = [
  { type: "function", name: "balanceOf", stateMutability: "view", inputs: [{ name: "a", type: "address" }], outputs: [{ type: "uint256" }] },
] as const;

function engineAt(engine: Engine) {
  return {
    address: (engine === "circle" ? CONTRACT_CONFIG.addresses.circleEngine : CONTRACT_CONFIG.addresses.auctionEngine) as `0x${string}`,
    abi: CONTRACT_CONFIG.abis.circleEngine,
  };
}

/** Facts the server needs to scope an autopay mandate. */
export async function readPotFacts(engine: Engine, potId: bigint, member: `0x${string}`) {
  const e = engineAt(engine);
  const pot = parsePot(await client.readContract({ ...e, functionName: "getPot", args: [potId] }));
  if (!pot) return { exists: false, isMember: false, amountPerCycle: BigInt(0), cycleDuration: 0, cyclesLeft: 0, active: false };
  const [config, isMember] = await Promise.all([
    client.readContract({ ...e, functionName: "getPotConfig", args: [potId] }),
    client.readContract({ ...e, functionName: "isMember", args: [potId, member] }),
  ]);
  return {
    exists: true,
    isMember,
    amountPerCycle: pot.amountPerCycle,
    cycleDuration: Number(config[0]),
    cyclesLeft: pot.expectedMembers - pot.completedCycles,
    active: pot.status !== PotStatus.Completed,
  };
}

/** Current-round state for one autopay mandate. */
export async function readMandateRoundState(engine: Engine, potId: bigint, member: `0x${string}`) {
  const e = engineAt(engine);
  const pot = parsePot(await client.readContract({ ...e, functionName: "getPot", args: [potId] }));
  const potFinished = !pot || pot.status === PotStatus.Completed;
  const idx = BigInt(pot?.currentCycle ?? 0);
  const [cycleRaw, paid, defaulted, balance] = await Promise.all([
    idx > BigInt(0) ? client.readContract({ ...e, functionName: "getCycle", args: [potId, idx] }) : Promise.resolve(undefined),
    idx > BigInt(0) ? client.readContract({ ...e, functionName: "paidForCycle", args: [potId, idx, member] }) : Promise.resolve(false),
    client.readContract({ ...e, functionName: "defaulted", args: [potId, member] }),
    client.readContract({ address: CONTRACT_CONFIG.addresses.usdc as `0x${string}`, abi: usdcBalanceAbi, functionName: "balanceOf", args: [member] }),
  ]);
  const cycle = parseCycle(cycleRaw);
  const now = Math.floor(Date.now() / 1000);
  return {
    paymentOpen: !potFinished && pot?.status === PotStatus.Active && cycle?.status === 1 && now < cycle.paymentDeadline,
    cycleId: Number(idx),
    paid,
    defaulted,
    amountPerCycle: pot?.amountPerCycle ?? BigInt(0),
    balance,
    potFinished,
  };
}

export { client as serverPublicClient };
