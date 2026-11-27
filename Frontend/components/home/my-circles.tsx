'use client';

import { Users } from 'lucide-react';
import { AccountAccessButton } from '@/components/aa/account-access-button';
import { useChainPotAccount } from '@/lib/aa/account';
import { useMyPotIds } from '@/hooks/useMyPotIds';
import { usePotNames } from '@/hooks/usePotNames';
import { Card, Skeleton } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { ButtonLink } from '@/components/ui/button';
import { CircleCard } from './circle-card';
import { DraftCard } from './draft-card';
import { useMyDrafts } from '@/hooks/useDrafts';

export function MyCircles() {
  const account = useChainPotAccount();
  const { pots, isLoading } = useMyPotIds(account.address);
  const nameOf = usePotNames(pots);
  const drafts = useMyDrafts();
  const joined = new Set(pots.map((p) => `${p.engine}:${p.potId}`));
  // Drafts still forming, plus live circles from a draft that this user hasn't joined yet.
  const pending = (drafts.data ?? []).filter((d) => d.status !== 'deployed' || (d.potId && !joined.has(`${d.engine}:${d.potId}`)));

  if (!account.isConnected) {
    return (
      <Card>
        <EmptyState
          icon={Users}
          title={account.access === "signed-out" ? "Sign in to see your circles" : "Access your circles"}
          body="Your circles, what's due and what you've received show up here."
          action={<AccountAccessButton />}
        />
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2" aria-busy="true">
        <Skeleton className="h-36" />
        <Skeleton className="h-36" />
      </div>
    );
  }

  if (pots.length === 0 && pending.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={Users}
          title="No circles yet"
          body="Start one with people you trust, or open the invite link a friend sent you."
          action={<ButtonLink href="/pots/create">Start a circle</ButtonLink>}
        />
      </Card>
    );
  }

  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {pending.map((d) => (
        <li key={`draft:${d.id}`}>
          <DraftCard d={d} />
        </li>
      ))}
      {pots.map((p) => (
        <li key={`${p.engine}:${p.potId}`}>
          <CircleCard engine={p.engine} potId={p.potId} name={nameOf(p.engine, p.potId)} />
        </li>
      ))}
    </ul>
  );
}
