'use client';

import React, { useMemo } from 'react';
import { useGetPotInfo, useGetPotMemberCount, useUSDCDecimals } from '@/hooks/useAuctionEngine';

interface PotStatsProps {
  potId: string;
  isDarkMode: boolean;
}

/**
 * Defensive helpers (compatible with tuple or named-object returns)
 * pot tuple layout (from ABI getPotInfo):
 * [ name, creator, amountPerCycle, cycleDuration, cycleCount, completedCycles, frequency, bidDepositDeadline, status, members[], cycleIds[] ]
 */
function getField<T = any>(pot: any, index: number, fieldName?: string): T | undefined {
  if (!pot) return undefined;
  if (Array.isArray(pot) && pot.length > index) return pot[index] as T;
  if (fieldName && pot && typeof pot === 'object') {
    if (fieldName in pot) return pot[fieldName] as T;
    return (pot as any)[index] as T;
  }
  return undefined;
}

function bigIntToNumberSafe(value: any, fallback = 0): number {
  try {
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'number') return value;
    if (value && typeof value.toNumber === 'function') return value.toNumber();
    if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  } catch {
    // ignore
  }
  return fallback;
}

/** Format token smallest-units into human string using decimals (e.g., USDC 6) */
function formatTokenAmountFromBigInt(amountSmallest: any, decimals = 6): string {
  try {
    // If BigInt or numeric-like
    let v: bigint;
    if (typeof amountSmallest === 'bigint') {
      v = amountSmallest;
    } else if (typeof amountSmallest === 'number') {
      v = BigInt(Math.floor(amountSmallest));
    } else if (typeof amountSmallest === 'string' && /^\d+$/.test(amountSmallest)) {
      v = BigInt(amountSmallest);
    } else if (amountSmallest && typeof amountSmallest.toString === 'function') {
      // ethers BigNumber-like
      const s = amountSmallest.toString();
      if (/^\d+$/.test(s)) v = BigInt(s);
      else return s;
    } else {
      return '0';
    }

    const factor = BigInt(10) ** BigInt(decimals);
    const whole = v / factor;
    const fraction = v % factor;
    // show up to 6 fractional digits (trim trailing zeros)
    const fracStr = fraction === BigInt(0)? '' : `.${String((fraction * BigInt(1000000)) / factor).padStart(6, '0')}`.replace(/0+$/, '');
    return `${whole.toString()}${fracStr}`;
  } catch {
    return String(amountSmallest ?? '0');
  }
}

export function PotStats({ potId, isDarkMode }: PotStatsProps) {
  const pid = useMemo(() => {
    try {
      return BigInt(potId);
    } catch {
      return BigInt(0);
    }
  }, [potId]);

  // hooks
  const { data: potInfo, isLoading: isPotLoading, isError: isPotError } = useGetPotInfo(pid);
  const { data: membersCount, isLoading: isMembersLoading, isError: isMembersError } = useGetPotMemberCount(pid);
  const { data: usdcDecimals } = useUSDCDecimals?.(); // optional hook; may be undefined
  const decimals = typeof usdcDecimals === 'number' ? usdcDecimals : 6; // fallback to 6 (USDC)

  const loading = isPotLoading || isMembersLoading;

  if (loading) {
    return (
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`p-6 rounded-xl border-3 border-black animate-pulse ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}
            />
          ))}
        </div>
      </section>
    );
  }

  if (isPotError || isMembersError || !potInfo) {
    return (
      <section className="mb-8">
        <div className="p-6 rounded-xl border-3 border-black text-red-400">
          Failed to load pot statistics.
        </div>
      </section>
    );
  }

  // extract fields defensively
  const amountPerCycleRaw = getField<any>(potInfo, 2, 'amountPerCycle');
  const cycleCountRaw = getField<any>(potInfo, 4, 'cycleCount');
  const completedCyclesRaw = getField<any>(potInfo, 5, 'completedCycles');
  const membersRaw = getField<any>(potInfo, 9, 'members');

  const participants = typeof membersCount === 'bigint' || typeof membersCount === 'number'
    ? Number(membersCount)
    : Array.isArray(membersRaw)
    ? membersRaw.length
    : 0;

  // total pool = amountPerCycle * cycleCount
  // amountPerCycleRaw is in smallest units (e.g., USDC with 6 decimals)
  // We calculate in smallest units then format
  let totalPoolSmallest: any = BigInt(0);
  try {
    // ensure bigints
    const amtBI =
      typeof amountPerCycleRaw === 'bigint'
        ? amountPerCycleRaw
        : typeof amountPerCycleRaw === 'number'
        ? BigInt(Math.floor(amountPerCycleRaw))
        : (amountPerCycleRaw && typeof amountPerCycleRaw.toString === 'function' && /^\d+$/.test(amountPerCycleRaw.toString()))
        ? BigInt(amountPerCycleRaw.toString())
        : BigInt(0);

    const cycleCountNum = bigIntToNumberSafe(cycleCountRaw, 0);
    totalPoolSmallest = amtBI * BigInt(cycleCountNum);
  } catch {
    totalPoolSmallest = BigInt(0);
  }

  // totalRaised (best-effort) = amountPerCycle * completedCycles * participants
  let totalRaisedSmallest: any = BigInt(0);
  try {
    const amtBI =
      typeof amountPerCycleRaw === 'bigint'
        ? amountPerCycleRaw
        : typeof amountPerCycleRaw === 'number'
        ? BigInt(Math.floor(amountPerCycleRaw))
        : (amountPerCycleRaw && typeof amountPerCycleRaw.toString === 'function' && /^\d+$/.test(amountPerCycleRaw.toString()))
        ? BigInt(amountPerCycleRaw.toString())
        : BigInt(0);

    const completedCyclesNum = bigIntToNumberSafe(completedCyclesRaw, 0);
    totalRaisedSmallest = amtBI * BigInt(completedCyclesNum) * BigInt(participants);
  } catch {
    totalRaisedSmallest = BigInt(0);
  }

  const totalPoolDisplay = formatTokenAmountFromBigInt(totalPoolSmallest, decimals);
  const participantsDisplay = String(participants);
  const yieldRateDisplay = '—'; // contract doesn't expose yield in ABI; compute off-chain or supply oracle
  const totalRaisedDisplay = formatTokenAmountFromBigInt(totalRaisedSmallest, decimals);

  const stats = [
    { label: 'Total Pool', value: `$${totalPoolDisplay}`, color: 'text-blue-500' },
    { label: 'Participants', value: participantsDisplay, color: 'text-purple-500' },
    { label: 'Yield Rate', value: yieldRateDisplay, color: 'text-green-500' },
    { label: 'Total Raised', value: `$${totalRaisedDisplay}`, color: 'text-orange-500' },
  ];

  return (
    <section className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`p-6 rounded-xl border-3 border-black ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}
          >
            <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {stat.label}
            </p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
