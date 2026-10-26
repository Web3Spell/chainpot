import { useReadContract } from "wagmi";
import { useContractAction } from "./useContractAction";
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

export function useTotalObligations() {
  return useReadContract({ ...vaultConfig, functionName: "totalObligations" });
}

export function useClaim() {
  const action = useContractAction();
  const claim = () => action.write({ ...vaultConfig, functionName: "claim", args: [] });
  return { ...action, claim };
}
