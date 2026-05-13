// components/MyActivities.tsx
'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { useAccount } from 'wagmi';
import {
  useGetUserPots,
  useGetPotInfo,
  useGetPotMemberCount,
} from '@/hooks/useAuctionEngine';
import { useUSDCDecimals } from '@/hooks/useUsdc';
import { useUserActivityEvents } from '@/hooks/useUserActivityEvents';

interface MyActivitiesProps {
  isDarkMode: boolean;
}

/* ---------- Helpers (defensive) ---------- */
function getField(obj: any, idx: number, key?: string) {
  if (!obj) return undefined;
  if (Array.isArray(obj) && obj.length > idx) return obj[idx];
  if (key && typeof obj === 'object' && key in obj) return obj[key];
  return undefined;
}
function toBigIntSafe(v: any) {
  try {
    if (typeof v === 'bigint') return v;
    if (typeof v === 'number') return BigInt(Math.floor(v));
    if (v && typeof v.toString === 'function') {
      const s = v.toString();
      if (/^-?\d+$/.test(s)) return BigInt(s);
    }
  } catch {}
  return BigInt(0);
}
function formatTokenSmallest(amountSmallest: bigint, decimals = 6) {
  try {
    const factor = BigInt(10) ** BigInt(decimals);
    const whole = amountSmallest / factor;
    const frac = amountSmallest % factor;
    if (frac === BigInt(0)) return `$${whole.toString()}`;
    const scaled = (frac * BigInt(100)) / factor;
    const fracStr = String(scaled).padStart(2, '0').replace(/0+$/, '');
    return `$${whole.toString()}${fracStr ? '.' + fracStr : ''}`;
  } catch {
    return '$0';
  }
}
function shorten(addr?: string) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

