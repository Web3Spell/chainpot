'use client';

import { useMemo } from 'react';
import { useGetPotInfo, useGetCycleInfo } from '@/hooks/useAuctionEngine';

interface CycleHistoryProps {
  potId: string;
  isDarkMode: boolean;
}

export function CycleHistory({ potId, isDarkMode }: CycleHistoryProps) {
  /** Convert potId -> bigint */
  const potIdBig = useMemo(() => {
    try {
      return BigInt(potId);
    } catch {
      return BigInt(0);
    }
  }, [potId]);

  /** ------------------------------
   * 1. Fetch Pot Info (cycle IDs)
   * ------------------------------ */
  const { data: potInfo, isLoading: loadingPotInfo } = useGetPotInfo(potIdBig);

  const cycleIds = useMemo(() => {
    if (!potInfo) return [];
    return potInfo[10] as bigint[]; // ✔️ cycleIds array index
  }, [potInfo]);

  /** ------------------------------
   * 2. Fetch all cycles
   * ------------------------------ */
  const cycleQueries = cycleIds.map((cycleId) =>
    useGetCycleInfo(cycleId)
  );

  const cycles = cycleQueries
    .map((q, idx) => {
      if (!q.data) return null;

      const data = q.data;
      const cycleId = cycleIds[idx];

      return {
        number: Number(cycleId),
        winner: data[3],
        winningBid: data[4],
        startTime: Number(data[1]),
        endTime: Number(data[2]),
        participants: Number(data[6]),
      };
    })
    .filter(Boolean);

  /** ------------------------------
   * Helper to format USDC values
   * ------------------------------ */
  const formatUSD = (n: bigint) => {
    const whole = n / BigInt(1000000);
    const frac = (n % BigInt(1000000)).toString().padStart(6, '0').slice(0, 2);
    return `$${whole}.${frac}`;
  };

  const formatDate = (ts: number) => {
    if (!ts) return '-';
    const d = new Date(ts * 1000);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  /** ------------------------------
   * Loading State
   * ------------------------------ */
  if (loadingPotInfo || cycleQueries.some((q) => q.isLoading)) {
    return (
      <section>
        <h2 className={`text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
          Cycle History
        </h2>

        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
          Loading cycle history...
        </p>
      </section>
    );
  }

  if (!cycles.length) {
    return (
      <section>
        <h2 className={`text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
          Cycle History
        </h2>
        <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
          No cycle history available yet.
        </p>
      </section>
    );
  }

  /** ------------------------------
   * Render UI
   * ------------------------------ */
  return (
    <section>
      <h2 className={`text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>
        Cycle History
      </h2>

      <div className="space-y-4">
        {cycles
          .sort((a, b) => b!.number - a!.number) // newest first
          .map((cycle) => (
            <div
              key={cycle!.number}
              className={`p-6 rounded-xl border-3 border-black transition-all ${
                isDarkMode ? 'bg-white/5' : 'bg-white/90'
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                {/* Cycle Number */}
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Cycle
                  </p>
                  <p className="text-2xl font-bold">{cycle!.number}</p>
                </div>

                {/* Winner */}
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Winner
                  </p>
                  <p className="font-bold">{cycle!.winner}</p>
                </div>

                {/* Winning Amount */}
                <div>
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Winning Amount
                  </p>
                  <p className="text-lg font-bold text-green-500">
                    {formatUSD(cycle!.winningBid)}
                  </p>
                </div>

                {/* Date */}
                <div className="md:text-right">
                  <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {formatDate(cycle!.startTime)} - {formatDate(cycle!.endTime)}
                  </p>
                  <p className="font-bold">{cycle!.participants} participants</p>
                </div>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}
