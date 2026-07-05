'use client';

import { useMemo } from 'react';
import { useGetPot, useGetCycle } from '@/hooks/useRoscaEngine';
import { useUSDCDecimals } from '@/hooks/useUsdc';
import { formatUnits } from 'viem';

interface CycleHistoryProps {
  potId: string;
  engine: "circle" | "auction";
  isDarkMode: boolean;
}

function CycleItem({ engine, potIdBig, cycleNum, isDarkMode, formatUSD, formatDate }: any) {
  const { data, isLoading } = useGetCycle(engine, potIdBig, cycleNum);

  if (isLoading || !data) {
    return (
      <div className={`p-6 rounded-xl border-3 border-black animate-pulse ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
        <div className="h-10 bg-black/10 rounded" />
      </div>
    );
  }

  const d = data as any;
  const startTime = Number(d[0] || 0);
  const endTime = Number(d[1] || 0);
  const winner = d[6];
  const cyclePayout = d[3]; // totalCollected
  
  return (
    <div className={`p-6 rounded-xl border-3 border-black transition-all ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div>
          <p className="text-sm font-medium text-gray-500">Cycle</p>
          <p className="text-2xl font-bold">{cycleNum.toString()}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Winner</p>
          <p className="font-bold">{winner === "0x0000000000000000000000000000000000000000" ? "TBD" : `${String(winner).slice(0, 10)}...`}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">{engine === 'circle' ? 'Cycle Payout' : 'Gross Value'}</p>
          <p className="text-lg font-bold text-green-500">{formatUSD(cyclePayout)}</p>
        </div>
        <div className="md:text-right">
          <p className="text-sm font-medium text-gray-500">{formatDate(startTime)} - {formatDate(endTime)}</p>
        </div>
      </div>
    </div>
  );
}

export function CycleHistory({ potId, engine, isDarkMode }: CycleHistoryProps) {
  const potIdBig = BigInt(potId);
  const { data: potInfo, isLoading: loadingPotInfo } = useGetPot(engine, potIdBig);
  const completedCycles = potInfo ? Number((potInfo as any)[7] || 0) : 0;

  const cycleIndices = useMemo(() => {
    return Array.from({ length: completedCycles }, (_, i) => BigInt(i + 1));
  }, [completedCycles]);

  const { data: usdcDecimals } = useUSDCDecimals();
  const decimals = usdcDecimals ?? 6;

  const formatUSD = (val: bigint) => `$${formatUnits(val, decimals)}`;
  const formatDate = (ts: number) => {
    if (!ts) return '-';
    return new Date(ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loadingPotInfo) {
    return (
      <section>
        <h2 className="text-3xl font-bold mb-6">Cycle History</h2>
        <p className="text-gray-500">Loading cycle history...</p>
      </section>
    );
  }

  if (completedCycles === 0) {
    return (
      <section>
        <h2 className="text-3xl font-bold mb-6">Cycle History</h2>
        <p className="text-gray-500">No cycle history available yet.</p>
      </section>
    );
  }

  return (
    <section>
      <h2 className={`text-3xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-black'}`}>Cycle History</h2>
      <div className="space-y-4">
        {cycleIndices.slice().reverse().map((idx) => (
          <CycleItem
            key={idx.toString()}
            engine={engine}
            potIdBig={potIdBig}
            cycleNum={idx}
            isDarkMode={isDarkMode}
            formatUSD={formatUSD}
            formatDate={formatDate}
          />
        ))}
      </div>
    </section>
  );
}
