'use client';

import { useGlobalStats, formatUSDC } from '@/hooks/useGlobalStats';

interface StatsCardsProps {
  isDarkMode: boolean;
}

export function StatsCards({ isDarkMode }: StatsCardsProps) {
  const { totalPools, activePools, completedPools, totalValueLocked, totalMembers } = useGlobalStats();

  const totalPoolsDisplay = totalPools;
  const activePoolsDisplay = activePools;
  const completedPoolsDisplay = completedPools;


  return (
    <section className="py-8 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Pools Card */}
        <div className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>Total Pools</h3>
              <div className="flex gap-2">
                <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-purple-500/30 text-white' : 'bg-purple-200 text-black'}`}>Active ({activePoolsDisplay})</span>
                <span className={`text-xs px-2 py-1 rounded-full ${isDarkMode ? 'bg-gray-500/30 text-white' : 'bg-gray-200 text-black'}`}>Completed ({completedPoolsDisplay})</span>
              </div>
            </div>

            <div className="flex items-center justify-center">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                  <circle cx="50" cy="50" r="45" fill="none" stroke={isDarkMode ? '#ffffff15' : '#f3e8ff'} strokeWidth="12" />
                  <circle
                    cx="50"
                    cy="50"
                    r="45"
                    fill="none"
                    stroke="url(#donutGradient)"
                    strokeWidth="12"
                    strokeDasharray={`${Math.min(100, Math.round((activePoolsDisplay / Math.max(1, totalPoolsDisplay)) * 100))} 100`}
                    strokeLinecap="round"
                  />
                  <defs>
                    <linearGradient id="donutGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="50%" stopColor="#c084fc" />
                      <stop offset="100%" stopColor="#e9d5ff" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{totalPoolsDisplay}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
          <div className="space-y-3">
            <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>Money held by ChainPot</h3>
            <p className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{formatUSDC(totalValueLocked)}</p>
            <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>Contributions earning interest in Compound plus balances waiting to be claimed.</p>
          </div>
        </div>
        <div className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
          <div className="space-y-3">
            <h3 className={`text-sm font-semibold ${isDarkMode ? 'text-white/70' : 'text-black/70'}`}>Registered members</h3>
            <p className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{totalMembers}</p>
            <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>Accounts registered on ChainPot.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
