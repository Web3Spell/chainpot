import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_CONFIG } from "../config/hooksConf";

const circleConfig = {
  address: CONTRACT_CONFIG.addresses.circleEngine as `0x${string}`,
  abi: CONTRACT_CONFIG.abis.circleEngine,
};

export function useCreateCirclePot() {
  const { data: hash, isPending, writeContract, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const createPot = (
    merkleRoot: `0x${string}`,
    memberCount: number,
    amountPerCycle: bigint,
    cycleDuration: number,
    paymentWindow: number
  ) => {
    writeContract({
      ...circleConfig,
      functionName: "createPot",
      args: [merkleRoot, BigInt(memberCount), amountPerCycle, BigInt(cycleDuration), BigInt(paymentWindow)],
    });
  };

  return { createPot, hash, isPending, isConfirming, isConfirmed, error };
}

export function useDrawWinner() {
  const { data: hash, isPending, writeContract, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({ hash });

  const drawWinner = (potId: bigint) => {
    writeContract({
      ...circleConfig,
      functionName: "drawWinner",
      args: [potId],
    });
  };

  return { drawWinner, hash, isPending, isConfirming, isConfirmed, error };
}
