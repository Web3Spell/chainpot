'use client';

import React, { useMemo } from 'react';
import { useGetCurrentPotCount, useGetPotInfo, useGetPotMemberCount } from '@/hooks/useAuctionEngine';
import { useUSDCDecimals } from '@/hooks/useUsdc';

interface StatsCardsProps {
  isDarkMode: boolean;
}

/**
 * Defensive helpers
 */
function getField(pot: any, index: number, name?: string) {
  if (!pot) return undefined;
  if (Array.isArray(pot) && pot.length > index) return pot[index];
  if (name && typeof pot === 'object') {
    if (name in pot) return pot[name];
    return pot[index];
  }
  return undefined;
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

/** format smallest unit -> human with decimals */
function formatTokenAmount(amountSmallest: bigint, decimals = 6) {
  try {
    const factor = BigInt(10) ** BigInt(decimals);
    const whole = amountSmallest / factor;
    const frac = amountSmallest % factor;
    if (frac === BigInt(0)) return `${whole.toString()}`;
    // show two decimals
    const scaled = (frac * BigInt(100)) / factor;
    const fracStr = String(scaled).padStart(2, '0').replace(/0+$/, '');
    return `${whole.toString()}${fracStr ? '.' + fracStr : ''}`;
  } catch {
    return String(amountSmallest ?? '0');
  }
}

export function StatsCards({ isDarkMode }: StatsCardsProps) {
  // read pot count
  const { data: potCountRaw, isLoading: isCountLoading } = useGetCurrentPotCount();
  const { data: usdcDecimalsData } = useUSDCDecimals?.();
  const decimals = typeof usdcDecimalsData === 'number' ? usdcDecimalsData : 6;

  const potCount = useMemo(() => {
    if (potCountRaw === undefined || potCountRaw === null) return 0;
    if (typeof potCountRaw === 'bigint') return Number(potCountRaw);
    if (typeof potCountRaw === 'number') return potCountRaw;
    try {
      return Number(potCountRaw);
    } catch {
      return 0;
    }
  }, [potCountRaw]);

  // Limit how many pots we'll check to avoid huge fan-out.
  const MAX_CHECK = 50;
  const checkCount = Math.min(Math.max(potCount, 0), MAX_CHECK);

  // Prepare arrays of hooks (stable count to avoid hook-order problems)
  // We will call useGetPotInfo for i from 1..MAX_CHECK but enable only when i <= potCount
  const potInfos = new Array(MAX_CHECK).fill(null).map((_, idx) => {
    const id = idx + 1;
    return useGetPotInfo(BigInt(id));
  });

  const memberCounts = new Array(MAX_CHECK).fill(null).map((_, idx) => {
    const id = idx + 1;
    return useGetPotMemberCount(BigInt(id));
  });

  // aggregate values
  let totalPools = potCount;
  let activePools = 0;
  let completedPools = 0;
  let totalParticipants = 0;
  let activeContributionsSmallest = BigInt(0); // sum(amountPerCycle * cycleCount)
  let checked = 0;

  for (let i = 0; i < checkCount; i++) {
    const q = potInfos[i];
    const m = memberCounts[i];

    if (!q) continue;
    const pot = q.data;
    if (!pot) continue;
    checked++;

    // extract relevant fields safely
    const amountPerCycleRaw = getField(pot, 2, 'amountPerCycle'); // index 2
    const cycleCountRaw = getField(pot, 4, 'cycleCount'); // index 4
    const completedCyclesRaw = getField(pot, 5, 'completedCycles'); // index 5
    const statusRaw = getField(pot, 8, 'status'); // index 8
    const membersRaw = getField(pot, 9, 'members'); // index 9 - may be array

    const amountPerCycle = toBigIntSafe(amountPerCycleRaw);
    const cycleCount = Number(cycleCountRaw ?? 0);
    const completedCycles = Number(completedCyclesRaw ?? 0);

    // participants pref: memberCount hook, else members array
    const participants = (m && typeof m.data === 'bigint') ? Number(m.data) :
      Array.isArray(membersRaw) ? membersRaw.length : 0;

    totalParticipants += participants;

    // determine status: numeric enum or string
    const status =
      typeof statusRaw === 'number'
        ? statusRaw === 0 ? 'Active' : 'Paused'
        : String(statusRaw ?? 'Active');

    if (status === 'Active') activePools++;
    if (completedCycles >= cycleCount && cycleCount > 0) completedPools++;

    // add to active contributions = amountPerCycle * cycleCount (smallest units)
    try {
      activeContributionsSmallest += amountPerCycle * BigInt(cycleCount);
    } catch {
      // ignore overflow
    }
  }

  const isLoading = isCountLoading || potInfos.slice(0, checkCount).some((q) => q.isLoading) || memberCounts.slice(0, checkCount).some((q) => q.isLoading);

  // Format displays
  const totalPoolsDisplay = totalPools;
  const activePoolsDisplay = activePools;
  const completedPoolsDisplay = completedPools;
  const participantsDisplay = totalParticipants;
  const activeContribDisplay = formatTokenAmount(BigInt(activeContributionsSmallest), decimals);

  // Minimal chart data derived from first few pots (for bars)
  const barHeights = potInfos.slice(0, Math.min(6, checkCount)).map((q) => {
    if (!q || !q.data) return 10;
    const amt = toBigIntSafe(getField(q.data, 2, 'amountPerCycle'));
    const cnt = Number(getField(q.data, 4, 'cycleCount') ?? 1);
    const total = Number(amt === BigInt(0) ? 0 : Number(amt) * cnt) || 10;
    // normalize to percent-ish (visual only)
    return Math.min(90, Math.max(8, Math.round((total / 1000) % 100)));
  });

  // lightweight line value for top card (use activeContrib scaled)
  const lineValueDisplay = `$${activeContribDisplay}`;

  // Loading skeleton
  if (isLoading) {
    return (
      <section className="py-8 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0,1,2].map((i) => (
            <div key={i} className={`border-3 border-black rounded-3xl p-6 backdrop-blur animate-pulse ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
              <div className="h-6 bg-white/10 rounded mb-4" />
              <div className="h-32 bg-white/10 rounded" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="py-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Pools Card */}
        <div className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>Total Pools</h3>
              <div className="flex gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-purple-500/30 text-white' : 'bg-purple-200 text-black'}`}>Active ({activePoolsDisplay})</span>
                <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-gray-500/30 text-white' : 'bg-gray-200 text-black'}`}>Completed ({completedPoolsDisplay})</span>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="45" fill="none" stroke={isDarkMode ? '#ffffff15' : '#f3e8ff'} strokeWidth="12" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="url(#donutGradient)"
                    strokeWidth="12"
                    strokeDasharray={`${Math.min(100, Math.round((activePoolsDisplay / Math.max(1, totalPoolsDisplay)) * 100))} 100`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="50%" stopColor="#c084fc" />
                      <stop offset="100%" stopColor="#e9d5ff" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{totalPoolsDisplay}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Active Contributions Line Chart Card */}
        <div className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>Active Contributions</h3>
              <div className="flex gap-2">
                {['7 Days', '2 Weeks', '4 Weeks', '3 Months'].map((time) => (
                  <button
                    key={time}
                    className={`text-xs px-3 py-1 rounded-full transition-colors ${isDarkMode ? 'bg-white/10 border text-white hover:bg-white/20' : 'bg-white border border-black/20 text-black hover:bg-black/5'}`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{lineValueDisplay}</p>

              <svg viewBox="0 0 300 100" className="w-full h-16">
                <polyline
                  points="0,80 30,70 60,60 90,50 120,45 150,40 180,35 210,30 240,28 270,25 300,20"
                  fill="none"
                  stroke="url(#lineChartGradient)"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <polyline
                  points="0,80 30,70 60,60 90,50 120,45 150,40 180,35 210,30 240,28 270,25 300,20"
                  fill="url(#areaGradient)"
                />
                <defs>
                  <linearGradient id="lineChartGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#c084fc" />
                    <stop offset="100%" stopColor="#a78bfa" />
                  </linearGradient>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#c084fc" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#c084fc" stopOpacity="0" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>

        {/* Active Contributions Bar Chart */}
        <div className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>Active Contributions</h3>
              <div className="flex gap-2">
                {['7 Days', '2 Weeks', '4 Weeks', '3 Months'].map((time) => (
                  <button
                    key={time}
                    className={`text-xs px-3 py-1 rounded-full hover:transition-colors ${isDarkMode ? 'bg-white/10 border border-white/20 text-white hover:bg-white/20' : 'bg-white border border-black/20 text-black hover:bg-black/5'}`}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{lineValueDisplay}</p>

              <div className="flex items-end justify-around h-24 gap-1">
                {barHeights.length ? barHeights.map((height, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-t ${isDarkMode ? 'bg-white' : 'bg-black'}`}
                    style={{ height: `${height}%` }}
                  />
                )) : (
                  // fallback mock bars
                  [40, 60, 70, 50, 80, 65].map((height, i) => (
                    <div key={i} className={`flex-1 rounded-t ${isDarkMode ? 'bg-white' : 'bg-black'}`} style={{ height: `${height}%` }} />
                  ))
                )}
              </div>

              <p className={`text-xs text-center ${isDarkMode ? 'text-white/50' : 'text-black/50'}`}>Month1 Month2 Month3 Month4 Month5 Month6</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
