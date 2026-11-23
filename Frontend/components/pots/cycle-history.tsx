'use client';

import { Money } from '@/components/money';
import { useChainPotAccount } from '@/lib/aa/account';
import { useCycle, usePot } from '@/hooks/useRoscaEngine';
import { usePotIndex, type IndexedCycle } from '@/hooks/useIndexer';
import { ZERO_ADDRESS, formatDateTime, sameAddress, shortAddress, type Engine } from '@/lib/pot';

interface CycleHistoryProps {
  potId: bigint;
  engine: Engine;
  isDarkMode: boolean;
}


function CycleItem({ engine, potId, cycleNum, indexed }: { engine: Engine; potId: bigint; cycleNum: number; indexed?: IndexedCycle }) {
  const { address } = useChainPotAccount();
  const { cycle } = useCycle(engine, potId, cycleNum);
  const box = `p-6 rounded-xl border-3 border-cp-line bg-cp-surface text-cp-ink`;
  if (!cycle) return <div className={`${box} animate-pulse`}><div className="h-10 bg-black/10 rounded" /></div>;

  const noWinner = cycle.winner === ZERO_ADDRESS;
  return (
    <div className={box}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
        <div>
          <p className="text-sm font-medium text-gray-500">Round</p>
          <p className="text-2xl font-bold">{cycleNum}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Receiver</p>
          <p className="font-bold">{noWinner ? 'None (refunded)' : sameAddress(cycle.winner, address) ? 'You' : shortAddress(cycle.winner)}</p>
          {indexed?.winnerAmount && <p className="text-xs text-gray-500">Received <Money usdc={BigInt(indexed.winnerAmount)} />{indexed.fallbackWinner ? ' · fallback draw' : ''}</p>}
          {!!indexed?.defaultsCount && <p className="text-xs text-cp-danger">{indexed.defaultsCount} missed payment{indexed.defaultsCount === 1 ? '' : 's'}</p>}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">Collected</p>
          <p className="text-lg font-bold text-cp-success"><Money usdc={cycle.totalCollected} /> · {cycle.paidCount} paid</p>
        </div>
        <div className="md:text-right">
          <p className="text-sm font-medium text-gray-500">Started {formatDateTime(cycle.startTime)}</p>
        </div>
      </div>
    </div>
  );
}

export function CycleHistory({ potId, engine }: CycleHistoryProps) {
  const { pot } = usePot(engine, potId);
  const { data: index } = usePotIndex(engine, potId);
  if (!pot) return null;
  // Rounds complete strictly in order, so rounds 1..completedCycles are the finished ones.
  const last = pot.completedCycles;
  const rounds = Array.from({ length: last }, (_, i) => last - i);

  return (
    <section>
      <h2 className={`text-3xl font-bold mb-6 text-cp-ink`}>Past rounds</h2>
      {rounds.length === 0 ? (
        <p className="text-gray-500">No completed rounds yet.</p>
      ) : (
        <div className="space-y-4">
          {rounds.map((n) => <CycleItem key={n} engine={engine} potId={potId} cycleNum={n} indexed={index?.cycles.find((c) => c.cycleId === n)} />)}
        </div>
      )}
    </section>
  );
}
