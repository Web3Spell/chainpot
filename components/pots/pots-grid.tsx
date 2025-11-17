'use client';

import Link from 'next/link';
import { PotCard } from './pot-card';
import { useGetCurrentPotCount, useGetPotInfo, useGetPotMemberCount } from '@/hooks/useAuctionEngine';

interface PotsGridProps {
  isDarkMode: boolean;
}

/* Small inline skeleton card */
const SkeletonCard = ({ isDarkMode }: { isDarkMode: boolean }) => (
  <div
    className={`p-6 rounded-2xl border-3 border-black animate-pulse ${
      isDarkMode ? 'bg-white/5' : 'bg-white/80'
    }`}
  >
    <div className="h-6 w-2/3 bg-white/20 rounded mb-4" />
    <div className="h-4 w-1/2 bg-white/10 rounded mb-6" />
    <div className="h-10 w-full bg-white/10 rounded" />
  </div>
);

function getField<T = any>(pot: any, index: number, fieldName?: string): T | undefined {
  if (!pot) return undefined;
  // If pot is array-like (tuple) use index
  if (Array.isArray(pot) && pot.length > index) {
    return pot[index] as T;
  }
  // If pot is object with named fields, return that
  if (fieldName && typeof pot === 'object') {
    // Some generated types include the named key, try it
    if (fieldName in pot) return pot[fieldName] as T;
    // Some resp may map names differently; try common fallback
    return (pot as any)[index] as T;
  }
  return undefined;
}

function bigIntToNumberSafe(value: any, fallback = 0): number {
  try {
    if (typeof value === 'bigint') return Number(value);
    if (typeof value === 'number') return value;
    if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
    // ethers BigNumber-ish: try value.toNumber if exists
    if (value && typeof value.toNumber === 'function') return value.toNumber();
  } catch (e) {
    // ignore
  }
  return fallback;
}

function bigIntToStringSafe(value: any): string {
  try {
    if (typeof value === 'bigint') return value.toString();
    if (typeof value === 'number') return String(value);
    if (typeof value === 'string') return value;
    if (value && typeof value.toString === 'function') return value.toString();
  } catch (e) {
    // ignore
  }
  return '0';
}

/* Inline wrapper used inside grid to fetch data per-pot */
function PotItem({ id, isDarkMode }: { id: number; isDarkMode: boolean }) {
  const pid = BigInt(id);

  const { data: pot, isLoading: isPotLoading } = useGetPotInfo(pid);
  // optional member count hook - better than deriving from pot.members (which might be addresses)
  const { data: membersCount, isLoading: isMembersLoading } = useGetPotMemberCount(pid);

  const loading = isPotLoading || isMembersLoading;
  if (loading || !pot) return <SkeletonCard isDarkMode={isDarkMode} />;

  // Extract fields defensively from tuple or object
  const name = getField<string>(pot, 0, 'name') ?? `Pot #${id}`;
  const creator = getField<string>(pot, 1, 'creator') ?? '';
  const amountPerCycleRaw = getField<any>(pot, 2, 'amountPerCycle');
  const cycleCountRaw = getField<any>(pot, 4, 'cycleCount');
  const completedCyclesRaw = getField<any>(pot, 5, 'completedCycles');
  const frequencyRaw = getField<any>(pot, 6, 'frequency');
  const statusRaw = getField<any>(pot, 8, 'status');
  const membersRaw = getField<any>(pot, 9, 'members');

  // Participants: prefer explicit hook, otherwise infer from members array
  const participants =
    typeof membersCount === 'bigint' || typeof membersCount === 'number'
      ? Number(membersCount)
      : Array.isArray(membersRaw)
      ? membersRaw.length
      : 0;

  // Compute totalAmount = amountPerCycle * cycleCount
  // We will try to safely handle BigInt/BigNumber/number types
  const amountPerCycleNum = bigIntToNumberSafe(amountPerCycleRaw, 0);
  const cycleCountNum = bigIntToNumberSafe(cycleCountRaw, 0);
  const totalAmountNumber = amountPerCycleNum * cycleCountNum;

  // Format total amount - this is naive (no decimals) but safe; replace with token-decimal aware formatter if needed
  const totalAmount = `$${Number.isFinite(totalAmountNumber) ? totalAmountNumber.toLocaleString() : bigIntToStringSafe(amountPerCycleRaw)}`;

  const frequency = typeof frequencyRaw === 'number'
    ? frequencyRaw === 0 ? 'Weekly' : frequencyRaw === 1 ? 'Biweekly' : 'Monthly'
    : String(frequencyRaw ?? 'Unknown');

  // Status mapping: if numeric enum, map to human readable; otherwise just string
  const status =
    typeof statusRaw === 'number'
      ? statusRaw === 0 ? 'Active' : statusRaw === 1 ? 'Paused' : String(statusRaw)
      : String(statusRaw ?? 'Active');

  const cyclesComplete = bigIntToNumberSafe(completedCyclesRaw, 0);

  const potDisplay = {
    id,
    name,
    description: `By ${String(creator).slice(0, 6)}...`,
    totalAmount,
    participants,
    yieldRate: '—',
    frequency,
    status,
    cyclesComplete,
  };

  return <PotCard pot={potDisplay} isDarkMode={isDarkMode} />;
}

export function PotsGrid({ isDarkMode }: PotsGridProps) {
  const { data: potCountRaw, isLoading, isError, refetch } = useGetCurrentPotCount();

  const potCount = (() => {
    if (potCountRaw === undefined || potCountRaw === null) return 0;
    if (typeof potCountRaw === 'bigint') return Number(potCountRaw);
    if (typeof potCountRaw === 'number') return potCountRaw;
    // try to coerce
    try {
      return Number(potCountRaw);
    } catch {
      return 0;
    }
  })();

  // Protect from rendering an enormous number
  const MAX_RENDER = 100;
  const renderCount = Math.min(potCount, MAX_RENDER);

  if (isLoading) {
    return (
      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} isDarkMode={isDarkMode} />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section>
        <div className="text-red-400">
          Failed to load pots. <button onClick={() => refetch?.()}>Retry</button>
        </div>
      </section>
    );
  }

  if (renderCount === 0) {
    return (
      <section>
        <div className="text-white/70">No pots found on-chain.</div>
      </section>
    );
  }

  // Build pot IDs (assume 1..potCount)
  const potIds = Array.from({ length: renderCount }, (_, i) => i + 1);

  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {potIds.map((id) => (
          <Link key={id} href={`/pots/${id}`}>
            <PotItem id={id} isDarkMode={isDarkMode} />
          </Link>
        ))}
      </div>
    </section>
  );
}
