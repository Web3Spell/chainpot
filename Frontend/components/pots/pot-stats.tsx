'use client';

import { Money } from '@/components/money';
import { usePot, usePotConfig } from '@/hooks/useRoscaEngine';
import { formatDuration, type Engine } from '@/lib/pot';

interface PotStatsProps {
  potId: bigint;
  engine: Engine;
  isDarkMode: boolean;
}


export function PotStats({ potId, engine, isDarkMode }: PotStatsProps) {
  const { pot } = usePot(engine, potId);
  const { config } = usePotConfig(engine, potId);
  if (!pot) return null;

  const stats = [
    { label: 'Each member pays', value: <><Money usdc={pot.amountPerCycle} /> / round</>, color: 'text-blue-500' },
    { label: 'Pot per round', value: <Money usdc={pot.amountPerCycle * BigInt(pot.expectedMembers)} />, color: 'text-purple-500' },
    { label: 'Schedule', value: config ? `Every ${formatDuration(config.cycleDuration)} · ${formatDuration(config.paymentWindow)} to pay` : '—', color: 'text-green-500' },
    { label: 'Members', value: `${pot.memberCount} of ${pot.expectedMembers} joined`, color: 'text-orange-500' },
  ];

  return (
    <section className="mb-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`p-6 rounded-xl border-3 border-black ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
            <p className={`text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{stat.label}</p>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
      <p className={`text-xs mt-3 ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
        Money waiting to be paid out earns interest in Compound; members share it (after a 20% safety-fund fee){engine === 'auction' ? ', along with the discount from winning bids' : ''}.
      </p>
    </section>
  );
}
