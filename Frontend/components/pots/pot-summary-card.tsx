'use client';

import { Money } from '@/components/money';
import { useChainPotAccount } from '@/lib/aa/account';
import Link from 'next/link';
import { useReadContract } from 'wagmi';
import { engineContract, usePot, usePotConfig } from '@/hooks/useRoscaEngine';
import { PotStatus, engineLabel, formatDuration, potHref, sameAddress, shortAddress, type Engine } from '@/lib/pot';


const STATUS = {
  [PotStatus.None]: 'Unknown',
  [PotStatus.Open]: 'Open to join',
  [PotStatus.Active]: 'Active',
  [PotStatus.Completed]: 'Completed',
} as const;

interface PotSummaryCardProps {
  potId: number | bigint;
  engine: Engine;
  isDarkMode: boolean;
  /** Only render if the connected wallet is a member. */
  membersOnly?: boolean;
}

/** One pot card, shared by the pots grid and the dashboard lists. */
export function PotSummaryCard({ potId, engine, isDarkMode, membersOnly }: PotSummaryCardProps) {
  const { address } = useChainPotAccount();
  const { pot, isLoading } = usePot(engine, potId);
  const { config } = usePotConfig(engine, potId);
  const { data: isMember } = useReadContract({
    ...engineContract(engine),
    functionName: 'isMember',
    args: address ? [BigInt(potId), address] : undefined,
    query: { enabled: !!address },
  });

  if (membersOnly && !isMember) return null;
  if (isLoading || !pot) {
    return membersOnly ? null : (
      <div className={`p-6 rounded-3xl border-3 border-cp-line animate-pulse bg-cp-surface text-cp-ink`}>
        <div className="h-6 w-2/3 bg-black/20 rounded mb-4" />
        <div className="h-10 w-full bg-black/10 rounded" />
      </div>
    );
  }

  const muted = 'text-cp-muted';
  const progress =
    pot.status === PotStatus.Open ? `${pot.memberCount} of ${pot.expectedMembers} joined`
    : pot.status === PotStatus.Active ? `Round ${pot.currentCycle} of ${pot.expectedMembers}`
    : `${pot.completedCycles} rounds done`;

  return (
    <Link href={potHref(engine, potId)} className="block">
      <div className={`p-6 rounded-3xl border-3 border-cp-line transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 h-full ${isDarkMode ? 'bg-white/5 text-white' : 'bg-white/90 text-black'}`}>
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-xl font-bold">{engine === 'circle' ? '🎲' : '🏦'} Pot #{String(potId)}</h3>
            <p className={`text-sm ${muted}`}>{engineLabel(engine)} · by {sameAddress(pot.creator, address) ? 'you' : shortAddress(pot.creator)}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap ${
            pot.status === PotStatus.Active ? 'bg-cp-success-soft text-cp-success'
            : pot.status === PotStatus.Open ? 'bg-cp-warn-soft text-cp-warn'
            : 'bg-cp-line-soft text-cp-muted'}`}>
            {STATUS[pot.status]}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-4 py-4 border-t border-black/10 text-sm">
          <div><p className={muted}>Each pays</p><p className="font-bold"><Money usdc={pot.amountPerCycle} /></p></div>
          <div><p className={muted}>Pot per round</p><p className="font-bold"><Money usdc={pot.amountPerCycle * BigInt(pot.expectedMembers)} /></p></div>
          <div><p className={muted}>Every</p><p className="font-bold">{config ? formatDuration(config.cycleDuration) : '—'}</p></div>
          <div><p className={muted}>Progress</p><p className="font-bold">{progress}</p></div>
        </div>
        {isMember && <p className="text-xs font-bold text-cp-success">You&apos;re a member</p>}
      </div>
    </Link>
  );
}
