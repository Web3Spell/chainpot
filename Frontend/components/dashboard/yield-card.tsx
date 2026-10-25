'use client';

import { useGlobalStats, formatUSDC } from '@/hooks/useGlobalStats';

interface YieldCardProps {
  isDarkMode: boolean;
}

export function YieldCard({ isDarkMode }: YieldCardProps) {
  const { safetyFundAccrued } = useGlobalStats();

  return (
    <section className="py-8">
      <div className={`border-3 border-black rounded-3xl p-8 backdrop-blur transition-colors space-y-3 ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
        <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>ChainPot Safety Fund</h3>
        <p className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{formatUSDC(safetyFundAccrued)}</p>
        <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>
          Money waiting to be paid out earns interest in Compound. Members keep 80% of it; 20% builds this safety
          fund, which backs the protocol against losses.
        </p>
      </div>
    </section>
  );
}
