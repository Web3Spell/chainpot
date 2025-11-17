'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useWaitForTransactionReceipt } from 'wagmi';

import {
  useGetPotInfo,
  useHasJoinedPot,
  useJoinPot,
  useStartCycle,
} from '@/hooks/useAuctionEngine';

interface PotHeaderProps {
  potId: string; // string because it's read from route param
  isDarkMode: boolean;
  // isCreator prop removed — we compute it on-chain based on wallet address & pot creator
}

/**
 * PotHeader
 * - Displays pot title, description, creator, status and actions
 * - Handles Join Pool and Start Cycle on-chain interactions
 */
export function PotHeader({ potId, isDarkMode }: PotHeaderProps) {
  const router = useRouter();
  const { address } = useAccount();

  // convert potId string -> bigint (contract read hooks expect bigint)
  const potIdBig = useMemo(() => {
    try {
      return BigInt(potId);
    } catch {
      return BigInt(0);
    }
  }, [potId]);

  // ====== Read hooks ======
  const {
    data: potInfo,
    isLoading: isPotLoading,
    isError: isPotError,
    refetch: refetchPotInfo,
  } = useGetPotInfo(potIdBig);

  // whether connected user has joined this pot
  const { data: hasJoined, refetch: refetchHasJoined } = useHasJoinedPot(potIdBig, address as `0x${string}`);

  // derive creator & role
  const creatorAddress = useMemo(() => {
    if (!potInfo) return undefined;
    // potInfo may be array/tuple or object; handle both
    if (Array.isArray(potInfo)) {
      // creator is index 1 per ABI
      return potInfo[1] as string;
    }
    return (potInfo as any).creator ?? (potInfo as any).owner;
  }, [potInfo]);

  const isCreator = useMemo(() => {
    if (!address || !creatorAddress) return false;
    try {
      return address.toLowerCase() === String(creatorAddress).toLowerCase();
    } catch {
      return false;
    }
  }, [address, creatorAddress]);

  // compute display values from potInfo
  const display = useMemo(() => {
    if (!potInfo) return null;

    // helper to pull either tuple or object
    const get = (i: number, name?: string) => {
      if (Array.isArray(potInfo)) return (potInfo as any)[i];
      return (potInfo as any)[name ?? i];
    };

    const name = get(0, 'name') ?? `Pot #${potId}`;
    const description = `Pool created by ${String(get(1, 'creator') ?? '').slice(0, 8)}...`;
    const completedCycles = Number(get(5, 'completedCycles') ?? 0);
    const totalCycles = Number(get(4, 'cycleCount') ?? 0);
    const currentCycle = Math.min(completedCycles + 1, Math.max(1, totalCycles)); // human-friendly
    const statusVal = get(8, 'status');
    const status = typeof statusVal === 'number' ? (statusVal === 0 ? 'Active' : 'Paused') : String(statusVal ?? 'Active');
    const creator = String(get(1, 'creator') ?? '');
    return {
      name,
      description,
      currentCycle,
      totalCycles,
      status,
      creator,
    };
  }, [potInfo, potId]);

  // ====== Write hooks for actions ======
  // Join pot
  const {
    joinPot,
    hash: joinHash,
    isPending: isJoinSigning,
    error: joinError,
  } = useJoinPot();

  // Wait for join tx receipt
  const {
    data: joinReceipt,
    isLoading: isJoinConfirming,
    isSuccess: isJoinConfirmed,
    isError: isJoinConfirmError,
  } = useWaitForTransactionReceipt({ hash: joinHash });

  // Start cycle (creator-only)
  const {
    startCycle,
    hash: startHash,
    isPending: isStartSigning,
    error: startError,
  } = useStartCycle();

  const {
    data: startReceipt,
    isLoading: isStartConfirming,
    isSuccess: isStartConfirmed,
    isError: isStartConfirmError,
  } = useWaitForTransactionReceipt({ hash: startHash });

  // UI local states to show transient feedback
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // When join tx gets confirmed -> refetch pot and joined status, show message
  useEffect(() => {
    if (!isJoinConfirmed) return;
    // receipt status check: some wallets return numeric status, others object
    const status = (joinReceipt as any)?.status;
    if (status === 0) {
      setActionError('Join transaction reverted.');
    } else {
      setActionMessage('✅ Successfully joined the pot.');
    }
    // refresh state
    refetchPotInfo?.();
    refetchHasJoined?.();
    // clear signing states handled by hook
  }, [isJoinConfirmed, joinReceipt, refetchPotInfo, refetchHasJoined]);

  // When start cycle tx confirmed -> refetch pot info
  useEffect(() => {
    if (!isStartConfirmed) return;
    const status = (startReceipt as any)?.status;
    if (status === 0) {
      setActionError('Start cycle transaction reverted.');
    } else {
      setActionMessage('✅ Cycle started successfully.');
    }
    refetchPotInfo?.();
  }, [isStartConfirmed, startReceipt, refetchPotInfo]);

  // Consolidated loading flags
  const anySigning = isJoinSigning || isStartSigning;
  const anyConfirming = isJoinConfirming || isStartConfirming;
  const isBusy = anySigning || anyConfirming;

  // Handlers
  const handleJoin = async () => {
    setActionError(null);
    setActionMessage(null);
    try {
      if (!potIdBig || potIdBig === BigInt(0)) {
        setActionError('Invalid pot id.');
        return;
      }
      await joinPot(potIdBig);
      setActionMessage('Waiting for wallet confirmation...');
    } catch (err: any) {
      console.error('join error', err);
      setActionError(err?.message ?? 'Failed to submit join transaction.');
    }
  };

  const handleStartCycle = async () => {
    setActionError(null);
    setActionMessage(null);
    try {
      if (!potIdBig || potIdBig === BigInt(0)) {
        setActionError('Invalid pot id.');
        return;
      }
      await startCycle(potIdBig);
      setActionMessage('Waiting for wallet confirmation...');
    } catch (err: any) {
      console.error('start cycle error', err);
      setActionError(err?.message ?? 'Failed to submit start-cycle transaction.');
    }
  };

  // render
  if (isPotLoading) {
    return (
      <section className="mb-8">
        <div className="h-36 rounded-lg animate-pulse bg-white/6" />
      </section>
    );
  }

  if (isPotError || !display) {
    return (
      <section className="mb-8">
        <div className="p-6 rounded-2xl bg-red-600/10 text-red-300">
          Failed to load pot data.
        </div>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
        <div>
          <Link
            href="/pots"
            className={`text-sm font-bold mb-4 inline-block transition-opacity ${
              isDarkMode ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'
            }`}
          >
            ← Back to Pots
          </Link>
          <h1 className="text-5xl font-black mb-2">{display.name}</h1>
          <p className={`text-lg ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {display.description}
          </p>
        </div>

        <div className="flex gap-3">
          {/* Join button: if already joined, disable */}
          <button
            onClick={handleJoin}
            disabled={Boolean(hasJoined) || isBusy}
            className={`px-6 py-3 rounded-full font-bold transition-all duration-300 ${
              isDarkMode
                ? 'bg-white text-black hover:bg-white/90 disabled:opacity-50'
                : 'bg-black text-white hover:bg-black/90 disabled:opacity-50'
            }`}
          >
            {hasJoined ? 'Joined' : anySigning ? (isJoinSigning ? 'Waiting wallet...' : 'Processing...') : 'Join Pool'}
          </button>

          {/* Creator-only action: Start Cycle */}
          {isCreator && (
            <button
              onClick={handleStartCycle}
              disabled={isBusy}
              className={`px-6 py-3 rounded-full font-bold border-3 transition-all duration-300 ${
                isDarkMode
                  ? 'border-white/30 text-white hover:bg-white/10 disabled:opacity-50'
                  : 'border-black text-black hover:bg-black/10 disabled:opacity-50'
              }`}
            >
              {anySigning ? (isStartSigning ? 'Waiting wallet...' : 'Processing...') : 'Start Cycle'}
            </button>
          )}
        </div>
      </div>

      {/* Status Bar */}
      <div className={`p-4 rounded-xl border-2 border-black ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`w-3 h-3 rounded-full ${
                display.status === 'Active' ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="font-bold">
              {display.status} - Cycle {display.currentCycle} of {display.totalCycles}
            </span>
          </div>
          <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Created by: {display.creator ? `${display.creator.slice(0, 10)}...` : '—'}
          </span>
        </div>
      </div>

      {/* Action feedback */}
      <div className="mt-4 space-y-2">
        {actionMessage && <div className="text-sm text-green-400">{actionMessage}</div>}
        {actionError && <div className="text-sm text-red-400">{actionError}</div>}

        {/* Write / confirm errors from hooks */}
        {joinError && <div className="text-sm text-red-400">Join error: {(joinError as any)?.message ?? String(joinError)}</div>}
        {isJoinConfirmError && <div className="text-sm text-red-400">Join confirmation failed.</div>}

        {startError && <div className="text-sm text-red-400">Start cycle error: {(startError as any)?.message ?? String(startError)}</div>}
        {isStartConfirmError && <div className="text-sm text-red-400">Start confirmation failed.</div>}

        {/* Show tx hashes with links (if available) */}
        {joinHash && (
          <div className="text-xs text-white/70">
            Join tx: <a className="underline" target="_blank" rel="noreferrer" href={`https://etherscan.io/tx/${joinHash}`}>{joinHash.slice(0, 12)}...</a>
          </div>
        )}
        {startHash && (
          <div className="text-xs text-white/70">
            Start tx: <a className="underline" target="_blank" rel="noreferrer" href={`https://etherscan.io/tx/${startHash}`}>{startHash.slice(0, 12)}...</a>
          </div>
        )}
      </div>
    </section>
  );
}
