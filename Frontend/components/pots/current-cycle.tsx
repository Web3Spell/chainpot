'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { useWaitForTransactionReceipt } from 'wagmi';
import { useGetPotInfo, useGetCycleInfo, useGetUserBid, useStartCycle } from '@/hooks/useAuctionEngine';
import Link from 'next/link';

interface CurrentCycleProps {
  potId: string;
  isDarkMode: boolean;
  isCreator?: boolean; // optional prop, but we'll compute ourselves if not provided
}

/* Helpers (defensive for tuple or object ABI outputs) */
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

function formatUSDFromSmallest(v: any, decimals = 6) {
  try {
    let bi: bigint;
    if (typeof v === 'bigint') bi = v;
    else if (typeof v === 'number') bi = BigInt(Math.floor(v));
    else if (v && typeof v.toString === 'function') {
      const s = v.toString();
      if (/^\d+$/.test(s)) bi = BigInt(s);
      else return s;
    } else return '0';
    const factor = BigInt(10) ** BigInt(decimals);
    const whole = bi / factor;
    const frac = bi % factor;
    if (frac === BigInt(0)) return `${whole.toString()}`;
    // show up to 2 decimals for display
    const decimalDigits = 2;
    const scaled = (frac * BigInt(10 ** decimalDigits)) / factor;
    const fracStr = String(scaled).padStart(decimalDigits, '0').replace(/0+$/, '');
    return `${whole.toString()}${fracStr ? '.' + fracStr : ''}`;
  } catch {
    return String(v ?? '0');
  }
}

