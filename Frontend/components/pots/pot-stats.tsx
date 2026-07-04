'use client';

import React from 'react';
import { formatUnits } from 'viem';
import { useGetPot } from '@/hooks/useRoscaEngine';
import { useUSDCDecimals } from '@/hooks/useUsdc';

interface PotStatsProps {
  potId: string;
  engine: "circle" | "auction";
  isDarkMode: boolean;
}

export function PotStats({ potId, engine, isDarkMode }: PotStatsProps) {
  const potIdBig = BigInt(potId);
  
  const { data: potInfo, isLoading: isPotLoading, isError } = useGetPot(engine, potIdBig);
  const { data: usdcDecimals } = useUSDCDecimals();
  const decimals = usdcDecimals ?? 6;

  if (isPotLoading) {
    return (
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`h-24 rounded-xl border-3 border-black animate-pulse ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`} />
          ))}
        </div>
      </section>
    );
  }

  if (isError || !potInfo) {
    return (
      <section className="mb-8">
        <div className="p-6 rounded-xl border-3 border-black text-red-400">Failed to load pot statistics.</div>
      </section>
    );
  }

  const amountPerCycle = BigInt((potInfo as any)[4] || 0);
  const memberCount = Number((potInfo as any)[3] || 0);
  const completedCycles = Number((potInfo as any)[7] || 0);

  const totalPool = amountPerCycle * BigInt(memberCount);
  const totalRaised = amountPerCycle * BigInt(completedCycles) * BigInt(memberCount);

  const formatUSD = (val: bigint) => `$${formatUnits(val, decimals)}`;

  const stats = [
    { label: 'Total Pool Per Cycle', value: formatUSD(totalPool), color: 'text-blue-500' },
    { label: 'Expected Members', value: String(memberCount), color: 'text-purple-500' },
    { label: 'Yield Mechanism', value: engine === 'circle' ? 'None' : 'Discount Bids', color: 'text-green-500' },
    { label: 'Total Value Locked', value: formatUSD(totalRaised), color: 'text-orange-500' },
  ];

  return (
    <section className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`p-6 rounded-xl border-3 border-black ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
            <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
