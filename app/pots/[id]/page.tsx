'use client';

import { useParams } from 'next/navigation';
import { Navbar } from '@/components/dashboard/navbar';
import { PotHeader } from '@/components/pots/pot-header';
import { PotStats } from '@/components/pots/pot-stats';
import { CurrentCycle } from '@/components/pots/current-cycle';
import { BiddingSection } from '@/components/pots/bidding-section';
import { CycleHistory } from '@/components/pots/cycle-history';
import { useTheme } from '@/providers/theme-provider';

export default function PotDetailsPage() {
  const params = useParams();
  const potId = params.id as string;
  const { isDarkMode } = useTheme();
  const isCreator = true; // Mock - would come from contract/wallet check

  return (
    <main className={`min-h-screen transition-colors duration-300 ${isDarkMode ? 'bg-black' : 'bg-gradient-to-br from-purple-100 via-purple-50 to-purple-200'}`}>
      <Navbar isDarkMode={isDarkMode} />
      <div className={`px-6 md:px-12 py-8 max-w-7xl mx-auto ${isDarkMode ? 'text-white' : 'text-black'}`}>
        <PotHeader potId={potId} isDarkMode={isDarkMode} isCreator={isCreator} />
        <PotStats potId={potId} isDarkMode={isDarkMode} />
        <CurrentCycle potId={potId} isDarkMode={isDarkMode} isCreator={isCreator} />
        <BiddingSection potId={potId} isDarkMode={isDarkMode} />
        <CycleHistory potId={potId} isDarkMode={isDarkMode} />
      </div>
    </main>
  );
}
