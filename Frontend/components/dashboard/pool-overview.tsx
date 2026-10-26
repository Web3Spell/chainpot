'use client';

import Link from 'next/link';
import { useAccount } from 'wagmi';
import { usePotCounter } from '@/hooks/useRoscaEngine';
import { PotSummaryCard } from '@/components/pots/pot-summary-card';
import { useMyPots } from '@/hooks/useIndexer';

interface PoolOverviewProps {
  isDarkMode: boolean;
}

export function PoolOverview({ isDarkMode }: PoolOverviewProps) {
  const { address } = useAccount();

  const { data: circleCountRaw } = usePotCounter("circle");
  const { data: auctionCountRaw } = usePotCounter("auction");

  const circleCount = Number(circleCountRaw || 0);
  const auctionCount = Number(auctionCountRaw || 0);

  // Indexer gives the exact membership list. Without it, fall back to checking the most recent pots on-chain.
  const indexed = useMyPots(address);
  const useIndex = indexed.isSuccess;
  const circleIds = useIndex ? [] : Array.from({ length: Math.min(25, circleCount) }, (_, i) => BigInt(circleCount - i));
  const auctionIds = useIndex ? [] : Array.from({ length: Math.min(25, auctionCount) }, (_, i) => BigInt(auctionCount - i));
  const mine = (indexed.data ?? []).filter((r) => r.pot).sort((a, b) => b.pot!.createdAt - a.pot!.createdAt);

  if (!address) {
    return (
      <section className="py-12 space-y-6">
        <h2 className="text-3xl font-bold">My Pots</h2>
        <div className="p-8 rounded-3xl border-3 border-black text-gray-500">Connect your wallet to see your pots.</div>
      </section>
    );
  }

  return (
    <section className="py-12 space-y-6">
      <div className="space-y-2">
        <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>My Pots</h2>
        <p className={isDarkMode ? 'text-white/60' : 'text-black/60'}>Pots you&apos;re a member of</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mine.map(({ pot }) => <PotSummaryCard key={pot!.id} potId={BigInt(pot!.potId)} engine={pot!.engine} isDarkMode={isDarkMode} />)}
        {circleIds.map((id) => <PotSummaryCard key={`circle-${id}`} potId={id} engine="circle" isDarkMode={isDarkMode} membersOnly />)}
        {auctionIds.map((id) => <PotSummaryCard key={`auction-${id}`} potId={id} engine="auction" isDarkMode={isDarkMode} membersOnly />)}
      </div>
      
      {useIndex && mine.length === 0 && (
        <div className={`border-3 border-black rounded-3xl p-8 ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
          <p className={isDarkMode ? 'text-white/70' : 'text-black/70'}>You haven&apos;t joined any pots yet. Ask a friend for an invite link, or create your own.</p>
        </div>
      )}

      {!useIndex && (circleCount === 0 && auctionCount === 0) && (
        <div className={`border-3 border-black rounded-3xl p-8 ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
          <p className={isDarkMode ? 'text-white/70' : 'text-black/70'}>No pots exist on the network yet.</p>
          <div className="pt-4">
            <Link href="/pots">
              <button className={`px-6 py-3 rounded-full font-semibold ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}>
                Browse Pools
              </button>
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
