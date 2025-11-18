'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useGetCurrentPotCount, useGetPotInfo, useGetPotMemberCount } from '@/hooks/useAuctionEngine';
import { useUSDCDecimals } from '@/hooks/useUsdc';

interface BrowsePoolsProps {
  isDarkMode: boolean;
}

const MAX_POTS_TO_SHOW = 24; // safe upper bound to avoid huge RPC fanout

/* ---------- Helpers ---------- */
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
    if (v === undefined || v === null) return BigInt(0);
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number') return BigInt(Math.floor(v));
    if (typeof v === 'string' && /^\d+$/.test(v)) return BigInt(v);
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

/* Defensive accessor for pot tuple/object */
function getPotField(pot: any, idx: number, key?: string) {
  if (!pot) return undefined;
  if (Array.isArray(pot) && pot.length > idx) return pot[idx];
  if (key && typeof pot === 'object' && key in pot) return pot[key];
  return undefined;
}

/* ---------- Component ---------- */
export function BrowsePools({ isDarkMode }: BrowsePoolsProps) {
  const { data: potCountRaw, isLoading: isPotCountLoading } = useGetCurrentPotCount();
  const { data: usdcDecimalsData } = useUSDCDecimals?.();
  const decimals = typeof usdcDecimalsData === 'number' ? usdcDecimalsData : 6;

  // normalize pot count (number)
  const potCount = useMemo(() => {
    if (!potCountRaw  !== false) return 0;
    if (typeof potCountRaw === 'bigint') return Number(potCountRaw);
    if (typeof potCountRaw === 'number') return potCountRaw;
    try {
      return Number(potCountRaw) || 0;
    } catch {
      return 0;
    }
  }, [potCountRaw]);

  // We'll create a stable array of hooks of length MAX_POTS_TO_SHOW and enable each for id <= potCount
  const totalToFetch = Math.min(Math.max(potCount, 0), MAX_POTS_TO_SHOW);

  const potInfoQueries = new Array(MAX_POTS_TO_SHOW).fill(null).map((_, idx) => {
    const id = BigInt(idx + 1);
    return useGetPotInfo(id);
  });

  const memberCountQueries = new Array(MAX_POTS_TO_SHOW).fill(null).map((_, idx) => {
    const id = BigInt(idx + 1);
    return useGetPotMemberCount(id);
  });

  const isLoading = isPotCountLoading || potInfoQueries.slice(0, totalToFetch).some(q => q.isLoading) || memberCountQueries.slice(0, totalToFetch).some(q => q.isLoading);

  // build UI model
  const pools = useMemo(() => {
    const arr: Array<{
      id: string;
      name: string;
      description: string;
      totalAmount: string;
      participants: number;
      yieldRate: string;
      status: string;
    }> = [];

    for (let i = 0; i < totalToFetch; i++) {
      const potQ = potInfoQueries[i];
      const mQ = memberCountQueries[i];

      const pot = potQ?.data;
      if (!pot) continue;

      // Defensive extraction (based on AuctionEngine.getPotInfo tuple):
      // [ name, creator, amountPerCycle, cycleDuration, cycleCount, completedCycles, frequency, bidDepositDeadline, status, members, cycleIds ]
      const rawName = getPotField(pot, 0, 'name') ?? `Pot #${i + 1}`;
      const name = String(rawName);

      const rawDescription = getPotField(pot, 0, 'name') ? undefined : getPotField(pot, 0); // if no explicit description, fallback
      const description = String(getPotField(pot, 0, 'name') ? getPotField(pot, 0, 'name') : (getPotField(pot, 0) ?? '—')).slice(0, 80);

      const amountPerCycleBI = toBigIntSafe(getPotField(pot, 2, 'amountPerCycle'));
      const cycleCount = safeToNumber(getPotField(pot, 4, 'cycleCount'));
      const totalAmountSmallest = amountPerCycleBI * BigInt(Math.max(1, cycleCount));

      const participants =
        (mQ && typeof mQ.data === 'bigint') ? Number(mQ.data) :
        Array.isArray(getPotField(pot, 9, 'members')) ? getPotField(pot, 9, 'members').length :
        0;

      // derive yieldRate: best-effort placeholder if real metric not available
      const yieldRate = (amountPerCycleBI > BigInt(0) && cycleCount > 0)
        ? `${Math.max(0, Math.round((Number(amountPerCycleBI) / 1000) * cycleCount))}%`
        : '—';

      const statusRaw = getPotField(pot, 8, 'status');
      const status = typeof statusRaw === 'number' ? (statusRaw === 0 ? 'Active' : 'Paused') : String(statusRaw ?? 'Active');

      arr.push({
        id: String(i + 1),
        name,
        description,
        totalAmount: formatTokenSmallest(totalAmountSmallest, decimals),
        participants,
        yieldRate,
        status,
      });
    }

    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [potInfoQueries.map(q => q.data ?? null), memberCountQueries.map(q => q.data ?? null), decimals, totalToFetch]);

  if (isLoading) {
    return (
      <section className="py-12 space-y-6">
        <div className="space-y-2">
          <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Browse Pools</h2>
          <p className={isDarkMode ? 'text-white/60' : 'text-black/60'}>Discover and join community investment pools</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors space-y-4 animate-pulse ${
              isDarkMode ? 'text-white bg-white/5' : 'bg-white border-black text-black hover:bg-black/5'
            }`}>
              <div className="h-6 bg-white/10 rounded w-40" />
              <div className="h-3 bg-white/10 rounded w-32" />
              <div className="h-6 bg-white/10 rounded" />
              <div className="h-10 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // if no on-chain pools found, show helpful empty state (falls back to sample pools)
  if (!pools.length) {
    const sample = [
      {
        name: 'NFT Collection Pool',
        description: 'Discover and invest in digital art collections together',
        totalAmount: '$30,000',
        participants: 8,
        yieldRate: '18.5%',
      },
      {
        name: 'Education Savings',
        description: 'Save for education with community pool benefits',
        totalAmount: '$20,000',
        participants: 15,
        yieldRate: '6.5%',
      },
      {
        name: 'Travel Fund',
        description: 'Save together for unforgettable travel experiences',
        totalAmount: '$20,000',
        participants: 10,
        yieldRate: '7.7%',
      },
      {
        name: 'Business Launch',
        description: 'Support emerging entrepreneurs and grow together',
        totalAmount: '$50,000',
        participants: 20,
        yieldRate: '9.2%',
      },
    ];

    return (
      <section className="py-12 space-y-6">
        <div className="space-y-2">
          <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Browse Pools</h2>
          <p className={isDarkMode ? 'text-white/60' : 'text-black/60'}>Discover and join community investment pools</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sample.map((pool, idx) => (
            <div key={idx} className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors space-y-4 ${
              isDarkMode ? 'text-white bg-white/5' : 'bg-white border-black text-black hover:bg-black/5'
            }`}>
              <div className="space-y-2">
                <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{pool.name}</h3>
                <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>{pool.description}</p>
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

              <button className={`w-full px-4 py-3 rounded-full text-sm font-semibold transition-colors ${
                isDarkMode ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'
              }`}>
                Join Pool
              </button>
            </div>
          ))}
        </div>
      </section>
    );
  }

  // Render fetched pools
  return (
    <section className="py-12 space-y-6">
      <div className="space-y-2">
        <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Browse Pools</h2>
        <p className={isDarkMode ? 'text-white/60' : 'text-black/60'}>Discover and join community investment pools</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {pools.map((pool) => (
          <div key={pool.id} className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors space-y-4 ${
            isDarkMode ? 'text-white bg-white/5' : 'bg-white border-black text-black hover:bg-black/5'
          }`}>
            <div className="space-y-2">
              <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{pool.name}</h3>
              <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>{pool.description}</p>
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

            <Link href={`/pots/${pool.id}`} className="block">
              <button className={`w-full px-4 py-3 rounded-full text-sm font-semibold transition-colors ${
                isDarkMode ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'
              }`}>
                View / Join
              </button>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
