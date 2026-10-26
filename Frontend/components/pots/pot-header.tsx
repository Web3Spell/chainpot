'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import { engineContract, useMemberState, usePot } from '@/hooks/useRoscaEngine';
import { useCanJoin, useIsRegistered, useRegisterMember } from '@/hooks/useMemberRegistry';
import { useContractAction } from '@/hooks/useContractAction';
import { fetchInvite, inviteLink, inviteRoot, loadInvite, proofFor, publishInvite, readInviteFromHash, saveInvite } from '@/lib/invite';
import { PotStatus, engineLabel, potHref, sameAddress, shortAddress, type Engine } from '@/lib/pot';

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

export function PotHeader({ potId, engine, isDarkMode }: PotHeaderProps) {
  const { address } = useAccount();
  const { pot } = usePot(engine, potId);
  const member = useMemberState(engine, potId, pot?.currentCycle ?? 0, address);
  const { data: isRegistered } = useIsRegistered(address);
  const { data: canJoin } = useCanJoin(address);
  const register = useRegisterMember();
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
  const muted = isDarkMode ? 'text-gray-400' : 'text-gray-600';

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
    const btn = `px-6 py-3 rounded-full font-bold transition-all duration-300 disabled:opacity-50 ${isDarkMode ? 'bg-white text-black hover:bg-white/90' : 'bg-black text-white hover:bg-black/90'}`;
    if (!address) joinCta = <p className={`text-sm font-medium ${muted}`}>Connect your wallet to join.</p>;
    else if (isFull) joinCta = <p className={`text-sm font-medium ${muted}`}>This pot is full.</p>;
    else if (!inviteList) joinCta = <p className={`text-sm font-medium ${muted}`}>{inviteLoading ? 'Checking the invite list…' : 'Open the invite link the creator shared with you to join.'}</p>;
    else if (!onList || !proof) joinCta = <p className="text-sm font-medium text-red-500">Your connected address isn&apos;t on this pot&apos;s invite list.</p>;
    else if (isRegistered === false) {
      joinCta = (
        <button onClick={register.registerMember} disabled={register.isBusy} className={btn}>
          {register.isPending ? 'Confirm in wallet…' : register.isConfirming ? 'Registering…' : 'Step 1 of 2: Register account'}
        </button>
      );
    } else if (canJoin === false) joinCta = <p className="text-sm font-medium text-red-500">Your account can&apos;t join pots right now (reputation too low or blacklisted).</p>;
    else {
      joinCta = (
        <button onClick={() => join.write({ ...contract, functionName: 'joinPot', args: [potId, proof] })} disabled={join.isBusy} className={btn}>
          {join.isPending ? 'Confirm in wallet…' : join.isConfirming ? 'Joining…' : 'Join Pot'}
        </button>
      );
    }
  }

  const errorMessage = join.errorMessage ?? register.errorMessage ?? leave.errorMessage ?? start.errorMessage;

  return (
    <section className="mb-8">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
        <div>
          <Link href="/pots" className={`text-sm font-bold mb-4 inline-block transition-opacity ${isDarkMode ? 'text-white/60 hover:text-white' : 'text-black/60 hover:text-black'}`}>← Back to Pots</Link>
          <h1 className="text-5xl font-black mb-2">Pot #{potId.toString()}</h1>
          <p className={`text-lg ${muted}`}>
            {engine === 'circle' ? '🎲' : '🏦'} {engineLabel(engine)} · Created by {isCreator ? 'you' : shortAddress(pot.creator)}
          </p>
        </div>

        <div className="flex gap-3 flex-wrap items-center">
          {joinCta}

          {isOpen && member.isMember && !isCreator && (
            <button onClick={handleLeave} disabled={leave.isBusy} className={`px-6 py-3 rounded-full font-bold border-3 disabled:opacity-50 ${isDarkMode ? 'border-white/30 text-white' : 'border-black text-black'}`}>
              {leave.isBusy ? 'Leaving…' : 'Leave Pot'}
            </button>
          )}

          {isCreator && isOpen && (
            <button
              onClick={() => start.write({ ...contract, functionName: 'startPot', args: [potId] })}
              disabled={!isFull || start.isBusy}
              title={isFull ? undefined : 'Everyone on the invite list must join first'}
              className={`px-6 py-3 rounded-full font-bold border-3 transition-all duration-300 disabled:opacity-50 ${isDarkMode ? 'border-white/30 text-white hover:bg-white/10' : 'border-black text-black hover:bg-black/10'}`}
            >
              {start.isPending ? 'Confirm in wallet…' : start.isConfirming ? 'Starting…' : isFull ? 'Start Pot' : `Start Pot (${pot.memberCount}/${pot.expectedMembers} joined)`}
            </button>
          )}
        </div>
      </div>

      {errorMessage && <p className="mb-4 text-sm font-medium text-red-500">{errorMessage}</p>}

      <div className={`p-4 rounded-xl border-2 border-black ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${pot.status === PotStatus.Active ? 'bg-green-500' : pot.status === PotStatus.Open ? 'bg-yellow-500' : 'bg-gray-400'}`} />
            <span className="font-bold">{statusText}</span>
            {member.isMember && <span className="ml-2 text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-600 font-bold">You&apos;re a member</span>}
          </div>
          {isOpen && shareUrl && (
            <button onClick={copyLink} className="text-sm font-bold underline">
              {copied ? 'Invite link copied ✓' : 'Copy invite link'}
            </button>
          )}
        </div>
        {isOpen && isCreator && !shareUrl && (
          <p className={`mt-3 text-xs ${muted}`}>
            The invite list for this pot isn&apos;t saved in this browser, so the invite link can&apos;t be generated here. Open the pot from the browser you created it in.
          </p>
        )}
      </div>
    </section>
  );
}
