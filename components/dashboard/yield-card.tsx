'use client';

import React, { useMemo } from 'react';
import { useGetCurrentPotCount, useGetPotInfo, useGetCycleInfo } from '@/hooks/useAuctionEngine';
import { useUSDCDecimals } from '@/hooks/useUsdc';

interface YieldCardProps {
  isDarkMode: boolean;
}

const MAX_POTS = 20; // safe limit to avoid massive RPC fan-out
const MAX_CYCLES_PER_POT = 3; // fetch recent 3 cycles per pot (adjust if needed)
const PREVIOUS_PERIOD_DAYS = 30; // window length used for "previous month" metric

/* ----- Helpers ----- */
function getField(obj: any, idx: number, name?: string) {
  if (!obj) return undefined;
  if (Array.isArray(obj) && obj.length > idx) return obj[idx];
  if (name && typeof obj === 'object' && name in obj) return obj[name];
  return undefined;
}

function toBigIntSafe(v: any): bigint {
  try {
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number') return BigInt(Math.floor(v));
    if (v && typeof v.toString === 'function') {
      const s = v.toString();
      if (/^-?\d+$/.test(s)) return BigInt(s);
    }
  } catch {}
  return BigInt(0);
}

function formatToken(amountSmallest: bigint, decimals = 6, showDollar = true) {
  try {
    const factor = BigInt(10) ** BigInt(decimals);
    const whole = amountSmallest / factor;
    const frac = amountSmallest % factor;
    if (frac === BigInt(0)) return `${showDollar ? '$' : ''}${whole.toString()}`;
    // Show 2 decimal places
    const scaled = (frac * BigInt(100)) / factor;
    const fracStr = String(scaled).padStart(2, '0').replace(/0+$/, '');
    return `${showDollar ? '$' : ''}${whole.toString()}${fracStr ? '.' + fracStr : ''}`;
  } catch {
    return `${showDollar ? '$' : ''}0`;
  }
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

/* ----- Component ----- */
export function YieldCard({ isDarkMode }: YieldCardProps) {
  // total pot count (to determine how many pots to query)
  const { data: potCountRaw, isLoading: isCountLoading } = useGetCurrentPotCount();
  const potsToCheck = useMemo(() => {
    const n = potCountRaw === undefined || potCountRaw === null ? 0 : (typeof potCountRaw === 'bigint' ? Number(potCountRaw) : Number(potCountRaw));
    return Math.min(Math.max(n, 0), MAX_POTS);
  }, [potCountRaw]);

  // USDC decimals (fallback to 6)
  const { data: usdcDecimalsData } = useUSDCDecimals?.();
  const decimals = typeof usdcDecimalsData === 'number' ? usdcDecimalsData : 6;

  // Stable array of potInfo hooks (length = MAX_POTS)
  const potInfoQueries = new Array(MAX_POTS).fill(null).map((_, idx) => {
    const id = BigInt(idx + 1);
    return useGetPotInfo(id);
  });

  // Gather cycleIds into a fixed-size matrix (MAX_POTS x MAX_CYCLES_PER_POT)
  // and then flatten into a stable list of cycle queries (so hook order is stable)
  const cycleIdMatrix = useMemo(() => {
    const matrix: (bigint | 0n)[][] = [];
    for (let i = 0; i < MAX_POTS; i++) {
      const q = potInfoQueries[i];
      const pot = q?.data;
      let ids: bigint[] = [];

      // defensive extraction: cycleIds commonly at index 10
      const rawCycleIds = getField(pot, 10, 'cycleIds');
      if (Array.isArray(rawCycleIds) && rawCycleIds.length > 0) {
        ids = rawCycleIds.map((c: any) => {
          try { return typeof c === 'bigint' ? c : BigInt(c); } catch { return BigInt(0); }
        }).reverse(); // reverse so latest cycles come first
      }

      // take up to MAX_CYCLES_PER_POT recent cycles
      const row: (bigint | 0n)[] = [];
      for (let j = 0; j < MAX_CYCLES_PER_POT; j++) {
        row.push(ids[j] ?? BigInt(0));
      }
      matrix.push(row);
    }
    return matrix;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [potInfoQueries.map((q) => q?.data)]); // depend on pot data presence

  // Flattened stable list of cycleIds for hooks
  const flatCycleIds = useMemo(() => cycleIdMatrix.flat(), [cycleIdMatrix]);

  // Call useGetCycleInfo for each potential cycle id (stable number of hooks)
  const cycleInfoQueries = flatCycleIds.map((cid) => {
    // pass 0n for disabled/no-cycle
    return useGetCycleInfo(cid ?? BigInt(0));
  });

  // Determine loading state
  const isLoading = isCountLoading ||
    potInfoQueries.slice(0, potsToCheck).some((q) => q.isLoading) ||
    cycleInfoQueries.some((q) => q.isLoading);

  if (isLoading) {
    // skeleton UI
    return (
      <section className="py-8">
        <div className={`border-3 border-black rounded-3xl p-8 backdrop-blur transition-colors space-y-6 ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
          <div className="h-6 bg-white/10 rounded w-40 animate-pulse" />
          <div className="h-10 bg-white/10 rounded animate-pulse" />
          <div className="h-6 bg-white/10 rounded w-28 animate-pulse" />
        </div>
      </section>
    );
  }

  // Aggregate interest numbers
  let totalInterestSmallest = BigInt(0);
  let previousPeriodInterestSmallest = BigInt(0);
  const periodStartSec = nowSec() - PREVIOUS_PERIOD_DAYS * 24 * 60 * 60;

  // Walk through each pot and their fetched cycles (flatCycleIds aligns with cycleInfoQueries)
  for (let p = 0; p < MAX_POTS; p++) {
    const potQ = potInfoQueries[p];
    if (!potQ || !potQ.data) continue;
    const pot = potQ.data;

    // fetch amountPerCycle for pot (index 2)
    const amountPerCycleRaw = getField(pot, 2, 'amountPerCycle');
    const amountPerCycleBI = toBigIntSafe(amountPerCycleRaw);

    // For each cycle slot for this pot
    for (let c = 0; c < MAX_CYCLES_PER_POT; c++) {
      const flatIndex = p * MAX_CYCLES_PER_POT + c;
      const cycleQ = cycleInfoQueries[flatIndex];
      if (!cycleQ || !cycleQ.data) continue;
      const cycle = cycleQ.data;

      // ABI for getCycleInfo (tuple): [potId, startTime, endTime, winner, winningBid, status, bidderCount, totalCollected]
      const bidderCountRaw = getField(cycle, 6, 'bidderCount');
      const totalCollectedRaw = getField(cycle, 7, 'totalCollected');
      const endTimeRaw = getField(cycle, 2, 'endTime');

      const bidderCountBI = toBigIntSafe(bidderCountRaw);
      const totalCollectedBI = toBigIntSafe(totalCollectedRaw);
      const endTimeNum = Number(endTimeRaw ?? 0);

      // principalCollected = amountPerCycle * bidderCount
      const principalCollected = amountPerCycleBI * bidderCountBI;

      // interest = totalCollected - principalCollected
      let interest =BigInt(0);
      try {
        interest = totalCollectedBI > principalCollected ? (totalCollectedBI - principalCollected) : BigInt(0);
      } catch {
        interest = BigInt(0);
      }

      totalInterestSmallest += interest;

      // if cycle ended within previous period window, include in previousPeriodInterest
      if (endTimeNum && endTimeNum >= periodStartSec && endTimeNum <= nowSec()) {
        previousPeriodInterestSmallest += interest;
      }
    }
  }

  const totalInterestDisplay = formatToken(totalInterestSmallest, decimals, true);
  const prevInterestDisplay = formatToken(previousPeriodInterestSmallest, decimals, true);

  // render
  return (
    <section className="py-8">
      <div className={`border-3 border-black rounded-3xl p-8 backdrop-blur transition-colors space-y-6 ${isDarkMode ? 'bg-white/5' : 'bg-white/90'} `}>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>Yield Earned</h3>
            <p className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{totalInterestDisplay}</p>
            <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>Across recent cycles (estimated)</p>
          </div>

          <div className="flex gap-2">
            {['7 Days', '2 Weeks', '4 Weeks', '3 Months'].map((time) => (
              <button
                key={time}
                // no-op filter buttons for now (UI only). You can wire them to change MAX_CYCLES_PER_POT or the PREVIOUS_PERIOD_DAYS.
                className={`text-xs px-3 py-1 rounded-full transition-colors ${isDarkMode ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' : 'bg-white border border-black/20 text-black hover:bg-black/5'}`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* small area chart (static svg kept visually similar) */}
        <div className="space-y-3">
          <svg viewBox="0 0 400 120" className="w-full h-20" filter="drop-shadow(0 4px 8px rgba(0,0,0,0.08))">
            <defs>
              <linearGradient id="yieldAreaGradient2" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="yieldLineGradient2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#c084fc" />
              </linearGradient>
            </defs>
            <polygon
              points="0,90 40,75 80,65 120,55 160,45 200,40 240,38 280,35 320,32 360,30 400,28 400,120 0,120"
              fill="url(#yieldAreaGradient2)"
            />
            <polyline
              points="0,90 40,75 80,65 120,55 160,45 200,40 240,38 280,35 320,32 360,30 400,28"
              fill="none"
              stroke="url(#yieldLineGradient2)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className={`flex justify-between text-xs ${isDarkMode ? 'text-white/50' : 'text-black/50'}`}>
            <span>May</span>
            <span>Jun</span>
          </div>
        </div>

        {/* Footer stats */}
        <div className={`flex justify-between items-center pt-4 border-t ${isDarkMode ? 'border-white/10' : 'border-black/10'}`}>
          <div className="space-y-1">
            <p className={`text-xs ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>Previous {PREVIOUS_PERIOD_DAYS} days</p>
            <p className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{prevInterestDisplay}</p>
            <p className={`text-xs ${isDarkMode ? 'text-emerald-400' : 'text-green-600'}`}>Estimated from recent cycles</p>
          </div>
        </div>
      </div>
    </section>
  );
}
