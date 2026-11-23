'use client';

import { Money } from '@/components/money';
import { useChainPotAccount } from '@/lib/aa/account';
import { useCycle, usePot } from '@/hooks/useRoscaEngine';
import { useAuctionBids } from '@/hooks/useAuctionEngine';
import { useNow } from '@/hooks/useNow';
import { CycleStatus, ZERO_ADDRESS, cyclePhase, formatDateTime, sameAddress, shortAddress, type Engine } from '@/lib/pot';

interface CurrentCycleProps {
  potId: bigint;
  engine: Engine;
  isDarkMode: boolean;
}


const PHASE_LABEL = {
  none: 'Not started',
  payment: 'Collecting payments',
  bidding: 'Bidding open',
  readyToClose: 'Waiting to pick the receiver',
  drawing: 'Drawing the receiver',
  completed: 'Completed',
} as const;

export function CurrentCycle({ potId, engine }: CurrentCycleProps) {
  const { address } = useChainPotAccount();
  const now = useNow(30_000);
  const { pot } = usePot(engine, potId);
  const idx = pot?.currentCycle ?? 0;
  const { cycle, isLoading } = useCycle(engine, potId, idx);
  const bids = useAuctionBids(potId, idx, address, engine === 'auction');

  if (!pot || idx === 0) return null;
  if (isLoading || !cycle) {
    return <section className="mb-8"><div className={`h-40 rounded-2xl animate-pulse bg-cp-surface text-cp-ink`} /></section>;
  }

  const muted = 'text-cp-muted';
  const phase = cyclePhase(engine, cycle, now);
  const hasWinner = cycle.status === CycleStatus.Completed && cycle.winner !== ZERO_ADDRESS;
  // Auction winners receive their bid; VRF/no-bid winners receive the full collected amount (before interest).
  const payout = engine === 'auction' && hasWinner && bids.hasLowest && sameAddress(bids.lowestBidder, cycle.winner)
    ? bids.lowestBid
    : cycle.totalCollected;

  const elapsed = cycle.paymentDeadline > cycle.startTime
    ? Math.min(100, Math.max(0, Math.floor(((now - cycle.startTime) / (cycle.paymentDeadline - cycle.startTime)) * 100)))
    : 0;

  const rows: [string, React.ReactNode][] = [
    ['Status', PHASE_LABEL[phase]],
    ['Started', formatDateTime(cycle.startTime)],
    ['Payments close', formatDateTime(cycle.paymentDeadline)],
    ...(engine === 'auction' ? [['Bidding closes', formatDateTime(cycle.biddingDeadline)] as [string, React.ReactNode]] : []),
    ['Paid so far', <>{cycle.paidCount} of {pot.memberCount} · <Money usdc={cycle.totalCollected} /></>],
  ];

  return (
    <section className="mb-8">
      <h2 className={`text-3xl font-bold mb-6 text-cp-ink`}>Round {idx} of {pot.expectedMembers}</h2>
      <div className={`p-8 rounded-3xl border-3 border-cp-line bg-cp-surface text-cp-ink`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="space-y-3">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <span className={muted}>{k}</span>
                <span className="font-bold text-right">{v}</span>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <div className="flex justify-between gap-4">
              <span className={muted}>Receiver</span>
              <span className="font-bold text-cp-success">
                {hasWinner ? (sameAddress(cycle.winner, address) ? 'You 🎉' : shortAddress(cycle.winner)) : cycle.status === CycleStatus.Completed ? 'No eligible receiver (refunded)' : 'Not picked yet'}
              </span>
            </div>
            {hasWinner && (
              <div className="flex justify-between gap-4">
                <span className={muted}>Payout (before interest)</span>
                <span className="font-bold"><Money usdc={payout} /></span>
              </div>
            )}
            {engine === 'auction' && !hasWinner && (
              <div className="flex justify-between gap-4">
                <span className={muted}>Lowest bid</span>
                <span className="font-bold text-cp-warn">{bids.hasLowest ? <><Money usdc={bids.lowestBid} /> by {sameAddress(bids.lowestBidder, address) ? 'you' : shortAddress(bids.lowestBidder)}</> : 'None yet'}</span>
              </div>
            )}
          </div>
        </div>

        {phase === 'payment' && (
          <div>
            <p className="text-sm font-medium mb-2 text-gray-500">Payment window</p>
            <div className="h-3 rounded-full overflow-hidden bg-black/10">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300" style={{ width: `${elapsed}%` }} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
