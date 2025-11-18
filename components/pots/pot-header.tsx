'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { useWaitForTransactionReceipt } from 'wagmi';

import {
  useGetPotInfo,
  useGetCycleInfo,
  useHasJoinedPot,
  useJoinPot,
  useStartCycle,
  useCloseBidding,
  useDeclareWinner,
  useCompleteCycle,
} from '@/hooks/useAuctionEngine';

interface PotHeaderProps {
  potId: string;
  isDarkMode: boolean;
}

/**
 * Helper to safely get field from tuple/object
 */
function getField(p: any, index: number, name?: string) {
  if (!p) return undefined;
  if (Array.isArray(p) && p.length > index) return p[index];
  if (name && typeof p === 'object') {
    if (name in p) return p[name];
    return p[index];
  }
  return undefined;
}

function bigIntToNumberSafe(v: any, fallback = 0) {
  try {
    if (typeof v === 'bigint') return Number(v);
    if (typeof v === 'number') return v;
    if (v && typeof v.toNumber === 'function') return v.toNumber();
    if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
  } catch {}
  return fallback;
}

/**
 * PotHeader
 * - Displays pot title, description, creator, status and actions
 * - Handles Join Pool and Start Cycle interactions
 * - Creator-only actions: Close Bidding, Declare Winner, Complete Cycle
 */
