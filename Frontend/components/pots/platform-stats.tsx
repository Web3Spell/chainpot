'use client';

import { useGlobalStats } from '@/hooks/useGlobalStats';
import { useIndexerStats } from '@/hooks/useIndexer';
import { Money } from '@/components/money';
import { Card } from '@/components/ui/card';

/** ChainPot in numbers — read live from the contracts (and the indexer when available). */
export function PlatformStats() {
  const stats = useGlobalStats();
  const { data: indexed } = useIndexerStats();
  const items: { label: string; value: React.ReactNode; note: string }[] = [
    { label: 'Circles', value: `${stats.activePools} active`, note: `${stats.totalPools} created · ${stats.completedPools} finished` },
    { label: 'Money in ChainPot', value: <Money usdc={stats.totalValueLocked} />, note: 'Earning interest or waiting to be collected' },
    ...(indexed ? [{ label: 'Paid out to members', value: <Money usdc={BigInt(indexed.totalPaidOut)} />, note: 'Across all rounds so far' }] : []),
    { label: 'Safety fund', value: <Money usdc={stats.safetyFundAccrued} />, note: '20% of interest, set aside against losses' },
  ];
  return (
    <section aria-labelledby="stats-heading" className="mt-12">
      <h2 id="stats-heading" className="text-xl font-bold mb-4 text-cp-ink">ChainPot in numbers</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((i) => (
          <Card key={i.label} className="p-5">
            <p className="text-sm font-bold text-cp-muted">{i.label}</p>
            <p className="text-2xl font-black mt-1">{i.value}</p>
            <p className="text-xs text-cp-muted mt-1">{i.note}</p>
          </Card>
        ))}
      </div>
    </section>
  );
}
