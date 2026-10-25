import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { friendlyError } from "@/lib/errors";

/**
 * One write + its receipt, with a human-readable error and a global read refresh once mined.
 * Replaces the per-component `setTimeout(refetch)` pattern.
 */
export function useContractAction() {
  const queryClient = useQueryClient();
  const { writeContract, writeContractAsync, data: hash, isPending, error: writeError, reset } = useWriteContract();
  const {
    data: receipt,
    isLoading: isConfirming,
    isSuccess: isMined,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash });

  const reverted = receipt?.status === "reverted";
  const isConfirmed = isMined && !reverted;

  useEffect(() => {
    if (isMined) queryClient.invalidateQueries();
  }, [isMined, queryClient]);

  const error = writeError ?? receiptError ?? (reverted ? new Error("The transaction was reverted on-chain.") : null);

  return {
    write: writeContract,
    writeAsync: writeContractAsync,
    hash,
    receipt,
    isPending,
    isConfirming,
    isConfirmed,
    isBusy: isPending || isConfirming,
    error,
    errorMessage: friendlyError(error),
    reset,
  };
}
