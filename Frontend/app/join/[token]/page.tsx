'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { LinkIcon } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Navbar } from '@/components/dashboard/navbar';
import { useTheme } from '@/providers/theme-provider';
import { AccountAccessButton } from '@/components/aa/account-access-button';
import { useChainPotAccount } from '@/lib/aa/account';
import { apiFetch } from '@/lib/aa/api';
import { useDraftByToken, useMyDrafts, type Draft } from '@/hooks/useDrafts';
import { DraftTerms } from '@/components/circles/draft-terms';
import { Card, Skeleton } from '@/components/ui/card';
import { Button, ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { potHref } from '@/lib/pot';

export default function JoinPage() {
  const { isDarkMode } = useTheme();
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const account = useChainPotAccount();
  const draft = useDraftByToken(token);
  const mine = useMyDrafts();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const d = draft.data;
  const accepted = !!d && !!mine.data?.some((m) => m.id === d.id);
  const full = !!d && d.seatsTaken >= d.memberCount;

  const accept = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch<Draft>(account, `/api/drafts/join/${encodeURIComponent(token)}`, { method: 'POST' });
      await queryClient.invalidateQueries({ queryKey: ['drafts'] });
      router.push(`/circles/draft/${res.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  let action: React.ReactNode;
  if (!d) action = null;
  else if (d.status === 'deployed') {
    action = accepted && d.potId ? <ButtonLink href={potHref(d.engine, d.potId)} size="lg">Open the circle</ButtonLink> : <p className="font-bold text-cp-muted">This circle has already started.</p>;
  } else if (accepted) {
    action = <ButtonLink href={`/circles/draft/${d.id}`} size="lg">You&apos;re in — see who else joined</ButtonLink>;
  } else if (full) {
    action = <p className="font-bold text-cp-muted">This circle is full.</p>;
  } else if (!account.isConnected) {
    action = <AccountAccessButton size="lg">Sign in to accept</AccountAccessButton>;
  } else if (!account.getIdentityToken) {
    action = <p className="font-bold text-cp-muted">Sign in with your phone number or email to accept this invite.</p>;
  } else {
    action = <Button size="lg" onClick={accept} disabled={busy}>{busy ? 'Accepting…' : 'Accept invite'}</Button>;
  }

  return (
    <main className={`min-h-screen bg-cp-page text-cp-ink ${isDarkMode ? '' : 'bg-gradient-to-br from-purple-100 via-purple-50 to-purple-200'}`}>
      <Navbar isDarkMode={isDarkMode} />
      <div className="px-4 sm:px-6 py-10 max-w-xl mx-auto">
        {draft.isLoading ? (
          <Skeleton className="h-72" />
        ) : !d && (draft.error as { status?: number } | null)?.status === 404 ? (
          <Card>
            <EmptyState icon={LinkIcon} title="This invite link isn’t valid" body="It may have been replaced or cancelled. Ask the person who invited you for a new link." action={<ButtonLink href="/dashboard" variant="secondary">Go to my circles</ButtonLink>} />
          </Card>
        ) : !d ? (
          <Card>
            <EmptyState icon={LinkIcon} title="We couldn’t load this invite right now" body="Your link is probably fine. Check your connection and try again in a moment." action={<Button variant="secondary" onClick={() => draft.refetch()}>Try again</Button>} />
          </Card>
        ) : (
          <Card className="p-6 sm:p-8 space-y-5">
            <p className="text-sm font-bold text-cp-accent">You&apos;re invited to a savings circle</p>
            <h1 className="text-3xl sm:text-4xl font-black"><span aria-hidden="true">{d.emoji ?? '🎲'}</span> {d.name}</h1>
            <DraftTerms d={d} />
            <p className="text-sm text-cp-muted">
              {d.seatsTaken} of {d.memberCount} spots taken. Accepting doesn&apos;t charge anything — you&apos;ll pay your first round once the organizer starts the circle. Missing a payment means losing your place.
            </p>
            <div className="flex flex-wrap items-center gap-3">{action}</div>
            {error && <p role="alert" className="text-sm font-bold text-cp-danger">{error}</p>}
          </Card>
        )}
      </div>
    </main>
  );
}
