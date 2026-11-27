'use client';

import { AccountAccessButton } from '@/components/aa/account-access-button';
import { useChainPotAccount } from '@/lib/aa/account';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { engineContract, useMemberState, usePot } from '@/hooks/useRoscaEngine';
import { registerMemberCall, useCanJoin, useIsRegistered } from '@/hooks/useMemberRegistry';
import { contractCall, useContractAction } from '@/hooks/useContractAction';
import { fetchInvite, inviteLink, inviteRoot, loadInvite, proofFor, publishInvite, readInviteFromHash, saveInvite } from '@/lib/invite';
import { PotStatus, engineLabel, formatDuration, potHref, sameAddress, shortAddress, type Engine } from '@/lib/pot';
import { Share2 } from 'lucide-react';
import { usePotConfig } from '@/hooks/useRoscaEngine';
import { usePotNames } from '@/hooks/usePotNames';
import { Money } from '@/components/money';
import { Card } from '@/components/ui/card';
import { Button, buttonClass } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';

interface PotHeaderProps {
  potId: bigint;
  engine: Engine;
  isDarkMode: boolean;
}

/**
 * Invite list for this pot, verified against the on-chain root. Sources in order: the share link
 * (#invite=…), this browser's cache, then the server copy. Any list we hold is (re)published to the
 * server so later invitees can use the short link.
 */
function useInviteList(engine: Engine, potId: bigint, merkleRoot?: `0x${string}`) {
  // Only rendered client-side after the pot loads, so reading window here is safe.
  const local = useMemo(() => {
    if (!merkleRoot || typeof window === 'undefined') return undefined;
    const fromHash = readInviteFromHash(window.location.hash);
    if (fromHash && inviteRoot(fromHash).toLowerCase() === merkleRoot.toLowerCase()) return fromHash;
    return loadInvite(merkleRoot);
  }, [merkleRoot]);

  const server = useQuery({
    queryKey: ['invite', engine, potId.toString(), merkleRoot],
    queryFn: () => fetchInvite(engine, potId),
    enabled: !!merkleRoot,
    refetchInterval: false,
    retry: 1,
  });
  const fromServer = server.data && merkleRoot && inviteRoot(server.data).toLowerCase() === merkleRoot.toLowerCase() ? server.data : undefined;
  const list = local ?? fromServer;

  const published = useRef(false);
  const { isFetched, refetch } = server;
  useEffect(() => {
    if (!list) return;
    saveInvite(list); // remember it so this member can re-share later
    if (!fromServer && isFetched && !published.current) {
      published.current = true;
      void publishInvite(engine, potId, list).then((ok) => {
        if (ok) void refetch();
      });
    }
  }, [list, fromServer, isFetched, refetch, engine, potId]);

  return { list, onServer: !!fromServer, loading: server.isLoading && !local };
}

