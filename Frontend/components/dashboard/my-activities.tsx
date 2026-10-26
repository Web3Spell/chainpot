'use client';

import { Money } from '@/components/money';
import { useChainPotAccount } from '@/lib/aa/account';
import Link from 'next/link';
import { useUserActivityEvents, type ActivityEvent } from '@/hooks/useUserActivityEvents';
import { INDEXER_URL, useActivity, type IndexedActivity } from '@/hooks/useIndexer';
import { formatDateTime, potHref, type Engine } from '@/lib/pot';

interface MyActivitiesProps {
  isDarkMode: boolean;
}

interface Row {
  key: string;
  label: string;
  engine: Engine | null;
  potId: string | null;
  amount?: bigint;
  timestamp: number;
  txHash?: string;
}

const CREDIT_LABEL: Record<number, string> = {
  0: 'Your payout was credited',
  1: 'Your share of interest/discount was credited',
  2: 'A refund was credited',
  3: 'A leftover amount was credited',
};

const INDEXED_LABEL: Record<IndexedActivity['type'], string> = {
  created: 'You created a pot',
  joined: 'You joined a pot',
  left: 'You left a pot',
  paid: 'You paid for a round',
  bid: 'You placed a bid',
  won: 'You were picked to receive the pot 🎉',
  missed: 'You missed a payment deadline',
  credited: 'Money was credited to you',
  claimed: 'You cashed out',
};

const LIVE_LABEL: Record<ActivityEvent['type'], string> = {
  Joined: 'You joined a pot',
  PotCreated: 'You created a pot',
  Paid: 'You paid for a round',
  WinnerSelected: 'You were picked to receive the pot 🎉',
  BidPlaced: 'You placed a bid',
};


export function MyActivities({ isDarkMode }: MyActivitiesProps) {
  const { address } = useChainPotAccount();
  const indexed = useActivity(address);
  // Live subscriptions are only needed when there's no indexer, or it's unreachable.
  const live = useUserActivityEvents(INDEXER_URL && !indexed.isError ? undefined : address);

  const rows: Row[] = indexed.data
    ? indexed.data.map((a) => ({
        key: a.id,
        label: a.type === 'credited' ? CREDIT_LABEL[a.detail ?? -1] ?? INDEXED_LABEL.credited : INDEXED_LABEL[a.type],
        engine: a.engine,
        potId: a.potId,
        amount: a.amount ? BigInt(a.amount) : undefined,
        timestamp: a.timestamp,
        txHash: a.txHash,
      }))
    : live.events.map((e, i) => ({
        key: `${i}-${e.type}`,
        label: LIVE_LABEL[e.type],
        engine: e.engine,
        potId: e.args.potId !== undefined ? String(e.args.potId) : null,
        amount: e.args.amount,
        timestamp: Math.floor(e.timestamp),
      }));

  const card = `border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors ${isDarkMode ? 'text-white bg-white/5' : 'bg-white border-black text-black'}`;

  return (
    <section className="py-12 space-y-6 pb-16">
      <div className="space-y-2">
        <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>My Activity</h2>
        <p className={isDarkMode ? 'text-white/60' : 'text-black/60'}>
          {indexed.data ? 'Everything that happened in your pots.' : 'Your activity since you opened this page.'}
        </p>
      </div>

      <div className={card}>
        {!address ? (
          <p className="text-gray-500">Connect your wallet to see your activity.</p>
        ) : indexed.isLoading ? (
          <div className="h-24 animate-pulse bg-black/10 rounded-xl" />
        ) : rows.length === 0 ? (
          <p className="text-gray-500">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-black/10">
            {rows.map((r) => (
              <li key={r.key} className="py-3 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div>
                  <p className="font-bold text-sm">
                    {r.label}
                    {r.amount !== undefined && <span className="ml-2 text-green-600"><Money usdc={r.amount} /></span>}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatDateTime(r.timestamp)}
                    {r.engine && r.potId && <> · {r.engine === 'circle' ? 'Community Circle' : 'Business ROSCA'} #{r.potId}</>}
                    {r.txHash && (
                      <> · <a className="underline" href={`https://sepolia.basescan.org/tx/${r.txHash}`} target="_blank" rel="noreferrer">receipt</a></>
                    )}
                  </p>
                </div>
                {r.engine && r.potId && (
                  <Link href={potHref(r.engine, r.potId)} className="px-3 py-1 bg-black text-white rounded-full text-xs font-bold self-start md:self-auto">
                    View
                  </Link>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
