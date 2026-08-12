'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Navbar } from '@/components/dashboard/navbar';
import { PotHeader } from '@/components/pots/pot-header';
import { PotStats } from '@/components/pots/pot-stats';
import { CurrentCycle } from '@/components/pots/current-cycle';
import { BiddingSection } from '@/components/pots/bidding-section';
import { CircleCycle } from '@/components/pots/circle-cycle';
import { CycleHistory } from '@/components/pots/cycle-history';
import { useTheme } from '@/providers/theme-provider';
import { useGetPot } from '@/hooks/useRoscaEngine';

export default function PotDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const potId = params.id as string;
  const { isDarkMode } = useTheme();

  // We can pass ?engine=circle or ?engine=auction in URL, 
  // or auto-detect by fetching from both
  const urlEngine = searchParams.get('engine') as "circle" | "auction" | null;
  const [engine, setEngine] = useState<"circle" | "auction">(urlEngine || "circle");
  
  // Try fetching from both engines to auto-detect if not provided in URL
  const { data: circlePot } = useGetPot("circle", BigInt(potId));
  const { data: auctionPot } = useGetPot("auction", BigInt(potId));

  useEffect(() => {
    if (!urlEngine) {
      if (circlePot && (circlePot as any)[0] !== "0x0000000000000000000000000000000000000000") {
        setEngine("circle");
      } else if (auctionPot && (auctionPot as any)[0] !== "0x0000000000000000000000000000000000000000") {
        setEngine("auction");
      }
    }
  }, [circlePot, auctionPot, urlEngine]);

  return (
    <main className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-black' : 'bg-gradient-to-br from-purple-100 via-purple-50 to-purple-200'}`}>
      <Navbar isDarkMode={isDarkMode} />
      <div className={`px-6 md:px-12 py-8 max-w-7xl mx-auto ${isDarkMode ? 'text-white' : 'text-black'}`}>
        <PotHeader potId={potId} engine={engine} isDarkMode={isDarkMode} />
        <PotStats potId={potId} engine={engine} isDarkMode={isDarkMode} />
        <CurrentCycle potId={potId} engine={engine} isDarkMode={isDarkMode}  />
        
        {engine === "auction" ? (
          <BiddingSection potId={potId} isDarkMode={isDarkMode} />
        ) : (
          <CircleCycle potId={potId} isDarkMode={isDarkMode} />
        )}
        
        <CycleHistory potId={potId} engine={engine} isDarkMode={isDarkMode} />
      </div>
    </main>
  );
}
