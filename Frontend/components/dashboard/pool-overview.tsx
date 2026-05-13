'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import {
  useGetUserPots,
  useGetPotInfo,
  useGetPotMemberCount,
} from '@/hooks/useAuctionEngine';
import { useUSDCDecimals } from '@/hooks/useUsdc';

interface PoolOverviewProps {
  isDarkMode: boolean;
}

/**
 * Defensive helpers
 */
function safeToNumber(v: any) {
  try {
    if (v === undefined || v === null) return 0;
    if (typeof v === 'number') return v;
    if (typeof v === 'bigint') return Number(v);
    if (typeof v === 'string' && /^\d+$/.test(v)) return Number(v);
    return Number(v) || 0;
  } catch {
    return 0;
  }
}

function toBigIntSafe(v: any) {
  try {
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number') return BigInt(Math.floor(v));
    if (v && typeof v.toString === 'function') {
      const s = v.toString();
      if (/^\d+$/.test(s)) return BigInt(s);
    }
  } catch {}
  return BigInt(0);
}

function formatTokenSmallest(amountSmallest: bigint, decimals = 6) {
  try {
    const factor = BigInt(10) ** BigInt(decimals);
    const whole = amountSmallest / factor;
    const frac = amountSmallest % factor;
    if (frac === BigInt(0)) return `$${whole.toString()}`;
    const scaled = (frac * BigInt(100)) / factor; // two decimals
    const fracStr = String(scaled).padStart(2, '0').replace(/0+$/, '');
    return `$${whole.toString()}${fracStr ? '.' + fracStr : ''}`;
  } catch {
    return '$0';
  }
}

