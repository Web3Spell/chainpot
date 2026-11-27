'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Copy, LinkIcon, Share2, Users, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { parseEventLogs } from 'viem';
import { Navbar } from '@/components/dashboard/navbar';
import { useTheme } from '@/providers/theme-provider';
import { AccountAccessButton } from '@/components/aa/account-access-button';
import { useChainPotAccount } from '@/lib/aa/account';
import { apiFetch } from '@/lib/aa/api';
import { useMyDrafts } from '@/hooks/useDrafts';
import { contractCall, useContractAction } from '@/hooks/useContractAction';
import { auctionContract, circleContract } from '@/hooks/useAuctionEngine';
import { registerMemberCall, useIsRegistered } from '@/hooks/useMemberRegistry';
import { DraftTerms } from '@/components/circles/draft-terms';
import { Card, Skeleton } from '@/components/ui/card';
import { Button, ButtonLink } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { StatusPill } from '@/components/ui/status-pill';
import { potHref, sameAddress, shortAddress, MIN_MEMBERS } from '@/lib/pot';

interface Lock {
  members: `0x${string}`[];
  merkleRoot: `0x${string}`;
}

function useInviteToken(id: string) {
  const [token, setToken] = useState<string | null>(null);
  useEffect(() => {
    const fromHash = /(?:^#|&)t=([A-Za-z0-9_-]+)/.exec(window.location.hash)?.[1];
    let stored: string | null = null;
    try {
      if (fromHash) localStorage.setItem(`chainpot:draft-link:${id}`, fromHash);
      stored = localStorage.getItem(`chainpot:draft-link:${id}`);
    } catch {
      // storage blocked; the fragment still works for this visit
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of browser-only state
    setToken(fromHash ?? stored);
  }, [id]);
  const save = (t: string) => {
    try {
      localStorage.setItem(`chainpot:draft-link:${id}`, t);
    } catch {
      // ignore
    }
    setToken(t);
  };
  return [token, save] as const;
}

export default function DraftPage() {
  const { isDarkMode } = useTheme();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const account = useChainPotAccount();
  const drafts = useMyDrafts();
  const d = drafts.data?.find((x) => x.id === id);
  const [token, setToken] = useInviteToken(id);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data: isRegistered } = useIsRegistered(account.address);
  const create = useContractAction();
  const lockRef = useRef<Lock | null>(null);

  const link = useMemo(() => (token && typeof window !== 'undefined' ? `${window.location.origin}/join/${token}` : null), [token]);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['drafts'] });

  // After the on-chain create: link the draft (server re-checks it against the chain), then open the circle.
  useEffect(() => {
    if (!create.isConfirmed || !create.receipt || !d) return;
    const abi = d.engine === 'circle' ? circleContract.abi : auctionContract.abi;
    const [created] = parseEventLogs({ abi, eventName: 'PotCreated', logs: create.receipt.logs });
    if (!created) return;
    void (async () => {
      try {
        await apiFetch(account, `/api/drafts/${id}/deployed`, { method: 'POST', body: JSON.stringify({ engine: d.engine, potId: created.args.potId.toString() }) });
      } catch (err) {
        setError(`Your circle was created, but linking it failed: ${(err as Error).message}`);
      }
      await refresh();
      router.push(`${potHref(d.engine, created.args.potId)}&created=1`);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once per confirmed receipt
  }, [create.isConfirmed, create.receipt]);

  // If the create was cancelled or failed, reopen the draft so others can still accept.
  useEffect(() => {
    if (create.error && lockRef.current) {
      lockRef.current = null;
      void apiFetch(account, `/api/drafts/${id}/unlock`, { method: 'POST' }).then(refresh);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- react to errors only
  }, [create.error]);

  const share = async () => {
    if (!link || !d) return;
    const text = `Join my ChainPot circle "${d.name}"`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: text, text, url: link });
        return;
      } catch {
        // fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this invite link', link);
    }
  };

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const startOnChain = () =>
    run('create', async () => {
      if (!d) return;
      const lock = await apiFetch<Lock>(account, `/api/drafts/${id}/lock`, { method: 'POST' });
      lockRef.current = lock;
      const args = [lock.merkleRoot, BigInt(lock.members.length), BigInt(d.amountPerCycle), BigInt(d.cycleDuration), BigInt(d.paymentWindow)] as const;
      const createCall = d.engine === 'circle'
        ? contractCall({ ...circleContract, functionName: 'createPot', args })
        : contractCall({ ...auctionContract, functionName: 'createPot', args: [...args, BigInt(d.biddingWindow)] });
      create.writeBatch(isRegistered === false ? [registerMemberCall(), createCall] : [createCall]);
    });

  const shell = (children: React.ReactNode) => (
    <main className={`min-h-screen bg-cp-page text-cp-ink ${isDarkMode ? '' : 'bg-gradient-to-br from-purple-100 via-purple-50 to-purple-200'}`}>
      <Navbar isDarkMode={isDarkMode} />
      <div className="px-4 sm:px-6 py-8 max-w-2xl mx-auto space-y-6">{children}</div>
    </main>
  );

  if (!account.isConnected) {
    return shell(<Card><EmptyState icon={Users} title={account.access === "signed-out" ? "Sign in to see this circle" : "Access your circle"} body="Drafts are visible to the organizer and people who accepted." action={<AccountAccessButton />} /></Card>);
  }
  if (drafts.isLoading) return shell(<Skeleton className="h-96" />);
  if (!d) {
    return shell(<Card><EmptyState icon={LinkIcon} title="Draft not found" body="It may have been cancelled, or you haven't accepted the invite yet." action={<ButtonLink href="/dashboard" variant="secondary">Go to my circles</ButtonLink>} /></Card>);
  }

  const members = d.members ?? [];
  const canCreate = d.isCreator && d.status !== 'deployed' && members.length >= MIN_MEMBERS;
  const fewer = members.length < d.memberCount;

  return shell(
    <>
      <div>
        <StatusPill tone={d.status === 'deployed' ? 'success' : 'warn'}>
          {d.status === 'deployed' ? 'Circle created' : d.status === 'locked' ? 'Being created…' : 'Collecting members'}
        </StatusPill>
        <h1 className="text-3xl sm:text-4xl font-black mt-3"><span aria-hidden="true">{d.emoji ?? '🎲'}</span> {d.name}</h1>
        <div className="mt-3"><DraftTerms d={d} /></div>
      </div>

      {d.isCreator && d.status === 'open' && (
        <Card className="p-6 space-y-4">
          <h2 className="text-xl font-bold">Invite people</h2>
          <p className="text-sm text-cp-muted">Share this link in your group. Anyone with it can take a spot until all {d.memberCount} are taken — you can remove people below.</p>
          {link ? (
            <>
              <p className="font-mono text-xs break-all p-3 rounded-xl bg-cp-surface-muted">{link}</p>
              <div className="flex flex-wrap gap-3">
                <Button onClick={share}><Share2 className="h-4 w-4" aria-hidden="true" /> {copied ? 'Link copied ✓' : 'Share invite link'}</Button>
                <Button variant="ghost" onClick={() => run('rotate', async () => setToken((await apiFetch<{ token: string }>(account, `/api/drafts/${id}/link`, { method: 'POST' })).token))} disabled={!!busy}>
                  Make a new link
                </Button>
              </div>
            </>
          ) : (
            <Button variant="secondary" onClick={() => run('rotate', async () => setToken((await apiFetch<{ token: string }>(account, `/api/drafts/${id}/link`, { method: 'POST' })).token))} disabled={!!busy}>
              <Copy className="h-4 w-4" aria-hidden="true" /> Get the invite link
            </Button>
          )}
        </Card>
      )}

      <Card className="p-6">
        <h2 className="text-xl font-bold mb-3">{members.length} of {d.memberCount} accepted</h2>
        <ul className="divide-y divide-cp-line-soft">
          {members.map((m, i) => {
            const you = sameAddress(m, account.address);
            return (
              <li key={m} className="flex items-center justify-between gap-3 py-3">
                <span className="font-bold">{you ? 'You' : shortAddress(m)}{i === 0 && <span className="font-normal text-cp-muted"> · organizer</span>}</span>
                {d.isCreator && !you && d.status === 'open' && (
                  <button
                    type="button"
                    onClick={() => run(`remove-${m}`, () => apiFetch(account, `/api/drafts/${id}/members/${m}`, { method: 'DELETE' }))}
                    disabled={!!busy}
                    aria-label={`Remove ${shortAddress(m)}`}
                    className="h-11 w-11 inline-flex items-center justify-center rounded-full hover:bg-cp-line-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </li>
            );
          })}
          {Array.from({ length: Math.max(0, d.memberCount - members.length) }, (_, i) => (
            <li key={`open-${i}`} className="py-3 text-cp-muted">Waiting for someone to accept</li>
          ))}
        </ul>
      </Card>

      {d.isCreator && d.status !== 'deployed' && (
        <Card className="p-6 space-y-3">
          <h2 className="text-xl font-bold">Create the circle</h2>
          <p className="text-sm text-cp-muted">
            {fewer
              ? `Only ${members.length} of ${d.memberCount} have accepted. You can wait, or create it now with ${members.length} people (${members.length} rounds).`
              : 'Everyone has accepted. Creating the circle locks the member list; each person then taps Join.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" onClick={startOnChain} disabled={!canCreate || !!busy || create.isBusy}>
              {create.isPending ? 'Confirming…' : create.isConfirming ? 'Creating…' : `Create with ${members.length} people`}
            </Button>
            <Button variant="ghost" onClick={() => window.confirm('Cancel this draft? The invite link will stop working.') && run('cancel', async () => { await apiFetch(account, `/api/drafts/${id}`, { method: 'DELETE' }); router.push('/dashboard'); })} disabled={!!busy || create.isBusy}>
              Cancel draft
            </Button>
          </div>
        </Card>
      )}

      {!d.isCreator && d.status !== 'deployed' && (
        <Card className="p-6"><p className="font-bold">You&apos;re in ✓</p><p className="text-sm text-cp-muted mt-1">We&apos;ll show “Join” here as soon as the organizer creates the circle.</p></Card>
      )}

      {d.status === 'deployed' && d.potId && (
        <Card className="p-6 space-y-3">
          <p className="font-bold">The circle is live.</p>
          <ButtonLink href={potHref(d.engine, d.potId)} size="lg">Open the circle{d.isCreator ? '' : ' and join'}</ButtonLink>
        </Card>
      )}

      {(error || create.errorMessage) && <p role="alert" className="text-sm font-bold text-cp-danger">{error ?? create.errorMessage}</p>}
    </>,
  );
}
