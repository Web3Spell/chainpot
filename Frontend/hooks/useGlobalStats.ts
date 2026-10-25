import { useReadContracts, useReadContract } from "wagmi";
import { CONTRACT_CONFIG } from "../config/hooksConf";
import { engineContract, usePotCounter } from "./useRoscaEngine";
import { PotStatus, parsePot } from "@/lib/pot";

export function useGlobalStats() {
  const { data: circleCountRaw } = usePotCounter("circle");
  const { data: auctionCountRaw } = usePotCounter("auction");

  const circleCount = Number(circleCountRaw || 0);
  const auctionCount = Number(auctionCountRaw || 0);

  const getPot = (engine: "circle" | "auction", id: number) => ({
    ...engineContract(engine),
    functionName: "getPot" as const,
    args: [BigInt(id)] as const,
  });
  const calls = [
    ...Array.from({ length: circleCount }, (_, i) => getPot("circle", i + 1)),
    ...Array.from({ length: auctionCount }, (_, i) => getPot("auction", i + 1)),
  ];

  const { data: potsData } = useReadContracts({
    contracts: calls,
    query: { enabled: calls.length > 0 },
  });

  const { data: treasuryInfo } = useReadContract({
    address: CONTRACT_CONFIG.addresses.vault as `0x${string}`,
    abi: CONTRACT_CONFIG.abis.vault,
    functionName: "getTreasuryInfo",
  });
  const { data: obligations } = useReadContract({
    address: CONTRACT_CONFIG.addresses.vault as `0x${string}`,
    abi: CONTRACT_CONFIG.abis.vault,
    functionName: "totalObligations",
  });
  const { data: memberTotal } = useReadContract({
    address: CONTRACT_CONFIG.addresses.memberRegistry as `0x${string}`,
    abi: CONTRACT_CONFIG.abis.memberRegistry,
    functionName: "getTotalMembers",
  });

  let activePools = 0;
  let completedPools = 0;
  potsData?.forEach((result) => {
    const pot = result.status === "success" ? parsePot(result.result) : undefined;
    if (pot?.status === PotStatus.Active) activePools++;
    else if (pot?.status === PotStatus.Completed) completedPools++;
  });

  return {
    totalPools: circleCount + auctionCount,
    activePools,
    completedPools,
    // Everything the Vault owes: idle backing + unclaimed credits + value still in Compound.
    totalValueLocked: (obligations as bigint | undefined) ?? BigInt(0),
    // Cumulative 20% interest share routed to the safety fund (treasury).
    safetyFundAccrued: treasuryInfo ? (treasuryInfo as readonly unknown[])[1] as bigint : BigInt(0),
    totalMembers: Number(memberTotal ?? 0),
  };
}

export function formatUSDC(value: bigint) {
  return (Number(value) / 1e6).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
