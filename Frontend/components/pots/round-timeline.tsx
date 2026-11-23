'use client';

import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { useChainPotAccount } from '@/lib/aa/account';
import { useCycle, usePot } from '@/hooks/useRoscaEngine';
import { usePotIndex } from '@/hooks/useIndexer';
import { Money } from '@/components/money';
import { Card } from '@/components/ui/card';
import { ZERO_ADDRESS, sameAddress, shortAddress, type Engine } from '@/lib/pot';

function PastRound({ engine, potId, n, me }: { engine: Engine; potId: bigint; n: number; me?: string }) {
  const { cycle } = useCycle(engine, potId, n);
  const { data: index } = usePotIndex(engine, potId);
  const amount = index?.cycles.find((c) => c.cycleId === n)?.winnerAmount;
  const who = !cycle ? '…' : cycle.winner === ZERO_ADDRESS ? 'No receiver — refunded' : sameAddress(cycle.winner, me) ? 'You 🎉' : shortAddress(cycle.winner);
  return (
    <>
      <span className="font-bold">{who}</span>
      {amount && <span className="text-cp-muted"> · <Money usdc={BigInt(amount)} /></span>}
    </>
  );
}

/** Rounds 1…N: who received, what's happening now, what's next. */
export function RoundTimeline({ potId, engine }: { potId: bigint; engine: Engine; isDarkMode?: boolean }) {
  const { address } = useChainPotAccount();
  const { pot } = usePot(engine, potId);
  if (!pot || pot.currentCycle === 0) return null;
  const rounds = Array.from({ length: pot.expectedMembers }, (_, i) => i + 1);

  return (
    <Card className="p-6 mb-8">
      <h2 className="text-xl font-bold mb-4">Rounds</h2>
      <ol className="relative space-y-4">
        {rounds.map((n) => {
          const done = n <= pot.completedCycles;
          const current = !done && n === pot.currentCycle;
          return (
            <li key={n} className="flex items-start gap-3" aria-current={current ? 'step' : undefined}>
              {done ? (
                <CheckCircle2 className="h-6 w-6 shrink-0 text-cp-success" aria-hidden="true" />
              ) : current ? (
                <Loader2 className="h-6 w-6 shrink-0 text-cp-accent motion-safe:animate-spin" aria-hidden="true" />
              ) : (
                <Circle className="h-6 w-6 shrink-0 text-cp-line-soft" aria-hidden="true" />
              )}
              <div className="text-sm">
                <p className={done || current ? 'font-bold' : 'text-cp-muted'}>Round {n}{current ? ' · now' : ''}</p>
                {done ? (
                  <p><PastRound engine={engine} potId={potId} n={n} me={address} /></p>
                ) : current ? (
                  <p className="text-cp-muted">In progress — see “Next step” above.</p>
                ) : (
                  <p className="text-cp-muted">Coming up</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </Card>
  );
}
