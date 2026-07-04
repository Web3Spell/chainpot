import { useReadContracts, useReadContract } from "wagmi";
import { CONTRACT_CONFIG } from "../config/hooksConf";
import { usePotCounter } from "./useRoscaEngine";

export function useGlobalStats() {
  const { data: circleCountRaw } = usePotCounter("circle");
  const { data: auctionCountRaw } = usePotCounter("auction");

  const circleCount = Number(circleCountRaw || 0);
  const auctionCount = Number(auctionCountRaw || 0);

  const circleCalls = Array.from({ length: circleCount }).map((_, i) => ({
    address: CONTRACT_CONFIG.addresses.circleEngine as `0x${string}`,
    abi: CONTRACT_CONFIG.abis.circleEngine,
    functionName: "getPot",
    args: [BigInt(i + 1)],
  }));

  const auctionCalls = Array.from({ length: auctionCount }).map((_, i) => ({
    address: CONTRACT_CONFIG.addresses.auctionEngine as `0x${string}`,
    abi: CONTRACT_CONFIG.abis.auctionEngine,
    functionName: "getPot",
    args: [BigInt(i + 1)],
  }));

  const { data: potsData } = useReadContracts({
    contracts: [...circleCalls, ...auctionCalls],
    query: {
      enabled: circleCount > 0 || auctionCount > 0,
    }
  });

  const { data: treasuryInfo } = useReadContract({
    address: CONTRACT_CONFIG.addresses.vault as `0x${string}`,
    abi: CONTRACT_CONFIG.abis.vault,
    functionName: "getTreasuryInfo",
  });

  let activeContributions = BigInt(0);
  let activePools = 0;
  let completedPools = 0;

  if (potsData) {
    potsData.forEach((result) => {
      if (result.status === "success" && result.result) {
        const res = result.result as any;
        const status = Number(res[5]);
        const expectedMembers = BigInt(res[3]);
        const amountPerCycle = BigInt(res[4]);
        const currentCycle = BigInt(res[6]);

        if (status === 1) { // Active
          activePools++;
          activeContributions += amountPerCycle * expectedMembers * (currentCycle > BigInt(0) ? currentCycle : BigInt(1));
        } else if (status === 2) { // Completed
          completedPools++;
        }
      }
    });
  }

  const totalAccrued = treasuryInfo ? BigInt((treasuryInfo as any)[1] || 0) : BigInt(0);
  
  // Previous 30 days is hard to calculate without indexer, so we use a mock ratio for now
  const prevInterest = totalAccrued / BigInt(3); 

  return {
    totalPools: circleCount + auctionCount,
    activePools,
    completedPools,
    activeContributions,
    totalAccrued,
    prevInterest
  };
}

export function formatUSDC(value: bigint) {
  return (Number(value) / 1e6).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
