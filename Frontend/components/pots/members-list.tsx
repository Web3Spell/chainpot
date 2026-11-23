'use client';

import { Users } from 'lucide-react';
import { useChainPotAccount } from '@/lib/aa/account';
import { useMembersState } from '@/hooks/useMembersState';
import { usePot } from '@/hooks/useRoscaEngine';
import { Card, Skeleton } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { PotStatus, sameAddress, shortAddress, type Engine } from '@/lib/pot';

/** Who's in, and where each person stands this round. */
export function MembersList({ potId, engine }: { potId: bigint; engine: Engine; isDarkMode?: boolean }) {
  const { address } = useChainPotAccount();
  const { pot } = usePot(engine, potId);
  const { rows, isLoading } = useMembersState(engine, potId, pot?.currentCycle ?? 0);
  if (!pot) return null;
  const active = pot.status === PotStatus.Active && pot.currentCycle > 0;

  return (
    <Card className="p-6 mb-8">
      <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
        <Users className="h-5 w-5" aria-hidden="true" /> Members
        <span className="text-sm font-normal text-cp-muted">{pot.memberCount} of {pot.expectedMembers}</span>
      </h2>
      {isLoading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-11" />)}</div>
      ) : (
        <ul className="divide-y divide-cp-line-soft">
          {rows.map((m) => {
            const you = sameAddress(m.address, address);
            return (
              <li key={m.address} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="h-9 w-9 shrink-0 rounded-full bg-cp-accent-soft text-cp-accent text-xs font-black flex items-center justify-center" aria-hidden="true">
                    {m.address.slice(2, 4).toUpperCase()}
                  </span>
                  <span className="font-bold truncate">{you ? 'You' : shortAddress(m.address)}{sameAddress(m.address, pot.creator) && <span className="font-normal text-cp-muted"> · started it</span>}</span>
                </div>
                <div className="flex flex-wrap justify-end gap-1">
                  {m.defaulted ? <StatusPill tone="danger">Missed a payment</StatusPill> : active && (m.paid ? <StatusPill tone="success">Paid</StatusPill> : <StatusPill tone="warn">Not paid yet</StatusPill>)}
                  {m.hasWon && <StatusPill tone="accent">Received</StatusPill>}
                </div>
              </li>
            );
          })}
          {Array.from({ length: Math.max(0, pot.expectedMembers - rows.length) }, (_, i) => (
            <li key={`open-${i}`} className="flex items-center gap-3 py-3 text-cp-muted">
              <span className="h-9 w-9 rounded-full border-2 border-dashed border-cp-line-soft" aria-hidden="true" />
              Waiting for someone to join
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
