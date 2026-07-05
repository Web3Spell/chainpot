import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_CONFIG } from "../config/hooksConf";

const registryConfig = {
  address: CONTRACT_CONFIG.addresses.memberRegistry as `0x${string}`,
  abi: CONTRACT_CONFIG.abis.memberRegistry,
};

export function useIsRegistered(user: `0x${string}` | undefined) {
  return useReadContract({
    ...registryConfig,
    functionName: "isRegistered",
    args: user ? [user] : undefined,
    query: { enabled: !!user },
  });
}

export function useIsBlacklisted(user: `0x${string}` | undefined) {
  return useReadContract({
    ...registryConfig,
    functionName: "isBlacklisted",
    args: user ? [user] : undefined,
    query: { enabled: !!user },
  });
}

export function useCanJoin(user: `0x${string}` | undefined) {
  return useReadContract({
    ...registryConfig,
    functionName: "canJoin",
    args: user ? [user] : undefined,
    query: { enabled: !!user },
  });
}

export function useCanCreate(user: `0x${string}` | undefined) {
  return useReadContract({
    ...registryConfig,
    functionName: "canCreate",
    args: user ? [user] : undefined,
    query: { enabled: !!user },
  });
}

export function useGetMemberProfile(user: `0x${string}` | undefined) {
  return useReadContract({
    ...registryConfig,
    functionName: "getMemberProfile",
    args: user ? [user] : undefined,
    query: { enabled: !!user },
  });
}

export function useGetCreatorProfile(user: `0x${string}` | undefined) {
  return useReadContract({
    ...registryConfig,
    functionName: "getCreatorProfile",
    args: user ? [user] : undefined,
    query: { enabled: !!user },
  });
}

export function useGetReputationScore(user: `0x${string}` | undefined) {
  return useReadContract({
    ...registryConfig,
    functionName: "getReputationScore",
    args: user ? [user] : undefined,
    query: { enabled: !!user },
  });
}

export function useGetTotalMembers() {
  return useReadContract({
    ...registryConfig,
    functionName: "getTotalMembers",
  });
}

export function useRegisterMember() {
  const { data: hash, isPending, writeContract, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({ hash });

  const registerMember = () => {
    writeContract({
      ...registryConfig,
      functionName: "registerMember",
      args: [], // self registration
    });
  };

  return {
    registerMember,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}