/* ---------- Component ---------- */
export function MyActivities({ isDarkMode }: MyActivitiesProps) {
  const { address } = useAccount();
  const userAddress = (address as `0x${string}`) ?? undefined;

  // user's pots (ids)
  const { data: userPots, isLoading: isUserPotsLoading } = useGetUserPots(
    userAddress ?? ('0x0000000000000000000000000000000000000000' as `0x${string}`)
  );

  // limit how many pots we'll fetch details for
  const MAX_POTS = 12;
  const normalizedPotIds: bigint[] = useMemo(() => {
    if (!Array.isArray(userPots)) return [];
    return userPots
      .map((p: any) => {
        try { return typeof p === 'bigint' ? p : BigInt(p); } catch { return BigInt(0); }
      })
      .filter((b: bigint) => b > BigInt(0))
      .slice(0, MAX_POTS);
  }, [userPots]);

  // stable pot info hooks
  const potInfoQueries = new Array(MAX_POTS).fill(null).map((_, idx) => {
    const id = normalizedPotIds[idx] ?? BigInt(0);
    return useGetPotInfo(id);
  });

  const memberCountQueries = new Array(MAX_POTS).fill(null).map((_, idx) => {
    const id = normalizedPotIds[idx] ?? BigInt(0);
    return useGetPotMemberCount(id);
  });

  // user events (JoinedPot, LeftPot, MemberPaidForCycle, BidPlaced, ParticipationUpdated)
  const { events = [], isLoading: isEventsLoading } = useUserActivityEvents(userAddress ?? ('0x0000000000000000000000000000000000000000' as `0x${string}`));

  // usdc decimals (for formatting contributions)
  const { data: usdcDecimalsData } = useUSDCDecimals?.();
  const decimals = typeof usdcDecimalsData === 'number' ? usdcDecimalsData : 6;

  const isLoading = isUserPotsLoading || isEventsLoading || potInfoQueries.slice(0, normalizedPotIds.length).some(q => q.isLoading) || memberCountQueries.slice(0, normalizedPotIds.length).some(q => q.isLoading);

  // Process events into categories
  const { joinRequests, contributions } = useMemo(() => {
    // joinRequests: JoinedPot events where user is the subject OR LeftPot cancellations
    // contributions: MemberPaidForCycle or ParticipationUpdated with contribution amount

    const jr: Array<{
      potId: string;
      potName?: string;
      timestamp?: number;
      status: 'joined' | 'left' | 'pending';
      txInfo?: any;
    }> = [];

    const contribs: Array<{
      potId: string;
      potName?: string;
      amountSmallest: bigint;
      cycleId?: string;
      timestamp?: number;
      txInfo?: any;
    }> = [];

    (events || []).forEach((ev: any) => {
      const name: string = ev.name ?? ev.event ?? '';
      const args: any = ev.args ?? ev.arguments ?? {};
      const ts = ev.timestamp ? Number(ev.timestamp) : ev.blockTimestamp ? Number(ev.blockTimestamp) : undefined;

      // JoinedPot(address user, uint256 potId)
      if (name === 'JoinedPot') {
        const potIdRaw = Array.isArray(args) ? args[1] : args.potId ?? args[1];
        const potId = potIdRaw ? String(potIdRaw.toString()) : '0';
        jr.push({ potId, potName: undefined, timestamp: ts, status: 'joined', txInfo: ev });
      }

      // LeftPot(address user, uint256 potId)
      if (name === 'LeftPot') {
        const potIdRaw = Array.isArray(args) ? args[1] : args.potId ?? args[1];
        const potId = potIdRaw ? String(potIdRaw.toString()) : '0';
        jr.push({ potId, potName: undefined, timestamp: ts, status: 'left', txInfo: ev });
      }

      // MemberPaidForCycle(uint256 potId, uint256 cycleId, address member, uint256 amount)
      // In AuctionEngine ABI it is MemberPaidForCycle with inputs (potId, cycleId, member, amount)
      if (name === 'MemberPaidForCycle' || name === 'ParticipationUpdated') {
        // Support both array args and named args
        // For ParticipationUpdated event from MemberAccountManager: (user, potId, cycleId, contribution)
        let potIdRaw, amountRaw, cycleIdRaw;
        if (Array.isArray(args)) {
          // try to find numbers in args
          // ParticipationUpdated (user (0), potId (1), cycleId (2), contribution (3))
          if (name === 'ParticipationUpdated') {
            potIdRaw = args[1];
            cycleIdRaw = args[2];
            amountRaw = args[3];
          } else {
            // MemberPaidForCycle (potId (0), cycleId (1), member (2), amount (3))
            potIdRaw = args[0];
            cycleIdRaw = args[1];
            amountRaw = args[3];
          }
        } else {
          // named fields
          potIdRaw = args.potId ?? args[0];
          cycleIdRaw = args.cycleId ?? args[1];
          amountRaw = args.amount ?? args.contribution ?? args[3];
        }

        const potId = potIdRaw ? String(potIdRaw.toString()) : '0';
        const amountSmallest = toBigIntSafe(amountRaw ?? 0);
        contribs.push({
          potId,
          potName: undefined,
          amountSmallest,
          cycleId: cycleIdRaw ? String(cycleIdRaw.toString()) : undefined,
          timestamp: ts,
          txInfo: ev,
        });
      }

      // BidPlaced (cycleId, bidder, amount)
      if (name === 'BidPlaced' || name === 'BidUpdated') {
        // treat bids as activity but not contributions
        // we can add to contributions as zero-amount event or track separately if desired
        // skipping to keep lists concise
      }
    });

    // sort descending by timestamp (newest first)
    jr.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    contribs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

    return { joinRequests: jr, contributions: contribs };
  }, [events]);

  // Enrich pot name for items by matching potInfo queries
  const enrichWithPotNames = (items: any[]) => {
    return items.map((it) => {
      const potIndex = Number(it.potId) - 1;
      const potQ = potInfoQueries[potIndex];
      const potName = potQ?.data ? String(getField(potQ.data, 0, 'name') ?? `Pot #${it.potId}`) : undefined;
      return { ...it, potName };
    });
  };

  const joinRequestsEnriched = useMemo(() => enrichWithPotNames(joinRequests), [joinRequests, potInfoQueries]);
  const contributionsEnriched = useMemo(() => enrichWithPotNames(contributions), [contributions, potInfoQueries]);

  // Show skeleton while loading
  if (isLoading) {
    return (
      <section className="py-12 space-y-6 pb-16">
        <div className="space-y-2">
          <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>My Activities</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors space-y-4 animate-pulse ${
            isDarkMode ? 'text-white bg-white/5' : 'bg-white border-black text-black hover:bg-black/5'
          }`}>
            <div className="h-6 bg-white/10 rounded w-48" />
            <div className="h-3 bg-white/10 rounded w-32" />
            <div className="h-20 bg-white/10 rounded" />
          </div>

          <div className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors space-y-4 animate-pulse ${
            isDarkMode ? 'text-white bg-white/5' : 'bg-white border-black text-black hover:bg-black/5'
          }`}>
            <div className="h-6 bg-white/10 rounded w-48" />
            <div className="h-3 bg-white/10 rounded w-32" />
            <div className="h-20 bg-white/10 rounded" />
          </div>
        </div>
      </section>
    );
  }

  // Final UI render
  return (
    <section className="py-12 space-y-6 pb-16">
      <div className="space-y-2">
        <h2 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>My Activities</h2>
        <p className={isDarkMode ? 'text-white/60' : 'text-black/60'}>Recent on-chain activity from your account</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* My Join Requests / Joins */}
        <div className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors space-y-4 ${
            isDarkMode ? 'text-white bg-white/5' : 'bg-white border-black text-black hover:bg-black/5'
          }`}>
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>My Join Activity</h3>
          <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>Recent join/leave events</p>

          <div className="space-y-3 mt-4">
            {joinRequestsEnriched.length === 0 && (
              <div className={isDarkMode ? 'text-white/70' : 'text-black/70'}>No join activity found.</div>
            )}

            {joinRequestsEnriched.map((jr) => (
              <div key={`${jr.potId}-${jr.timestamp}-${jr.status}`} className="p-3 rounded-lg border border-white/6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">{jr.potName ?? `Pot #${jr.potId}`}</div>
                    <div className={`text-xs ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>
                      {jr.status === 'joined' ? 'Joined' : jr.status === 'left' ? 'Left' : 'Pending'}
                    </div>
                    {jr.timestamp && (
                      <div className="text-xs mt-1 text-white/40">{new Date((jr.timestamp as number) * 1000).toLocaleString()}</div>
                    )}
                  </div>
                  <div className="text-right">
                    <Link href={`/pots/${jr.potId}`}>
                      <button className={`px-3 py-2 rounded-full text-xs font-semibold ${
                        isDarkMode ? 'bg-white text-black' : 'bg-black text-white'
                      }`}>
                        View Pot
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* My Contributions */}
        <div className={`border-3 border-black rounded-3xl p-6 backdrop-blur transition-colors space-y-4 ${
            isDarkMode ? 'text-white bg-white/5' : 'bg-white border-black text-black hover:bg-black/5'
          }`}>
          <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>My Contributions</h3>
          <p className={`text-sm ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>On-chain payments and participation</p>

          <div className="space-y-3 mt-4">
            {contributionsEnriched.length === 0 && (
              <div className={isDarkMode ? 'text-white/70' : 'text-black/70'}>No contributions found yet.</div>
            )}

            {contributionsEnriched.map((c) => (
              <div key={`${c.potId}-${c.cycleId ?? '0'}-${c.timestamp || 0}`} className="p-3 rounded-lg border border-white/6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-sm font-semibold">{c.potName ?? `Pot #${c.potId}`}</div>
                    <div className={`text-xs ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>
                      Cycle {c.cycleId ?? '—'} • {formatTokenSmallest(c.amountSmallest ?? BigInt(0), decimals)}
                    </div>
                    {c.timestamp && (
                      <div className="text-xs mt-1 text-white/40">{new Date((c.timestamp as number) * 1000).toLocaleString()}</div>
                    )}
                  </div>

                  <div className="text-right">
                    <Link href={`/pots/${c.potId}`}>
                      <button className={`px-3 py-2 rounded-full text-xs font-semibold ${
                        isDarkMode ? 'bg-white text-black' : 'bg-black text-white'
                      }`}>
                        View Pot
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
