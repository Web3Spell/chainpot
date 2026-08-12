import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_CONFIG } from "../config/hooksConf";

const vaultConfig = {
  address: CONTRACT_CONFIG.addresses.vault as `0x${string}`,
  abi: CONTRACT_CONFIG.abis.vault,
};

export function useWithdrawable(user: `0x${string}` | undefined) {
  return useReadContract({
    ...vaultConfig,
    functionName: "withdrawable",
    args: user ? [user] : undefined,
    query: {
      enabled: !!user,
    },
  });
}

export function useTreasury() {
  return useReadContract({
    ...vaultConfig,
    functionName: "treasury",
  });
}

export function useTreasuryBps() {
  return useReadContract({
    ...vaultConfig,
    functionName: "TREASURY_FEE_BPS",
  });
}

export function useClaim() {
  const { data: hash, isPending, writeContract, error } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const claim = () => {
    writeContract({
      ...vaultConfig,
      functionName: "claim",
    });
  };

  return {
    claim,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}
