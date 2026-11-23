'use client';

import { PotSummaryCard } from './pot-summary-card';
import { Skeleton } from '@/components/ui/card';
import { usePotCounter } from '@/hooks/useRoscaEngine';

interface PotsGridProps {
  isDarkMode: boolean;
}


export function PotsGrid({ isDarkMode }: PotsGridProps) {
  const { data: circleCountRaw, isLoading: circleLoading } = usePotCounter("circle");
  const { data: auctionCountRaw, isLoading: auctionLoading } = usePotCounter("auction");

  const circleCount = Number(circleCountRaw || 0);
  const auctionCount = Number(auctionCountRaw || 0);

  const circleIds = Array.from({ length: circleCount }, (_, i) => circleCount - i);
  const auctionIds = Array.from({ length: auctionCount }, (_, i) => auctionCount - i);

  if (circleLoading || auctionLoading) {
    return (
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </section>
    );
  }

  if (circleCount === 0 && auctionCount === 0) {
    return (
      <section>
        <div className="text-gray-500">No pots yet. Create the first one!</div>
      </section>
    );
  }

  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {circleIds.map((id) => (
          <PotSummaryCard key={`circle-${id}`} potId={id} engine="circle" isDarkMode={isDarkMode} />
        ))}
        {auctionIds.map((id) => (
          <PotSummaryCard key={`auction-${id}`} potId={id} engine="auction" isDarkMode={isDarkMode} />
        ))}
      </div>
    </section>
  );
}