export function PotHeader({ potId, engine }: PotHeaderProps) {
  const account = useChainPotAccount();
  const { address } = account;
  const { pot } = usePot(engine, potId);
  const { config } = usePotConfig(engine, potId);
  const title = usePotNames([{ engine, potId }])(engine, potId);
  const member = useMemberState(engine, potId, pot?.currentCycle ?? 0, address);
  const { data: isRegistered } = useIsRegistered(address);
  const { data: canJoin } = useCanJoin(address);
  const join = useContractAction();
  const leave = useContractAction();
  const start = useContractAction();
  const { list: inviteList, onServer, loading: inviteLoading } = useInviteList(engine, potId, pot?.merkleRoot);
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(
    () => {
      if (!inviteList || typeof window === 'undefined') return undefined;
      // Short link when the server has the list; otherwise the list travels in the link itself.
      return onServer ? `${window.location.origin}${potHref(engine, potId)}` : inviteLink(window.location.origin, engine, potId, inviteList);
    },
    [inviteList, onServer, engine, potId],
  );

  if (!pot) return null;

  const contract = engineContract(engine);
  const isOpen = pot.status === PotStatus.Open;
  const isCreator = sameAddress(address, pot.creator);
  const isFull = pot.memberCount >= pot.expectedMembers;
  const onList = !!address && !!inviteList?.some((a) => sameAddress(a, address));
  const proof = address && inviteList ? proofFor(inviteList, address) : undefined;

  const statusText =
    pot.status === PotStatus.Open ? `Waiting for members (${pot.memberCount} of ${pot.expectedMembers} joined)`
    : pot.status === PotStatus.Active ? `Active · round ${pot.currentCycle} of ${pot.expectedMembers}`
    : 'Completed';

  const copyLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this invite link', shareUrl);
    }
  };

  const handleLeave = () => {
    if (!window.confirm('Leave this pot? Leaving lowers your reputation slightly, and you must wait 24 hours to rejoin.')) return;
    leave.write({ ...contract, functionName: 'leavePot', args: [potId] });
  };

  // ---- Join call-to-action, in the order a new member hits each requirement ----
  let joinCta: React.ReactNode = null;
  if (isOpen && !member.isMember) {
    const btn = buttonClass('primary', 'lg');
    if (!address) joinCta = <AccountAccessButton size="lg">Sign in to join</AccountAccessButton>;
    else if (isFull) joinCta = <p className="text-sm font-medium text-cp-muted">This circle is full.</p>;
    else if (!inviteList) joinCta = <p className="text-sm font-medium text-cp-muted">{inviteLoading ? 'Checking the invite list…' : 'Open the invite link the creator shared with you to join.'}</p>;
    else if (!onList || !proof) joinCta = <p className="text-sm font-bold text-cp-danger">This account isn&apos;t on the invite list. Ask the person who invited you to add it.</p>;
    else if (isRegistered === true && canJoin === false) joinCta = <p className="text-sm font-bold text-cp-danger">Your account can&apos;t join pots right now (reputation too low or blacklisted).</p>;
    else {
      // First-time users are registered in the same action (one sponsored operation with a smart account).
      const joinCall = contractCall({ ...contract, functionName: 'joinPot', args: [potId, proof] });
      const handleJoin = () => join.writeBatch(isRegistered === false ? [registerMemberCall(), joinCall] : [joinCall]);
      joinCta = (
        <button onClick={handleJoin} disabled={join.isBusy || isRegistered === undefined} className={btn}>
          {join.isPending ? 'Confirming…' : join.isConfirming ? 'Joining…' : 'Join the circle'}
        </button>
      );
    }
  }

  const errorMessage = join.errorMessage ?? leave.errorMessage ?? start.errorMessage;

  const invited = isOpen && !member.isMember;
  const cadence = config ? `every ${formatDuration(config.cycleDuration)}` : '';
  const share = async () => {
    if (!shareUrl) return;
    const text = `Join my ChainPot circle "${title.name}"`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: text, text, url: shareUrl });
        return;
      } catch {
        // cancelled or unsupported target — fall back to copying
      }
    }
    await copyLink();
  };

  return (
    <section className="mb-8 text-cp-ink" id="invite">
      <Link href="/dashboard" className="inline-flex items-center min-h-11 text-sm font-bold text-cp-muted hover:text-cp-ink rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent">
        ← My circles
      </Link>
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4 mt-2 mb-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-black"><span aria-hidden="true">{title.emoji}</span> {title.name}</h1>
          <p className="text-cp-muted mt-1">
            {title.custom ? `${engineLabel(engine)} #${potId} · ` : ''}Started by {isCreator ? 'you' : shortAddress(pot.creator)}
          </p>
        </div>
        <div className="flex gap-3 flex-wrap items-center">
          {!invited && joinCta}
          {isOpen && member.isMember && !isCreator && (
            <Button variant="secondary" onClick={handleLeave} disabled={leave.isBusy}>{leave.isBusy ? 'Leaving…' : 'Leave'}</Button>
          )}
          {isCreator && isOpen && (
            <Button
              onClick={() => start.write({ ...contract, functionName: 'startPot', args: [potId] })}
              disabled={!isFull || start.isBusy}
              title={isFull ? undefined : 'Everyone on the invite list must join first'}
            >
              {start.isPending ? 'Confirming…' : start.isConfirming ? 'Starting…' : isFull ? 'Start the circle' : `Start (${pot.memberCount}/${pot.expectedMembers} joined)`}
            </Button>
          )}
        </div>
      </div>

      {invited && (
        <Card className="p-6 mb-6 border-cp-accent">
          <p className="text-sm font-bold text-cp-accent">You&apos;re invited</p>
          <p className="text-xl font-bold mt-1">
            {pot.expectedMembers} people each put in <Money usdc={pot.amountPerCycle} /> {cadence}. Each round one person receives <Money usdc={pot.amountPerCycle * BigInt(pot.expectedMembers)} />
            {engine === 'auction' ? ' — or less, if they bid to get it early' : ', picked by a fair draw'}.
          </p>
          <p className="text-sm text-cp-muted mt-2">You&apos;ll pay every round until everyone has received once. Missing a payment means losing your place.</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">{joinCta}</div>
        </Card>
      )}

      {errorMessage && <p role="alert" className="mb-4 text-sm font-bold text-cp-danger">{errorMessage}</p>}

      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <StatusPill tone={pot.status === PotStatus.Active ? 'success' : pot.status === PotStatus.Open ? 'warn' : 'neutral'}>{statusText}</StatusPill>
            {member.isMember && <StatusPill tone="accent">You&apos;re a member</StatusPill>}
          </div>
          {isOpen && shareUrl && member.isMember && (
            <Button variant="secondary" onClick={share}>
              <Share2 className="h-4 w-4" aria-hidden="true" /> {copied ? 'Link copied ✓' : 'Invite people'}
            </Button>
          )}
        </div>
        {isOpen && isCreator && !shareUrl && (
          <p className="mt-3 text-xs text-cp-muted">
            The invite list isn&apos;t available on this device yet, so the invite link can&apos;t be made here. Open the circle on the device you created it on.
          </p>
        )}
      </Card>
    </section>
  );
}
