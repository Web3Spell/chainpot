import {
    useReadContract,
    useWriteContract,
    useSimulateContract,
    useWatchContractEvent,
  } from "wagmi";
  import { CONTRACT_CONFIG } from "@/config/hooksConf";
  
  const ABI = CONTRACT_CONFIG.abis.auctionEngine;
  const ADDRESS = CONTRACT_CONFIG.addresses.auctionEngine;
  
  // =====================================================
  // 🔹 READ HOOKS — View Contract State
  // =====================================================
  
  export const useMaxCycleDuration = () =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "MAX_CYCLE_DURATION",
    });
  
  export const useMaxMembers = () =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "MAX_MEMBERS",
    });
  
  export const useMinBidDeadline = () =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "MIN_BID_DEADLINE",
    });
  
  export const useMinCycleDuration = () =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "MIN_CYCLE_DURATION",
    });
  
  export const useUSDC = () =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "USDC",
    });
  
  export const useUSDCDecimals = () =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "USDC_DECIMALS",
    });
  
  export const useCycleCounter = () =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "cycleCounter",
    });
  
  export const usePotCounter = () =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "potCounter",
    });
  
  export const usePaused = () =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "paused",
    });
  
  export const useOwner = () =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "owner",
    });
  
  export const useGetCurrentCycleCount = () =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "getCurrentCycleCount",
    });
  
  export const useGetCurrentPotCount = () =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "getCurrentPotCount",
    });
  
  export const useGetCycleInfo = (cycleId: bigint) =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "getCycleInfo",
      args: [cycleId],
    });
  
  export const useGetPotInfo = (potId: bigint) =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "getPotInfo",
      args: [potId],
    });
  
  export const useGetPotMemberCount = (potId: bigint) =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "getPotMemberCount",
      args: [potId],
    });
  
  export const useGetUserBid = (cycleId: bigint, user: `0x${string}`) =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "getUserBid",
      args: [cycleId, user],
    });
  
  export const useGetUserPots = (user: `0x${string}`) =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "getUserPots",
      args: [user],
    });
  
  export const useHasJoinedPot = (potId: bigint, user: `0x${string}`) =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "hasJoinedPot",
      args: [potId, user],
    });
  
  export const useHasMemberPaidForCycle = (
    potId: bigint,
    user: `0x${string}`
  ) =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "hasMemberPaidForCycle",
      args: [potId, user],
    });
  
  export const useIsPotMember = (potId: bigint, user: `0x${string}`) =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "isPotMember",
      args: [potId, user],
    });
  
  // =====================================================
  // 🔹 WRITE HOOKS (Correct Wagmi Pattern)
  // =====================================================
  
  export const useCreatePot = () => {
    const { writeContract, isPending, error } = useWriteContract();
  
    const createPot = (
      name: string,
      amountPerCycle: bigint,
      cycleDuration: bigint,
      cycleCount: bigint,
      frequency: number,
      bidDepositDeadline: bigint,
      minMembers: bigint,
      maxMembers: bigint
    ) =>
      writeContract({
        address: ADDRESS,
        abi: ABI,
        functionName: "createPot",
        args: [
          name,
          amountPerCycle,
          cycleDuration,
          cycleCount,
          frequency,
          bidDepositDeadline,
          minMembers,
          maxMembers,
        ],
      });
  
    return { createPot, isPending, error };
  };
  
  export const useJoinPot = () => {
    const { writeContract, isPending, error } = useWriteContract();
  
    const joinPot = (potId: bigint) =>
      writeContract({
        address: ADDRESS,
        abi: ABI,
        functionName: "joinPot",
        args: [potId],
      });
  
    return { joinPot, isPending, error };
  };
  
  export const useLeavePot = () => {
    const { writeContract, isPending, error } = useWriteContract();
  
    const leavePot = (potId: bigint) =>
      writeContract({
        address: ADDRESS,
        abi: ABI,
        functionName: "leavePot",
        args: [potId],
      });
  
    return { leavePot, isPending, error };
  };
  
  export const usePayForCycle = () => {
    const { writeContract, isPending, error } = useWriteContract();
  
    const payForCycle = (cycleId: bigint) =>
      writeContract({
        address: ADDRESS,
        abi: ABI,
        functionName: "payForCycle",
        args: [cycleId],
      });
  
    return { payForCycle, isPending, error };
  };
  
  export const usePlaceBid = () => {
    const { writeContract, isPending, error } = useWriteContract();
  
    const placeBid = (cycleId: bigint, bidAmount: bigint) =>
      writeContract({
        address: ADDRESS,
        abi: ABI,
        functionName: "placeBid",
        args: [cycleId, bidAmount],
      });
  
    return { placeBid, isPending, error };
  };
  
  export const useCloseBidding = () => {
    const { writeContract, isPending, error } = useWriteContract();
  
    const closeBidding = (cycleId: bigint) =>
      writeContract({
        address: ADDRESS,
        abi: ABI,
        functionName: "closeBidding",
        args: [cycleId],
      });
  
    return { closeBidding, isPending, error };
  };
  
  export const useDeclareWinner = () => {
    const { writeContract, isPending, error } = useWriteContract();
  
    const declareWinner = (cycleId: bigint) =>
      writeContract({
        address: ADDRESS,
        abi: ABI,
        functionName: "declareWinner",
        args: [cycleId],
      });
  
    return { declareWinner, isPending, error };
  };
  
  export const useCompleteCycle = () => {
    const { writeContract, isPending, error } = useWriteContract();
  
    const completeCycle = (cycleId: bigint) =>
      writeContract({
        address: ADDRESS,
        abi: ABI,
        functionName: "completeCycle",
        args: [cycleId],
      });
  
    return { completeCycle, isPending, error };
  };
  
  export const useStartCycle = () => {
    const { writeContract, isPending, error } = useWriteContract();
  
    const startCycle = (potId: bigint) =>
      writeContract({
        address: ADDRESS,
        abi: ABI,
        functionName: "startCycle",
        args: [potId],
      });
  
    return { startCycle, isPending, error };
  };
  
  // Admin functions
  export const usePause = () => {
    const { writeContract, isPending, error } = useWriteContract();
  
    const pause = () =>
      writeContract({
        address: ADDRESS,
        abi: ABI,
        functionName: "pause",
      });
  
    return { pause, isPending, error };
  };
  
  export const useUnpause = () => {
    const { writeContract, isPending, error } = useWriteContract();
  
    const unpause = () =>
      writeContract({
        address: ADDRESS,
        abi: ABI,
        functionName: "unpause",
      });
  
    return { unpause, isPending, error };
  };
  
  export const useTransferOwnership = () => {
    const { writeContract, isPending, error } = useWriteContract();
  
    const transferOwnership = (newOwner: `0x${string}`) =>
      writeContract({
        address: ADDRESS,
        abi: ABI,
        functionName: "transferOwnership",
        args: [newOwner],
      });
  
    return { transferOwnership, isPending, error };
  };
  
  // =====================================================
  // 🔹 EVENT WATCHERS
  // =====================================================
  
  export const useOnPotCreated = (callback: any) =>
    useWatchContractEvent({
      address: ADDRESS,
      abi: ABI,
      eventName: "PotCreated",
      onLogs: callback,
    });
  
  export const useOnPotJoined = (callback: any) =>
    useWatchContractEvent({
      address: ADDRESS,
      abi: ABI,
      eventName: "JoinedPot",
      onLogs: callback,
    });
  
  export const useOnBidPlaced = (callback: any) =>
    useWatchContractEvent({
      address: ADDRESS,
      abi: ABI,
      eventName: "BidPlaced",
      onLogs: callback,
    });
  
  export const useOnCycleStarted = (callback: any) =>
    useWatchContractEvent({
      address: ADDRESS,
      abi: ABI,
      eventName: "CycleStarted",
      onLogs: callback,
    });
  
  export const useOnWinnerDeclared = (callback: any) =>
    useWatchContractEvent({
      address: ADDRESS,
      abi: ABI,
      eventName: "WinnerDeclared",
      onLogs: callback,
    });
  
  