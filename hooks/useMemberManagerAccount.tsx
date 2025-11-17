import {
    useReadContract,
    useWriteContract,
    useSimulateContract,
    useWatchContractEvent,
  } from "wagmi";
  import { CONTRACT_CONFIG } from "@/config/hooksConf";
  
  const ABI = CONTRACT_CONFIG.abis.memberAccountManager;
  const ADDRESS = CONTRACT_CONFIG.addresses.memberAccountManager;
  
  // ==================================================
  // 🔹 READ HOOKS
  // ==================================================
  
  export const useInitialReputation = () =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "INITIAL_REPUTATION",
    });
  
  export const useReputationBid = () =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "REPUTATION_BID",
    });
  
  export const useReputationParticipation = () =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "REPUTATION_PARTICIPATION",
    });
  
  export const useReputationWin = () =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "REPUTATION_WIN",
    });
  
  export const useIsRegistered = (user: `0x${string}`) =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "isRegistered",
      args: [user],
    });
  
  export const useGetMemberProfile = (user: `0x${string}`) =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "getMemberProfile",
      args: [user],
    });
  
  export const useGetReputationScore = (user: `0x${string}`) =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "getReputationScore",
      args: [user],
    });
  
  export const useGetUserStats = (user: `0x${string}`) =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "getUserStats",
      args: [user],
    });
  
  export const useGetWinRate = (user: `0x${string}`) =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "getWinRate",
      args: [user],
    });
  
  export const useGetCycleParticipation = (
    user: `0x${string}`,
    potId: bigint,
    cycleId: bigint
  ) =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "getCycleParticipation",
      args: [user, potId, cycleId],
    });
  
  export const useGetPotCycles = (user: `0x${string}`, potId: bigint) =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "getPotCycles",
      args: [user, potId],
    });
  
  export const useGetTopMembers = (count: bigint) =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "getTopMembers",
      args: [count],
    });
  
  export const useGetTotalMembers = () =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "getTotalMembers",
    });
  
  export const useGetMemberByIndex = (index: bigint) =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "getMemberByIndex",
      args: [index],
    });
  
  export const useIsPotCreator = (user: `0x${string}`, potId: bigint) =>
    useReadContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "isPotCreator",
      args: [user, potId],
    });
  
  // ==================================================
  // 🔹 WRITE HOOKS (Correct Wagmi pattern)
  // ==================================================
  
  export const useRegisterMember = () => {
    const { writeContract, isPending, error } = useWriteContract();
  
    const registerMember = ( user: `0x${string}`) =>
      writeContract({
        address: ADDRESS,
        abi: ABI,
        functionName: "registerMember",
        args: [user],
      });
  
    return { registerMember, isPending, error };
  };
  
  export const useAddAuthorizedCaller = () => {
    const { writeContract, isPending, error } = useWriteContract();
  
    const addAuthorizedCaller = (caller: `0x${string}`) =>
      writeContract({
        address: ADDRESS,
        abi: ABI,
        functionName: "addAuthorizedCaller",
        args: [caller],
      });
  
    return { addAuthorizedCaller, isPending, error };
  };
  
  export const useRemoveAuthorizedCaller = () => {
    const { writeContract, isPending, error } = useWriteContract();
  
    const removeCaller = (caller: `0x${string}`) =>
      writeContract({
        address: ADDRESS,
        abi: ABI,
        functionName: "removeAuthorizedCaller",
        args: [caller],
      });
  
    return { removeCaller, isPending, error };
  };
  
  export const useMarkAsWinner = () => {
    const { writeContract, isPending, error } = useWriteContract();
  
    const markAsWinner = (
      user: `0x${string}`,
      potId: bigint,
      cycleId: bigint
    ) =>
      writeContract({
        address: ADDRESS,
        abi: ABI,
        functionName: "markAsWinner",
        args: [user, potId, cycleId],
      });
  
    return { markAsWinner, isPending, error };
  };
  
  export const useUpdateBidInfo = () => {
    const { writeContract, isPending, error } = useWriteContract();
  
    const updateBidInfo = (
      user: `0x${string}`,
      potId: bigint,
      cycleId: bigint,
      bidAmount: bigint,
      didBid: boolean
    ) =>
      writeContract({
        address: ADDRESS,
        abi: ABI,
        functionName: "updateBidInfo",
        args: [user, potId, cycleId, bidAmount, didBid],
      });
  
    return { updateBidInfo, isPending, error };
  };
  
  export const useUpdateParticipation = () => {
    const { writeContract, isPending, error } = useWriteContract();
  
    const updateParticipation = (
      user: `0x${string}`,
      potId: bigint,
      cycleId: bigint,
      contribution: bigint,
      isCreator: boolean
    ) =>
      writeContract({
        address: ADDRESS,
        abi: ABI,
        functionName: "updateParticipation",
        args: [user, potId, cycleId, contribution, isCreator],
      });
  
    return { updateParticipation, isPending, error };
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
  
  export const useRenounceOwnership = () => {
    const { writeContract, isPending, error } = useWriteContract();
  
    const renounceOwnership = () =>
      writeContract({
        address: ADDRESS,
        abi: ABI,
        functionName: "renounceOwnership",
      });
  
    return { renounceOwnership, isPending, error };
  };
  
  // ==================================================
  // 🔹 SIMULATION HOOKS
  // ==================================================
  
  export const useSimRegisterMember = (user: `0x${string}`) =>
    useSimulateContract({
      address: ADDRESS,
      abi: ABI,
      functionName: "registerMember",
      args: [user],
    });
  
  // ==================================================
  // 🔹 EVENT WATCHERS
  // ==================================================
  
  export const useOnMemberRegistered = (callback: any) =>
    useWatchContractEvent({
      address: ADDRESS,
      abi: ABI,
      eventName: "MemberRegistered",
      onLogs: callback,
    });
  
  export const useOnBidUpdated = (callback: any) =>
    useWatchContractEvent({
      address: ADDRESS,
      abi: ABI,
      eventName: "BidUpdated",
      onLogs: callback,
    });
  
  export const useOnWinnerMarked = (callback: any) =>
    useWatchContractEvent({
      address: ADDRESS,
      abi: ABI,
      eventName: "WinnerMarked",
      onLogs: callback,
    });
  