export function CurrentCycle({ potId, isDarkMode, isCreator: isCreatorProp }: CurrentCycleProps) {
  const { address } = useAccount();

  // convert potId safely
  const potIdBig = useMemo(() => {
    try {
      return BigInt(potId);
    } catch {
      return BigInt(0);
    }
  }, [potId]);

  // Fetch pot info
  const { data: potInfo, isLoading: potLoading, isError: potError, refetch: refetchPot } = useGetPotInfo(potIdBig);

  // Derive cycleId to show as current cycle
  const cycleId = useMemo(() => {
    if (!potInfo) return undefined;
    // try tuple/object: cycleIds is index 10 in ABI (0-based index 10)
    const cycleIds = getField(potInfo, 10, 'cycleIds');
    if (Array.isArray(cycleIds) && cycleIds.length > 0) {
      // last element = latest cycle id
      const last = cycleIds[cycleIds.length - 1];
      try {
        return typeof last === 'bigint' ? last : BigInt(last);
      } catch { return undefined; }
    }
    // fallback: completedCycles (index 5) + 1 -> approximate cycle id
    const completed = bigIntToNumberSafe(getField(potInfo, 5, 'completedCycles'), 0);
    // if contract uses sequential cycle ids, we might not be able to compute exact id; return undefined
    return undefined;
  }, [potInfo]);

  // If cycleId is undefined, we'll try to get a 'currentCycle number' display from completedCycles +1
  const displayCycleNumber = useMemo(() => {
    if (!potInfo) return undefined;
    const completed = bigIntToNumberSafe(getField(potInfo, 5, 'completedCycles'), 0);
    const total = bigIntToNumberSafe(getField(potInfo, 4, 'cycleCount'), 0);
    const current = Math.min(completed + 1, Math.max(1, total));
    return { current, total };
  }, [potInfo]);

  // Fetch cycle info if we have a cycleId
  const { data: cycleInfo, isLoading: cycleLoading, isError: cycleError, refetch: refetchCycle } = useGetCycleInfo(cycleId ?? BigInt(0));

  // Fetch user's bid for this cycle
  const { data: userBidRaw, isLoading: userBidLoading } = useGetUserBid(cycleId ?? BigInt(0), address as `0x${string}`);

  // Determine creator
  const creatorAddress = useMemo(() => {
    if (!potInfo) return undefined;
    const c = getField(potInfo, 1, 'creator');
    return String(c ?? '');
  }, [potInfo]);

  const isCreator = useMemo(() => {
    if (typeof isCreatorProp === 'boolean') return isCreatorProp;
    if (!address || !creatorAddress) return false;
    return address.toLowerCase() === creatorAddress.toLowerCase();
  }, [isCreatorProp, address, creatorAddress]);

  /* Start cycle write hook (creator only) */
  const { startCycle, hash: startHash, isPending: isStartSigning, error: startError } = useStartCycle();
  const { data: startReceipt, isLoading: isStartConfirming, isSuccess: isStartConfirmed } = useWaitForTransactionReceipt({ hash: startHash });

  // Local UI state
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  // When start cycle confirmed -> refetch pot & cycle
  useEffect(() => {
    if (!isStartConfirmed) return;
    const status = (startReceipt as any)?.status;
    if (status === 0) {
      setActionErr('Start cycle transaction reverted.');
    } else {
      setActionMsg('✅ Cycle started successfully.');
    }
    refetchPot?.();
    refetchCycle?.();
  }, [isStartConfirmed, startReceipt, refetchPot, refetchCycle]);

  // Handler: Start next cycle
  const handleStartNextCycle = async () => {
    setActionErr(null);
    setActionMsg(null);
    try {
      if (!potIdBig || potIdBig === BigInt(0)) {
        setActionErr('Invalid pot id');
        return;
      }
      await startCycle(potIdBig);
      setActionMsg('Waiting for wallet confirmation...');
    } catch (err: any) {
      setActionErr(err?.message ?? 'Failed to submit transaction');
    }
  };

  // Loading state
  const loading = potLoading || cycleLoading || userBidLoading;

  // Extract cycle display values defensively
  const cycleAmountRaw = getField(cycleInfo, 2, 'winningBid') ?? getField(cycleInfo, 4, 'winningBid') ?? getField(cycleInfo, 0, 'potId') ?? BigInt(0);
  // But ABI for getCycleInfo returns: potId, startTime, endTime, winner, winningBid, status, bidderCount, totalCollected
  const potIdFromCycle = getField(cycleInfo, 0, 'potId');
  const startTimeRaw = getField(cycleInfo, 1, 'startTime');
  const endTimeRaw = getField(cycleInfo, 2, 'endTime');
  const winnerAddr = getField(cycleInfo, 3, 'winner');
  const winningBidRaw = getField(cycleInfo, 4, 'winningBid');
  const bidderCountRaw = getField(cycleInfo, 6, 'bidderCount');
  const totalCollectedRaw = getField(cycleInfo, 7, 'totalCollected');

  // Compute values
  const cycleAmountDisplay = cycleInfo ? `$${formatUSDFromSmallest(winningBidRaw ?? BigInt(0))}` : '$0';
  const activeBids = cycleInfo ? bigIntToNumberSafe(bidderCountRaw, 0) : 0;
  const highestBidDisplay = cycleInfo ? `$${formatUSDFromSmallest(winningBidRaw ?? BigInt(0))}` : '$0';
  const yourBidDisplay = userBidRaw ? `$${formatUSDFromSmallest(userBidRaw ?? BigInt(0))}` : '$0';
  const currentLeader = winnerAddr ? String(winnerAddr) : '—';

  // Time computations
  const nowSec = Math.floor(Date.now() / 1000);
  const startSec = startTimeRaw ? bigIntToNumberSafe(startTimeRaw, 0) : undefined;
  const endSec = endTimeRaw ? bigIntToNumberSafe(endTimeRaw, 0) : undefined;
  const deadlineSec = endSec; // treat endTime as deadline; if bidDepositDeadline separate, use that
  const daysRemaining = deadlineSec ? Math.max(0, Math.ceil((deadlineSec - nowSec) / (60 * 60 * 24))) : undefined;
  const percentElapsed = startSec && endSec ? Math.min(100, Math.max(0, Math.floor(((nowSec - startSec) / (endSec - startSec)) * 100))) : 0;

  // Format date helper
  const fmtDate = (sec?: number) => {
    if (!sec) return '—';
    const d = new Date(sec * 1000);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) {
    return (
      <section className="mb-8">
        <div className={`h-40 rounded-2xl animate-pulse ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`} />
      </section>
    );
  }

  if (!cycleInfo && !displayCycleNumber) {
    return (
      <section className="mb-8">
        <div className={`p-6 rounded-2xl ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
          <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>No active cycle found for this pot.</p>
        </div>
      </section>
    );
  }

  // Fallback cycle label
  const cycleLabel = displayCycleNumber ? `Cycle ${displayCycleNumber.current}` : 'Current Cycle';

  return (
    <section className="mb-8">
      <h2 className={`text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
        {cycleLabel}
      </h2>

      <div className={`p-8 rounded-2xl border-3 border-black ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Cycle Details */}
          <div>
            <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>
              Cycle Details
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Cycle Amount</span>
                <span className="font-bold">{cycleAmountDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Start Date</span>
                <span className="font-bold">{fmtDate(startSec)}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>End Date</span>
                <span className="font-bold">{fmtDate(endSec)}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Bid Deposit Deadline</span>
                <span className="font-bold">{fmtDate(deadlineSec)}</span>
              </div>
            </div>
          </div>

          {/* Bidding Status */}
          <div>
            <h3 className={`text-xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-black'}`}>
              Bidding Status
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Active Bids</span>
                <span className="font-bold">{activeBids} {displayCycleNumber ? `/ ${displayCycleNumber.total}` : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Current Bid Leader</span>
                <span className="font-bold">{currentLeader ? `${String(currentLeader).slice(0, 10)}...` : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Highest Bid</span>
                <span className="font-bold text-green-500">{highestBidDisplay}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>Your Bid</span>
                <span className="font-bold">{yourBidDisplay}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Bidding Period Progress
          </p>
          <div className={`h-3 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/10' : 'bg-black/10'}`}>
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
              style={{ width: `${percentElapsed}%` }}
            />
          </div>
          <p className={`text-xs font-medium mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {daysRemaining !== undefined ? `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining until deadline` : 'Deadline unknown'}
          </p>
        </div>

        {isCreator && (
          <button
            onClick={handleStartNextCycle}
            disabled={isStartSigning || isStartConfirming}
            className={`w-full px-6 py-3 rounded-full font-bold transition-all duration-300 ${
              isDarkMode
                ? 'bg-white text-black hover:bg-white/90 disabled:opacity-50'
                : 'bg-black text-white hover:bg-black/90 disabled:opacity-50'
            }`}
          >
            {isStartSigning || isStartConfirming ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Starting...
              </div>
            ) : (
              'Start Next Cycle'
            )}
          </button>
        )}

        {/* Feedback */}
        <div className="mt-4 space-y-2">
          {actionMsg && <div className="text-sm text-green-400">{actionMsg}</div>}
          {actionErr && <div className="text-sm text-red-400">{actionErr}</div>}
          {startError && <div className="text-sm text-red-400">Start error: {(startError as any)?.message ?? String(startError)}</div>}
          {isStartConfirming && <div className="text-sm text-white/70">Waiting for confirmation...</div>}
        </div>
      </div>
    </section>
  );
}
