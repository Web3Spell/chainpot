'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useChainPotAccount } from '@/lib/aa/account';
import { useCycle, useMemberState, usePot, usePotConfig } from '@/hooks/useRoscaEngine';
import { useNow } from '@/hooks/useNow';
import { useMoney } from '@/components/money';
import { Card, Skeleton } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { buttonClass } from '@/components/ui/button';
import { memberAction } from '@/lib/potState';
import { actionCopy } from '@/lib/potCopy';
import { PotStatus, potHref, sameAddress, type Engine } from '@/lib/pot';
import type { PotName } from '@/hooks/usePotNames';

/** One circle on the home screen: name, one status line, at most one button. */
export function CircleCard({ engine, potId, name }: { engine: Engine; potId: bigint; name: PotName }) {
  const account = useChainPotAccount();
  const now = useNow(30_000);
  const money = useMoney();
  const { pot, isLoading } = usePot(engine, potId);
  const { config } = usePotConfig(engine, potId);
  const { cycle } = useCycle(engine, potId, pot?.currentCycle ?? 0);
  const member = useMemberState(engine, potId, pot?.currentCycle ?? 0, account.address);

  if (isLoading || !pot) return <Skeleton className="h-36" />;

  const action = memberAction({
    engine, pot, config, cycle, now,
    viewer: {
      address: account.address,
      isCreator: sameAddress(account.address, pot.creator),
      isMember: member.isMember,
      hasWon: member.hasWon,
      defaulted: member.defaulted,
      paidThisRound: member.paid,
    },
  });
  const copy = actionCopy(action, now, money);
  const href = potHref(engine, potId);
  const progress = pot.status === PotStatus.Open ? `${pot.memberCount}/${pot.expectedMembers} joined` : `Round ${Math.max(pot.currentCycle, 1)} of ${pot.expectedMembers}`;

  return (
    <Card className={`p-5 flex flex-col gap-4 ${copy.urgent ? 'ring-2 ring-cp-danger' : ''}`}>
      <Link href={href} className="flex items-start justify-between gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent">
        <div className="min-w-0">
          <p className="text-lg font-bold truncate">
            <span aria-hidden="true">{name.emoji}</span> {name.name}
          </p>
          <p className="text-sm text-cp-muted">
            {money(pot.amountPerCycle)} each · {progress}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-cp-muted mt-1" aria-hidden="true" />
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {copy.status ? <StatusPill tone={copy.tone}>{copy.status}</StatusPill> : <span />}
        {copy.cta && (
          <Link href={`${href}#${action.kind === 'waitingForMembers' ? 'invite' : 'your-round'}`} className={buttonClass(copy.urgent ? 'danger' : 'primary')}>
            {copy.cta}
          </Link>
        )}
      </div>
    </Card>
  );
}