export function PotHeader({ potId, isDarkMode }: PotHeaderProps) {
  const router = useRouter();
  const { address } = useAccount();

  // Convert potId string -> bigint
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

  // Get current cycle ID from pot info
  const cycleId = useMemo(() => {
    if (!potInfo) return undefined;
    const cycleIds = getField(potInfo, 10, 'cycleIds');
    if (Array.isArray(cycleIds) && cycleIds.length > 0) {
      const last = cycleIds[cycleIds.length - 1];
      try {
        return typeof last === 'bigint' ? last : BigInt(last);
      } catch { 
        return undefined; 
      }
    }
    return undefined;
  }, [potInfo]);

  // Fetch current cycle info
  const { 
    data: cycleInfo, 
    isLoading: isCycleLoading,
    refetch: refetchCycleInfo 
  } = useGetCycleInfo(cycleId ?? BigInt(0));

  // Check if user has joined this pot
  const { data: hasJoined, refetch: refetchHasJoined } = useHasJoinedPot(
    potIdBig, 
    address as `0x${string}`
  );

  // Derive creator & role
  const creatorAddress = useMemo(() => {
    if (!potInfo) return undefined;
    if (Array.isArray(potInfo)) {
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

  // Get cycle status to determine available actions
  // CycleStatus enum: 0=Pending, 1=Active, 2=BiddingClosed, 3=Completed
  const cycleStatus = useMemo(() => {
    if (!cycleInfo || !cycleId || cycleId === BigInt(0)) return null;
    
    // Get status from index 5 (uint8 status)
    const statusRaw = getField(cycleInfo, 5, 'status');
    const startTime = getField(cycleInfo, 1, 'startTime');
    const endTime = getField(cycleInfo, 2, 'endTime');
    const winner = getField(cycleInfo, 3, 'winner');
    const winningBid = getField(cycleInfo, 4, 'winningBid');
    const bidderCount = getField(cycleInfo, 6, 'bidderCount');
    
    // Convert status to number
    let statusNum = 0;
    try {
      if (typeof statusRaw === 'bigint') {
        statusNum = Number(statusRaw);
      } else if (typeof statusRaw === 'number') {
        statusNum = statusRaw;
      } else {
        statusNum = bigIntToNumberSafe(statusRaw, 0);
      }
    } catch {
      statusNum = 0;
    }
    
    const nowSec = Math.floor(Date.now() / 1000);
    const startSec = bigIntToNumberSafe(startTime, 0);
    const endSec = bigIntToNumberSafe(endTime, 0);
    
    // Check if winner exists and is not zero address
    const winnerStr = winner ? String(winner) : '';
    const hasWinner = winnerStr && 
                      winnerStr !== '0x0000000000000000000000000000000000000000' && 
                      winnerStr.toLowerCase() !== '0x0';
    
    return {
      status: statusNum, // 0=Pending, 1=Active, 2=BiddingClosed, 3=Completed
      startTime: startSec,
      endTime: endSec,
      winner: hasWinner ? winnerStr : null,
      winningBid: winningBid || BigInt(0),
      bidderCount: bigIntToNumberSafe(bidderCount, 0),
      isActive: statusNum === 1,
      isBiddingClosed: statusNum === 2,
      isCompleted: statusNum === 3,
      isPending: statusNum === 0,
    };
  }, [cycleInfo, cycleId]);

  // Compute display values from potInfo
  const display = useMemo(() => {
    if (!potInfo) return null;

    const get = (i: number, name?: string) => {
      if (Array.isArray(potInfo)) return (potInfo as any)[i];
      return (potInfo as any)[name ?? i];
    };

    const name = get(0, 'name') ?? `Pot #${potId}`;
    const description = `Pool created by ${String(get(1, 'creator') ?? '').slice(0, 8)}...`;
    const completedCycles = Number(get(5, 'completedCycles') ?? 0);
    const totalCycles = Number(get(4, 'cycleCount') ?? 0);
    const currentCycle = Math.min(completedCycles + 1, Math.max(1, totalCycles));
    const statusVal = get(8, 'status');
    const status = typeof statusVal === 'number' ? (statusVal === 0 ? 'Active' : 'Paused') : String(statusVal ?? 'Active');
    const creator = String(get(1, 'creator') ?? '');
    
    return {
      name,
      description,
      currentCycle,
      totalCycles,
      completedCycles,
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

  const {
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
    isLoading: isStartConfirming,
    isSuccess: isStartConfirmed,
    isError: isStartConfirmError,
  } = useWaitForTransactionReceipt({ hash: startHash });

  // Close bidding (creator-only)
  const {
    closeBidding,
    hash: closeHash,
    isPending: isCloseSigning,
    error: closeError,
  } = useCloseBidding();

  const {
    isLoading: isCloseConfirming,
    isSuccess: isCloseConfirmed,
    isError: isCloseConfirmError,
  } = useWaitForTransactionReceipt({ hash: closeHash });

  // Declare winner (creator-only)
  const {
    declareWinner,
    hash: declareHash,
    isPending: isDeclareSigning,
    error: declareError,
  } = useDeclareWinner();

  const {
    isLoading: isDeclareConfirming,
    isSuccess: isDeclareConfirmed,
    isError: isDeclareConfirmError,
  } = useWaitForTransactionReceipt({ hash: declareHash });

  // Complete cycle (creator-only)
  const {
    completeCycle,
    hash: completeHash,
    isPending: isCompleteSigning,
    error: completeError,
  } = useCompleteCycle();

  const {
    isLoading: isCompleteConfirming,
    isSuccess: isCompleteConfirmed,
    isError: isCompleteConfirmError,
  } = useWaitForTransactionReceipt({ hash: completeHash });

  // UI local states
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Refetch data after transactions confirm
  useEffect(() => {
    if (isJoinConfirmed) {
      setActionMessage('✅ Successfully joined the pot.');
      refetchPotInfo?.();
      refetchHasJoined?.();
    }
  }, [isJoinConfirmed, refetchPotInfo, refetchHasJoined]);

  useEffect(() => {
    if (isStartConfirmed) {
      setActionMessage('✅ Cycle started successfully.');
      setTimeout(() => {
        refetchPotInfo?.();
        refetchCycleInfo?.();
      }, 2000);
    }
  }, [isStartConfirmed, refetchPotInfo, refetchCycleInfo]);

  useEffect(() => {
    if (isCloseConfirmed) {
      setActionMessage('✅ Bidding closed successfully.');
      setTimeout(() => {
        refetchCycleInfo?.();
      }, 2000);
    }
  }, [isCloseConfirmed, refetchCycleInfo]);

  useEffect(() => {
    if (isDeclareConfirmed) {
      setActionMessage('✅ Winner declared successfully.');
      setTimeout(() => {
        refetchCycleInfo?.();
      }, 2000);
    }
  }, [isDeclareConfirmed, refetchCycleInfo]);

  useEffect(() => {
    if (isCompleteConfirmed) {
      setActionMessage('✅ Cycle completed successfully.');
      setTimeout(() => {
        refetchPotInfo?.();
        refetchCycleInfo?.();
      }, 2000);
    }
  }, [isCompleteConfirmed, refetchPotInfo, refetchCycleInfo]);

  // Consolidated loading flags
  const isBusy = 
    isJoinSigning || isJoinConfirming ||
    isStartSigning || isStartConfirming ||
    isCloseSigning || isCloseConfirming ||
    isDeclareSigning || isDeclareConfirming ||
    isCompleteSigning || isCompleteConfirming;

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

  const handleCloseBidding = async () => {
    setActionError(null);
    setActionMessage(null);
    try {
      if (!cycleId || cycleId === BigInt(0)) {
        setActionError('No active cycle found.');
        return;
      }
      await closeBidding(cycleId);
      setActionMessage('Waiting for wallet confirmation...');
    } catch (err: any) {
      console.error('close bidding error', err);
      setActionError(err?.message ?? 'Failed to close bidding.');
    }
  };

  const handleDeclareWinner = async () => {
    setActionError(null);
    setActionMessage(null);
    try {
      if (!cycleId || cycleId === BigInt(0)) {
        setActionError('No active cycle found.');
        return;
      }
      await declareWinner(cycleId);
      setActionMessage('Waiting for wallet confirmation...');
    } catch (err: any) {
      console.error('declare winner error', err);
      setActionError(err?.message ?? 'Failed to declare winner.');
    }
  };

  const handleCompleteCycle = async () => {
    setActionError(null);
    setActionMessage(null);
    try {
      if (!cycleId || cycleId === BigInt(0)) {
        setActionError('No active cycle found.');
        return;
      }
      await completeCycle(cycleId);
      setActionMessage('Waiting for wallet confirmation...');
    } catch (err: any) {
      console.error('complete cycle error', err);
      setActionError(err?.message ?? 'Failed to complete cycle.');
    }
  };

  // Determine which creator actions to show
  const creatorActions = useMemo(() => {
    if (!isCreator || !cycleStatus || !cycleId || cycleId === BigInt(0)) {
      return null;
    }

    const actions = [];

    // Action 1: Close Bidding (when cycle is Active - status 1)
    if (cycleStatus.status === 1) {
      actions.push({
        label: 'Close Bidding',
        handler: handleCloseBidding,
        loading: isCloseSigning || isCloseConfirming,
        variant: 'primary' as const,
      });
    }

    // Action 2: Declare Winner (when bidding is closed - status 2, and no winner yet)
    if (cycleStatus.status === 2 && !cycleStatus.winner) {
      actions.push({
        label: 'Declare Winner',
        handler: handleDeclareWinner,
        loading: isDeclareSigning || isDeclareConfirming,
        variant: 'success' as const,
      });
    }

    // Action 3: Complete Cycle (when winner is declared - status 2 with winner)
    if (cycleStatus.status === 2 && cycleStatus.winner) {
      actions.push({
        label: 'Complete Cycle',
        handler: handleCompleteCycle,
        loading: isCompleteSigning || isCompleteConfirming,
        variant: 'secondary' as const,
      });
    }

    return actions.length > 0 ? actions : null;
  }, [
    isCreator,
    cycleStatus,
    cycleId,
    isCloseSigning,
    isCloseConfirming,
    isDeclareSigning,
    isDeclareConfirming,
    isCompleteSigning,
    isCompleteConfirming,
  ]);

  // Render
  if (isPotLoading || isCycleLoading) {
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

        <div className="flex gap-3 flex-wrap">
          {/* Join button: if already joined, disable */}
          {!isCreator && (
            <button
              onClick={handleJoin}
              disabled={Boolean(hasJoined) || isBusy}
              className={`px-6 py-3 rounded-full font-bold transition-all duration-300 ${
                isDarkMode
                  ? 'bg-white text-black hover:bg-white/90 disabled:opacity-50'
                  : 'bg-black text-white hover:bg-black/90 disabled:opacity-50'
              }`}
            >
              {hasJoined ? 'Joined' : isJoinSigning || isJoinConfirming ? 'Joining...' : 'Join Pool'}
            </button>
          )}

          {/* Creator-only action: Start Cycle */}
          {isCreator && display.completedCycles < display.totalCycles && (
            <button
              onClick={handleStartCycle}
              disabled={isBusy}
              className={`px-6 py-3 rounded-full font-bold border-3 transition-all duration-300 ${
                isDarkMode
                  ? 'border-white/30 text-white hover:bg-white/10 disabled:opacity-50'
                  : 'border-black text-black hover:bg-black/10 disabled:opacity-50'
              }`}
            >
              {isStartSigning || isStartConfirming ? 'Starting...' : 'Start Cycle'}
            </button>
          )}

          {/* Creator cycle management actions */}
          {creatorActions?.map((action, idx) => (
            <button
              key={idx}
              onClick={action.handler}
              disabled={isBusy || action.loading}
              className={`px-6 py-3 rounded-full font-bold transition-all duration-300 ${
                action.variant === 'primary'
                  ? isDarkMode
                    ? 'bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50'
                    : 'bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50'
                  : action.variant === 'success'
                  ? isDarkMode
                    ? 'bg-green-500 text-white hover:bg-green-600 disabled:opacity-50'
                    : 'bg-green-600 text-white hover:bg-green-700 disabled:opacity-50'
                  : isDarkMode
                  ? 'bg-purple-500 text-white hover:bg-purple-600 disabled:opacity-50'
                  : 'bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50'
              }`}
            >
              {action.loading ? 'Processing...' : action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Status Bar */}
      <div className={`p-4 rounded-xl border-2 border-black ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
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
          <div className="flex items-center gap-4">
            {cycleStatus && cycleId && cycleId !== BigInt(0) && (
              <span className={`text-sm px-3 py-1 rounded-full font-semibold ${
                cycleStatus.status === 0 
                  ? 'bg-gray-500/20 text-gray-300'
                  : cycleStatus.status === 1
                  ? 'bg-blue-500/20 text-blue-300'
                  : cycleStatus.status === 2
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-green-500/20 text-green-300'
              }`}>
                {cycleStatus.status === 0 ? '⏳ Pending' : 
                 cycleStatus.status === 1 ? '🔥 Bidding Open' : 
                 cycleStatus.status === 2 ? '🔒 Bidding Closed' : 
                 cycleStatus.status === 3 ? '✅ Completed' : 'Unknown'}
              </span>
            )}
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Created by: {display.creator ? `${display.creator.slice(0, 10)}...` : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* Creator Info Panel */}
      {isCreator && cycleStatus && (
        <div className={`mt-4 p-4 rounded-xl border-2 ${isDarkMode ? 'border-purple-500/30 bg-purple-500/10' : 'border-purple-600/30 bg-purple-600/10'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-bold ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                🔑 Creator Controls
              </p>
              <p className={`text-xs mt-1 ${isDarkMode ? 'text-purple-300/70' : 'text-purple-700/70'}`}>
                {cycleStatus.status === 0 && 'Cycle is pending - waiting to start'}
                {cycleStatus.status === 1 && `Active bidding: ${cycleStatus.bidderCount} bidder(s)`}
                {cycleStatus.status === 2 && cycleStatus.winner && `Winner: ${cycleStatus.winner.slice(0, 10)}...`}
                {cycleStatus.status === 2 && !cycleStatus.winner && 'Ready to declare winner'}
                {cycleStatus.status === 3 && 'Cycle completed'}
              </p>
            </div>
            {cycleStatus.status === 1 && (
              <span className="text-xs bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full">
                Ready to close bidding
              </span>
            )}
            {cycleStatus.status === 2 && !cycleStatus.winner && (
              <span className="text-xs bg-green-500/20 text-green-300 px-3 py-1 rounded-full">
                Ready to declare winner
              </span>
            )}
            {cycleStatus.status === 2 && cycleStatus.winner && (
              <span className="text-xs bg-purple-500/20 text-purple-300 px-3 py-1 rounded-full">
                Ready to complete cycle
              </span>
            )}
          </div>
        </div>
      )}

      {/* Action feedback */}
      <div className="mt-4 space-y-2">
        {actionMessage && (
          <div className="text-sm text-green-400 p-3 rounded-lg bg-green-500/10">
            {actionMessage}
          </div>
        )}
        {actionError && (
          <div className="text-sm text-red-400 p-3 rounded-lg bg-red-500/10">
            {actionError}
          </div>
        )}

        {/* Write / confirm errors from hooks */}
        {joinError && <div className="text-sm text-red-400">Join error: {(joinError as any)?.message ?? String(joinError)}</div>}
        {startError && <div className="text-sm text-red-400">Start cycle error: {(startError as any)?.message ?? String(startError)}</div>}
        {closeError && <div className="text-sm text-red-400">Close bidding error: {(closeError as any)?.message ?? String(closeError)}</div>}
        {declareError && <div className="text-sm text-red-400">Declare winner error: {(declareError as any)?.message ?? String(declareError)}</div>}
        {completeError && <div className="text-sm text-red-400">Complete cycle error: {(completeError as any)?.message ?? String(completeError)}</div>}

        {/* Transaction hashes */}
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
        {closeHash && (
          <div className="text-xs text-white/70">
            Close tx: <a className="underline" target="_blank" rel="noreferrer" href={`https://etherscan.io/tx/${closeHash}`}>{closeHash.slice(0, 12)}...</a>
          </div>
        )}
        {declareHash && (
          <div className="text-xs text-white/70">
            Declare tx: <a className="underline" target="_blank" rel="noreferrer" href={`https://etherscan.io/tx/${declareHash}`}>{declareHash.slice(0, 12)}...</a>
          </div>
        )}
        {completeHash && (
          <div className="text-xs text-white/70">
            Complete tx: <a className="underline" target="_blank" rel="noreferrer" href={`https://etherscan.io/tx/${completeHash}`}>{completeHash.slice(0, 12)}...</a>
          </div>
        )}
      </div>
    </section>
  );
}