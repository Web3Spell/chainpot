import { createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { CONTRACT_CONFIG } from "@/config/hooksConf";
import type { Engine } from "@/lib/pot";

const client = createPublicClient({
  chain: baseSepolia,
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
