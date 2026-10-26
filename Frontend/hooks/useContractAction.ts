import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useConfig } from "wagmi";
import { simulateContract, waitForTransactionReceipt } from "wagmi/actions";
import type { Abi, ContractFunctionArgs, ContractFunctionName, Hex, TransactionReceipt } from "viem";
import { friendlyError } from "@/lib/errors";
import { useChainPotAccount, type ContractCall } from "@/lib/aa/account";
import { describeCall } from "@/lib/aa/describe";
import { useConfirm } from "@/components/aa/confirm-sheet";

type Writable = "nonpayable" | "payable";

/** Type-checked builder for a call in a batch. */
export function contractCall<
  const abi extends Abi | readonly unknown[],
  fn extends ContractFunctionName<abi, Writable>,
>(p: { address: `0x${string}`; abi: abi; functionName: fn; args: ContractFunctionArgs<abi, Writable, fn> }): ContractCall {
  return p as ContractCall;
}

export interface CallMeta {
  /** USDC amount this call moves, when the args don't show it (e.g. payForCycle). */
  amount?: bigint;
}

type Phase = "idle" | "preparing" | "confirming" | "signing" | "mining" | "done" | "error";

/**
 * One user action (a single call or an atomic batch) from intent to mined receipt:
 * allowlist check → simulation (single calls) → plain-language confirmation (smart accounts) →
 * send (one sponsored user operation, or sequential txs for an own wallet) → receipt → refresh reads.
 */
export function useContractAction() {
  const account = useChainPotAccount();
  const confirm = useConfirm();
  const config = useConfig();
  const queryClient = useQueryClient();
  const [phase, setPhase] = useState<Phase>("idle");
  const [hash, setHash] = useState<Hex>();
  const [receipt, setReceipt] = useState<TransactionReceipt>();
  const [error, setError] = useState<unknown>(null);

  const run = useCallback(
    async (calls: ContractCall[], meta: (CallMeta | undefined)[] = []) => {
      setError(null);
      setHash(undefined);
      setReceipt(undefined);
      if (!account.isConnected || !account.address) {
        setPhase("idle");
        account.login();
        return;
      }
      try {
        setPhase("preparing");
        const steps = calls.map((c, i) => describeCall(c, meta[i]));
        const blocked = steps.find((s) => s.blocked);
        if (blocked) throw new Error(blocked.blocked);

        // A single call can be simulated as-is; in a batch later calls depend on earlier ones
        // (approve → pay), so the send itself surfaces any revert.
        if (calls.length === 1) {
          const [c] = calls;
          await simulateContract(config, { address: c.address, abi: c.abi as Abi, functionName: c.functionName, args: c.args ?? [], account: account.address });
        }

        if (account.mode === "smart") {
          setPhase("confirming");
          const ok = await confirm({ steps, sponsored: account.sponsored, passkeyProtected: account.passkeyProtected });
          if (!ok) {
            setPhase("idle");
            return;
          }
        }

        setPhase("signing");
        const txHash = await account.sendCalls(calls);
        setHash(txHash);
        setPhase("mining");
        const r = await waitForTransactionReceipt(config, { hash: txHash });
        setReceipt(r);
        if (r.status === "reverted") throw new Error("The transaction was reverted on-chain.");
        setPhase("done");
        void queryClient.invalidateQueries();
      } catch (e) {
        setError(e);
        setPhase("error");
      }
    },
    [account, confirm, config, queryClient],
  );

  const write = useCallback(
    <const abi extends Abi | readonly unknown[], fn extends ContractFunctionName<abi, Writable>>(
      p: { address: `0x${string}`; abi: abi; functionName: fn; args: ContractFunctionArgs<abi, Writable, fn> },
      meta?: CallMeta,
    ) => void run([p as ContractCall], [meta]),
    [run],
  );

  const writeBatch = useCallback((calls: ContractCall[], meta?: (CallMeta | undefined)[]) => void run(calls, meta), [run]);

  const reset = useCallback(() => {
    setPhase("idle");
    setError(null);
    setHash(undefined);
    setReceipt(undefined);
  }, []);

  return {
    write,
    writeBatch,
    hash,
    receipt,
    /** Waiting on the user (review sheet or wallet). */
    isPending: phase === "preparing" || phase === "confirming" || phase === "signing",
    isConfirming: phase === "mining",
    isConfirmed: phase === "done",
    isBusy: phase === "preparing" || phase === "confirming" || phase === "signing" || phase === "mining",
    error,
    errorMessage: friendlyError(error),
    reset,
  };
}
