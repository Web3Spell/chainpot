'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useMoney } from '@/components/money';
import { Card } from '@/components/ui/card';
import { StatusPill } from '@/components/ui/status-pill';
import { buttonClass } from '@/components/ui/button';
import { potHref } from '@/lib/pot';
import type { Draft } from '@/hooks/useDrafts';

/** A circle that isn't on-chain yet (or that the user still needs to join). */
export function DraftCard({ d }: { d: Draft }) {
  const money = useMoney();
  const href = d.status === 'deployed' && d.potId ? potHref(d.engine, d.potId) : `/circles/draft/${d.id}`;
  const left = d.memberCount - d.seatsTaken;

  let status: string;
  let tone: 'warn' | 'accent' | 'neutral' = 'neutral';
  let cta: string | undefined;
  if (d.status === 'deployed') {
    status = 'The circle is live — join to take your place';
    tone = 'accent';
    cta = 'Join';
  } else if (d.isCreator) {
    status = left > 0 ? `${d.seatsTaken} of ${d.memberCount} accepted · ${left} to go` : 'Everyone accepted';
    tone = left > 0 ? 'warn' : 'accent';
    cta = left > 0 ? 'Share link' : 'Create circle';
  } else {
    status = 'You’re in · waiting for the organizer to start';
  }

  return (
    <Card className="p-5 flex flex-col gap-4 border-dashed">
      <Link href={href} className="flex items-start justify-between gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent">
        <div className="min-w-0">
          <p className="text-lg font-bold truncate"><span aria-hidden="true">{d.emoji ?? '🎲'}</span> {d.name}</p>
          <p className="text-sm text-cp-muted">{money(BigInt(d.amountPerCycle))} each · {d.memberCount} people</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-cp-muted mt-1" aria-hidden="true" />
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusPill tone={tone}>{status}</StatusPill>
        {cta && <Link href={href} className={buttonClass('primary')}>{cta}</Link>}
      </div>
    </Card>
  );
}
