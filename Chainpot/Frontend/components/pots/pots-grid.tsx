'use client';

import Link from 'next/link';
import { PotCard } from './pot-card';
import { usePotCounter, useGetPot } from '@/hooks/useRoscaEngine';
import { useUSDCDecimals } from '@/hooks/useUsdc';
import { formatUnits } from 'viem';

interface PotsGridProps {
  isDarkMode: boolean;
}

const SkeletonCard = ({ isDarkMode }: { isDarkMode: boolean }) => (
  <div className={`p-6 rounded-2xl border-3 border-black animate-pulse ${isDarkMode ? 'bg-white/5' : 'bg-white/80'}`}>
    <div className="h-6 w-2/3 bg-black/20 rounded mb-4" />
    <div className="h-4 w-1/2 bg-black/10 rounded mb-6" />
    <div className="h-10 w-full bg-black/10 rounded" />
  </div>
);

function PotItem({ id, engine, isDarkMode }: { id: number; engine: "circle" | "auction"; isDarkMode: boolean }) {
  const pid = BigInt(id);
  const { data: pot, isLoading: isPotLoading } = useGetPot(engine, pid);
  const { data: decimals } = useUSDCDecimals();

  if (isPotLoading || !pot) return <SkeletonCard isDarkMode={isDarkMode} />;

  const creator = (pot as any)[0];
  const amountPerCycle = BigInt((pot as any)[4] || 0);
  const memberCount = Number((pot as any)[3] || 0);
  const cycleDuration = 0; // Not available in V4 getPot
  const statusRaw = Number((pot as any)[5] || 0);
  const completedCycles = Number((pot as any)[7] || 0);

  const totalAmount = formatUnits(amountPerCycle * BigInt(memberCount), decimals ?? 6);
  const frequency = `${Math.floor(cycleDuration / 86400)} days`;
  const status = statusRaw === 0 ? 'Pending' : statusRaw === 1 ? 'Active' : 'Completed';

  const potDisplay = {
    id,
    engine,
    name: `Pot #${id}`,
    description: `By ${String(creator).slice(0, 6)}...`,
    totalAmount: `$${totalAmount}`,
    participants: memberCount,
    yieldRate: engine === 'circle' ? 'None' : 'Discount Bids',
    frequency,
    status,
    cyclesComplete: completedCycles,
  };

  return <PotCard pot={potDisplay} isDarkMode={isDarkMode} />;
}

export function PotsGrid({ isDarkMode }: PotsGridProps) {
  const { data: circleCountRaw, isLoading: circleLoading } = usePotCounter("circle");
  const { data: auctionCountRaw, isLoading: auctionLoading } = usePotCounter("auction");

  const circleCount = Number(circleCountRaw || 0);
  const auctionCount = Number(auctionCountRaw || 0);

  const circleIds = Array.from({ length: circleCount }, (_, i) => i + 1);
  const auctionIds = Array.from({ length: auctionCount }, (_, i) => i + 1);

  if (circleLoading || auctionLoading) {
    return (
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} isDarkMode={isDarkMode} />)}
        </div>
      </section>
    );
  }

  if (circleCount === 0 && auctionCount === 0) {
    return (
      <section>
        <div className="text-white/70">No pots found on-chain.</div>
      </section>
    );
  }

  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {circleIds.map((id) => (
          <Link key={`circle-${id}`} href={`/pots/${id}?engine=circle`}>
            <PotItem id={id} engine="circle" isDarkMode={isDarkMode} />
          </Link>
        ))}
        {auctionIds.map((id) => (
          <Link key={`auction-${id}`} href={`/pots/${id}?engine=auction`}>
            <PotItem id={id} engine="auction" isDarkMode={isDarkMode} />
          </Link>
        ))}
      </div>
    </section>
  );
}