export function PoolOverview({ isDarkMode }: PoolOverviewProps) {
  const { address } = useAccount();

  // Hook to get user's pot IDs (array of uint256)
  const { data: userPotsRaw, isLoading: isUserPotsLoading } = useGetUserPots(
    (address as `0x${string}`) ?? ('0x0000000000000000000000000000000000000000' as `0x${string}`),
  );

  // Normalize user pots to bigint array and limit to MAX_POTS for safety
  const MAX_POTS = 20;
  const userPotIds: bigint[] = useMemo(() => {
    if (!userPotsRaw || !Array.isArray(userPotsRaw)) return [];
    // userPotsRaw may contain bigints or string numbers
    const arr = userPotsRaw
      .map((x: any) => {
        try {
          return typeof x === 'bigint' ? x : BigInt(x);
        } catch {
          return BigInt(0);
        }
      })
      .filter((b: bigint) => b > BigInt(0));
    return arr.slice(0, MAX_POTS);
  }, [userPotsRaw]);

  // Use a stable number of potInfo hooks (MAX_POTS) and enable only for existing ids
  const potInfoQueries = new Array(MAX_POTS).fill(null).map((_, idx) => {
    const id = userPotIds[idx] ?? BigInt(0);
    return useGetPotInfo(id);
  });

  const memberCountQueries = new Array(MAX_POTS).fill(null).map((_, idx) => {
    const id = userPotIds[idx] ?? BigInt(0);
    return useGetPotMemberCount(id);
  });

  // USDC decimals (fallback to 6)
  const { data: usdcDecimalsData } = useUSDCDecimals?.();
  const decimals = typeof usdcDecimalsData === 'number' ? usdcDecimalsData : 6;

  // Determine loading state
  const isLoading =
    isUserPotsLoading ||
    potInfoQueries.slice(0, userPotIds.length).some((q) => q.isLoading) ||
    memberCountQueries.slice(0, userPotIds.length).some((q) => q.isLoading);

  // Build pool summary objects for UI
  const pools = userPotIds.map((potId, idx) => {
    const potQ = potInfoQueries[idx];
    const mQ = memberCountQueries[idx];

    const potData: any = potQ?.data;
    // pot tuple fields (defensive): [name, creator, amountPerCycle, cycleDuration, cycleCount, completedCycles, frequency, bidDepositDeadline, status, members, cycleIds]
    const name = (potData && (potData[0] || potData.name)) ?? `Pot #${String(potId)}`;
    const description = (potData && (potData[0] ? potData[0].toString?.() : undefined)) ?? '—';
    const amountPerCycleBI = toBigIntSafe(potData ? potData[2] : BigInt(0));
    const cycleCount = safeToNumber(potData ? potData[4] : 0);
    const completedCycles = safeToNumber(potData ? potData[5] : 0);
    const participants =
      (mQ && typeof mQ.data === 'bigint') ? Number(mQ.data) :
      Array.isArray(potData?.[9]) ? potData[9].length :
      0;

    const totalAmountSmallest = amountPerCycleBI * BigInt(Math.max(1, cycleCount));
    const totalAmountDisplay = formatTokenSmallest(totalAmountSmallest, decimals);
    const yieldRate = potData && potData[2] && potData[4] ? `${Math.max(0, Math.round((Number(potData[2]) * cycleCount) / 100) )}%` : '—';
    const statusEnum = potData ? potData[8] : 0;
    const status = typeof statusEnum === 'number' ? (statusEnum === 0 ? 'Active' : 'Paused') : String(statusEnum ?? 'Active');

    return {
      id: String(potId),
      name: String(name),
      description: String(description).slice(0, 80),
      status,
      totalAmount: totalAmountDisplay,
      participants,
      yieldRate,
      completedCycles,
      cycleCount,
    };
  });

  // UI: if loading show skeletons
  if (isLoading) {
    return (
      <section className="py-12 space-y-6">
        <div className="space-y-2">
          <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Pool Overview</h2>
          <p className={isDarkMode ? 'text-white/60' : 'text-black/60'}>Your Pools</p>
          <p className={`text-sm ${isDarkMode ? 'text-white/50' : 'text-black/50'}`}>Scroll to see all your active pools</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors space-y-4 animate-pulse ${
              isDarkMode ? ' text-white bg-white/5' : 'bg-white border-black text-black hover:bg-black/5'
            }`}>
              <div className="h-6 bg-white/10 rounded w-40" />
              <div className="h-3 bg-white/10 rounded w-32" />
              <div className="h-20 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // If user has no pots
  if (!pools.length) {
    return (
      <section className="py-12 space-y-6">
        <div className="space-y-2">
          <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Pool Overview</h2>
          <p className={isDarkMode ? 'text-white/60' : 'text-black/60'}>Your Pools</p>
          <p className={`text-sm ${isDarkMode ? 'text-white/50' : 'text-black/50'}`}>Scroll to see all your active pools</p>
        </div>

        <div className={`border-3 border-black rounded-3xl p-8 ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
          <p className={isDarkMode ? 'text-white/70' : 'text-black/70'}>You have not joined any pools yet.</p>
          <div className="pt-4">
            <Link href="/pots">
              <button className={`px-6 py-3 rounded-full font-semibold ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
                Browse Pools
              </button>
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Render dynamic pools grid
  return (
    <section className="py-12 space-y-6">
      <div className="space-y-2">
        <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Pool Overview</h2>
        <p className={isDarkMode ? 'text-white/60' : 'text-black/60'}>Your Pools</p>
        <p className={`text-sm ${isDarkMode ? 'text-white/50' : 'text-black/50'}`}>Scroll to see all your active pools</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {pools.map((pool) => (
          <div key={pool.id} className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors space-y-4  ${
            isDarkMode
              ? ' text-white bg-white/5'
              : 'bg-white border-black text-black hover:bg-black/5'
          } `}>
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{pool.name}</h3>
                <p className={`text-xs ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>{pool.description}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                isDarkMode ? 'bg-emerald-500/30 text-emerald-300' : 'bg-green-200 text-black'
              }`}>
                {pool.status}
              </span>
            </div>

            <div className={`space-y-2 text-sm`}>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-white/70' : 'text-black/70'}>Total Amount</span>
                <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>{pool.totalAmount}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-white/70' : 'text-black/70'}>Participants</span>
                <span className={`font-semibold ${isDarkMode ? 'text-white' : 'text-black'}`}>{pool.participants}</span>
              </div>
              <div className="flex justify-between">
                <span className={isDarkMode ? 'text-white/70' : 'text-black/70'}>Yield Rate</span>
                <span className={`font-semibold ${isDarkMode ? 'text-emerald-400' : 'text-green-600'}`}>{((Number(pool.yieldRate) / 10000))}%</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Link href={`/pots/${pool.id}`} className="flex-1">
                <button className={`w-full px-4 py-3 rounded-full text-sm font-semibold transition-colors ${
                  isDarkMode
                    ? 'bg-white text-black hover:bg-white/90'
                    : 'bg-black text-white hover:bg-black/90'
                }`}>
                  View Details
                </button>
              </Link>
              <button className={`w-full px-4 py-3 rounded-full text-sm font-semibold transition-colors ${
                isDarkMode
                  ? 'bg-white text-black hover:bg-white/90'
                  : 'bg-black text-white hover:bg-black/90'
              }`}>
                Manage
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
