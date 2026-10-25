'use client';

import React from 'react';
import { usePotCounter } from '@/hooks/useRoscaEngine';
import { PotSummaryCard } from '@/components/pots/pot-summary-card';

interface BrowsePoolsProps {
  isDarkMode: boolean;
}

export function BrowsePools({ isDarkMode }: BrowsePoolsProps) {
  const { data: circleCountRaw } = usePotCounter("circle");
  const { data: auctionCountRaw } = usePotCounter("auction");

  const circleCount = Number(circleCountRaw || 0);
  const auctionCount = Number(auctionCountRaw || 0);

  const circleIds = Array.from({ length: Math.min(4, circleCount) }, (_, i) => BigInt(circleCount - i));
  const auctionIds = Array.from({ length: Math.min(4, auctionCount) }, (_, i) => BigInt(auctionCount - i));

  return (
    <section className="py-12 space-y-6">
      <div className="space-y-2">
        <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>Browse Pools</h2>
        <p className={isDarkMode ? 'text-white/60' : 'text-black/60'}>Most recent pots on ChainPot</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {circleIds.map((id) => <PotSummaryCard key={`circle-${id}`} potId={id} engine="circle" isDarkMode={isDarkMode} />)}
        {auctionIds.map((id) => <PotSummaryCard key={`auction-${id}`} potId={id} engine="auction" isDarkMode={isDarkMode} />)}
      </div>

      {(circleCount === 0 && auctionCount === 0) && (
        <div className={`border-3 border-black rounded-3xl p-8 ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
          <p className={isDarkMode ? 'text-white/70' : 'text-black/70'}>No pots exist on the network yet.</p>
        </div>
      )}
    </section>
  );
}
