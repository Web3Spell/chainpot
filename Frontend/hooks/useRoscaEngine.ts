import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_CONFIG } from "../config/hooksConf";

type EngineType = "circle" | "auction";

const getEngineConfig = (type: EngineType) => ({
  address: (type === "circle" ? CONTRACT_CONFIG.addresses.circleEngine : CONTRACT_CONFIG.addresses.auctionEngine) as `0x${string}`,
  abi: type === "circle" ? CONTRACT_CONFIG.abis.circleEngine : CONTRACT_CONFIG.abis.auctionEngine,
});

export function usePotCounter(type: EngineType) {
  return useReadContract({
    ...getEngineConfig(type),
    functionName: "potCounter",
  });
}

export function useGetPot(type: "circle" | "auction", potId: number | bigint) {
  return useReadContract({
    ...getEngineConfig(type),
    functionName: "getPot",
    args: [BigInt(potId || 0)],
    query: { enabled: !!potId },
  });
}

export function useGetCycle(type: EngineType, potId: number | bigint, cycleIdx: number | bigint) {
  return useReadContract({
    ...getEngineConfig(type),
    functionName: "getCycle",
    args: [BigInt(potId || 0), BigInt(cycleIdx || 0)],
    query: { enabled: !!potId && !!cycleIdx },
  });
}

export function useGetMembers(type: EngineType, potId: number | bigint) {
  return useReadContract({
    ...getEngineConfig(type),
    functionName: "getMembers",
    args: [BigInt(potId || 0)],
    query: { enabled: !!potId },
  });
}

export function useIsMember(type: EngineType, potId: number | bigint, user: `0x${string}` | undefined) {
  return useReadContract({
    ...getEngineConfig(type),
    functionName: "isMember",
    args: user ? [BigInt(potId || 0), user] : undefined,
    query: { enabled: !!potId && !!user },
  });
}

export function usePaidForCycle(type: EngineType, potId: number | bigint, cycleIdx: number | bigint, user: `0x${string}` | undefined) {
  return useReadContract({
    ...getEngineConfig(type),
    functionName: "paidForCycle",
    args: user ? [BigInt(potId || 0), BigInt(cycleIdx || 0), user] : undefined,
    query: { enabled: !!potId && !!cycleIdx && !!user },
  });
}

export function useDefaulted(type: EngineType, potId: number | bigint, user: `0x${string}` | undefined) {
  return useReadContract({
    ...getEngineConfig(type),
    functionName: "defaulted",
    args: user ? [BigInt(potId || 0), user] : undefined,
    query: { enabled: !!potId && !!user },
  });
}

export function useHasWonInPot(type: EngineType, potId: number | bigint, user: `0x${string}` | undefined) {
  return useReadContract({
    ...getEngineConfig(type),
    functionName: "hasWonInPot",
    args: user ? [BigInt(potId || 0), user] : undefined,
    query: { enabled: !!potId && !!user },
  });
}

// Write Hooks

function useEngineWrite(type: EngineType, functionName: string) {
  const { data: hash, isPending, writeContract, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const write = (args: any[]) => {
    writeContract({
      ...getEngineConfig(type),
      functionName,
      args,
    } as any);
  };

  return { write, hash, isPending, isConfirming, isConfirmed, error };
}

export function useJoinPot(type: EngineType) {
  const { write, ...rest } = useEngineWrite(type, "joinPot");
  return { joinPot: (potId: bigint, proof: `0x${string}`[]) => write([potId, proof]), ...rest };
}

export function useStartPot(type: EngineType) {
  const { write, ...rest } = useEngineWrite(type, "startPot");
  return { startPot: (potId: bigint) => write([potId]), ...rest };
}

export function useStartCycle(type: EngineType) {
  const { write, ...rest } = useEngineWrite(type, "startCycle");
  return { startCycle: (potId: bigint) => write([potId]), ...rest };
}

export function usePayForCycle(type: EngineType) {
  const { write, ...rest } = useEngineWrite(type, "payForCycle");
  return { payForCycle: (potId: bigint) => write([potId]), ...rest };
}

export function useSettleCycle(type: EngineType) {
  const { write, ...rest } = useEngineWrite(type, "settleCycle");
  return { settleCycle: (potId: bigint) => write([potId]), ...rest };
}
