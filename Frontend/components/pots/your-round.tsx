'use client';

import { useChainPotAccount } from '@/lib/aa/account';
import { NETWORK } from '@/config/network';
import { useState } from 'react';
import { formatUnits, parseUnits } from 'viem';
import { engineContract, useCycle, useMemberState, usePot } from '@/hooks/useRoscaEngine';
import { auctionContract, useAuctionBids } from '@/hooks/useAuctionEngine';
import { usdcApproveCall, useUSDCAllowance, useUSDCBalance } from '@/hooks/useUsdc';
import { contractCall, useContractAction } from '@/hooks/useContractAction';
import { Money } from '@/components/money';
import { Button } from '@/components/ui/button';
import { useNow } from '@/hooks/useNow';
import { CONTRACT_CONFIG } from '@/config/hooksConf';
import { CountdownTimer } from './countdown-timer';
import { memberAction } from '@/lib/potState';
import { PotStatus, formatDateTime, maxAllowedBid, minBidStep, sameAddress, type Engine } from '@/lib/pot';

interface YourRoundProps {
  potId: bigint;
  engine: Engine;
  isDarkMode: boolean;
}

const USDC_DECIMALS = 6;
const usd = (v: bigint) => `$${Number(formatUnits(v, USDC_DECIMALS)).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
const VAULT = CONTRACT_CONFIG.addresses.vault as `0x${string}`;

/** What the connected member needs to do this round: pay, then (auction) bid. */
export function YourRound({ potId, engine, isDarkMode }: YourRoundProps) {
  const { address } = useChainPotAccount();
  const now = useNow();
  const { pot } = usePot(engine, potId);
  const { cycle } = useCycle(engine, potId, pot?.currentCycle ?? 0);
  const member = useMemberState(engine, potId, pot?.currentCycle ?? 0, address);

  if (!pot || !cycle || !address || !member.isMember || pot.status !== PotStatus.Active) return null;

  const action = memberAction({
    engine, pot, cycle, now,
    viewer: {
      address, isCreator: false, isMember: member.isMember, hasWon: member.hasWon,
      defaulted: member.defaulted, paidThisRound: member.paid,
    },
  });

  const card = `p-8 rounded-3xl border-3 border-cp-line bg-cp-surface text-cp-ink`;
  const muted = 'text-cp-muted';
  const paid = <p className="text-cp-success font-bold mb-2">✓ You&apos;ve paid for this round.</p>;

  let body: React.ReactNode;
  switch (action.kind) {
    case 'defaulted':
      body = <p className="font-medium text-cp-danger">You missed a payment deadline in this pot, so you can no longer pay, bid or receive a payout here.</p>;
      break;
    case 'pay':
      body = <PayStep engine={engine} potId={potId} amount={action.amount} deadline={action.deadline} isDarkMode={isDarkMode} />;
      break;
    case 'missedPayment':
      body = <p className="font-medium text-cp-danger">The payment deadline for this round passed before you paid. You&apos;ll be marked as having missed it.</p>;
      break;
    case 'paidWaitingForBidding':
      body = (
        <div>
          {paid}
          <p className={muted}>Bidding opens when payments close, {formatDateTime(action.opensAt)}.</p>
          <CountdownTimer deadline={action.opensAt} label="Bidding opens in" isDarkMode={isDarkMode} />
        </div>
      );
      break;
    case 'bid':
      body = <BidStep potId={potId} cycleIdx={pot.currentCycle} totalCollected={cycle.totalCollected} deadline={action.closesAt} isDarkMode={isDarkMode} />;
      break;
    case 'received':
      body = <div>{paid}<p className={muted}>You already received this pot&apos;s payout. Keep paying each round so the others get theirs.</p></div>;
      break;
    case 'drawing':
      body = <div>{paid}<p className={muted}>The receiver is being drawn now.</p></div>;
      break;
    case 'paidWaitingForDraw':
      body = <div>{paid}<p className={muted}>Nothing else to do. The receiver is picked after the deadline.</p></div>;
      break;
    default:
      return null; // between rounds: the Next step panel explains when the next round starts
  }

  return (
    <section className="mb-8 scroll-mt-28" id="your-round">
      <h2 className="text-2xl font-bold mb-4">Your round</h2>
      <div className={card}>{body}</div>
    </section>
  );
}

function PayStep({ engine, potId, amount, deadline, isDarkMode }: { engine: Engine; potId: bigint; amount: bigint; deadline: number; isDarkMode: boolean }) {
  const account = useChainPotAccount();
  const { data: balance } = useUSDCBalance(account.address);
  const { data: allowance } = useUSDCAllowance(account.address, VAULT);
  const pay = useContractAction();

  const needsApproval = (allowance ?? BigInt(0)) < amount;
  const insufficient = balance !== undefined && balance < amount;
  const muted = 'text-cp-muted';

  // One tap: exact-amount approval + payment. A smart account sends both as one sponsored operation;
  // an own wallet asks twice.
  const handlePay = () => {
    const payCall = contractCall({ ...engineContract(engine), functionName: 'payForCycle', args: [potId] });
    pay.writeBatch(needsApproval ? [usdcApproveCall(amount), payCall] : [payCall], [{ amount }, { amount }]);
  };

  const label = pay.isPending ? 'Confirming…' : pay.isConfirming ? 'Paying…' : <>Pay <Money usdc={amount} /></>;

  return (
    <div className="flex flex-col md:flex-row gap-6 md:items-center">
      <div className="flex-1">
        <p className="text-xl font-bold">Pay <Money usdc={amount} /> for this round</p>
        <CountdownTimer deadline={deadline} label="Due in" isDarkMode={isDarkMode} />
        <p className={`text-sm mt-2 ${muted}`}>
          Missing the deadline means losing your place in the pot, so pay early.
          {needsApproval && account.mode === 'eoa' && ' Your wallet will ask twice: first to allow exactly this amount, then to pay.'}
        </p>
        {balance !== undefined && <p className={`text-xs mt-1 ${muted}`}>Your balance: <Money usdc={balance} /></p>}
        {insufficient && (
          <p className="text-sm mt-2 font-medium text-cp-danger">
            You need <Money usdc={amount - balance!} /> more.{' '}
            {NETWORK.faucet ? (
              <a href={NETWORK.faucet} target="_blank" rel="noreferrer" className="underline">Get test USDC</a>
            ) : (
              'Add money from your balance card.'
            )}
          </p>
        )}
        {pay.errorMessage && <p className="text-sm mt-2 font-medium text-cp-danger">{pay.errorMessage}</p>}
      </div>
      <button
        onClick={handlePay}
        disabled={pay.isBusy || insufficient}
        className="min-h-12 px-8 rounded-full font-bold bg-cp-ink text-cp-ink-inverse hover:opacity-90 disabled:opacity-50 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent focus-visible:ring-offset-2"
      >
        {label}
      </button>
    </div>
  );
}

function BidStep({ potId, cycleIdx, totalCollected, deadline, isDarkMode }: { potId: bigint; cycleIdx: number; totalCollected: bigint; deadline: number; isDarkMode: boolean }) {
  const { address } = useChainPotAccount();
  const bids = useAuctionBids(potId, cycleIdx, address);
  const place = useContractAction();
  const CENT = BigInt(10_000);

  const youLead = bids.hasLowest && sameAddress(bids.lowestBidder, address);
  // Highest bid this member may place now: 2% under the standing lowest, below the pot, and below their own last bid.
  let max = maxAllowedBid(totalCollected, bids.lowestBid, bids.hasLowest);
  if (bids.hasBid && bids.myBid - BigInt(1) < max) max = bids.myBid - BigInt(1);
  const maxCents = max > BigInt(0) ? max / CENT : BigInt(0);

  // Slider works in whole cents; the input accepts any amount.
  const [cents, setCents] = useState<bigint | null>(null);
  const amount = (cents ?? maxCents) * CENT;
  const othersShare = amount > BigInt(0) && amount < totalCollected ? totalCollected - amount : BigInt(0);
  const discountPct = totalCollected > BigInt(0) ? Number((othersShare * BigInt(1000)) / totalCollected) / 10 : 0;

  let problem: string | undefined;
  if (maxCents <= BigInt(0)) problem = 'There’s no room for a lower bid this round.';
  else if (amount <= BigInt(0)) problem = 'Choose an amount above $0.';
  else if (amount > max) problem = `At most ${usd(max)} — each new bid must be 2% under the current lowest.`;

  const onInput = (v: string) => {
    try {
      setCents(v ? parseUnits(v, USDC_DECIMALS) / CENT : BigInt(0));
    } catch {
      // ignore partial input like "12."
    }
  };

  return (
    <div className="text-cp-ink">
      <div className="flex flex-wrap gap-6 mb-4 text-sm">
        <div><p className="text-cp-muted">Pot this round</p><p className="text-xl font-bold"><Money usdc={totalCollected} /></p></div>
        <div><p className="text-cp-muted">Lowest bid so far</p><p className="text-xl font-bold">{bids.hasLowest ? <Money usdc={bids.lowestBid} /> : 'No bids yet'}</p></div>
        {bids.hasBid && <div><p className="text-cp-muted">Your bid</p><p className="text-xl font-bold"><Money usdc={bids.myBid} />{youLead ? ' · leading' : ''}</p></div>}
      </div>

      {youLead && (
        <p className="font-bold text-cp-success mb-3">You have the lowest bid. If nobody goes lower before bidding closes, you receive <Money usdc={bids.lowestBid} />.</p>
      )}

      {maxCents > BigInt(0) && (
        <div className="p-4 rounded-2xl bg-cp-surface-muted">
          <label htmlFor="bid-slider" className="block text-sm font-bold">How much do you want to receive now?</label>
          <p className="text-4xl font-black mt-1" aria-live="polite"><Money usdc={amount} /></p>
          <input
            id="bid-slider"
            type="range"
            min={1}
            max={Number(maxCents)}
            step={1}
            value={Number(cents ?? maxCents)}
            onChange={(e) => setCents(BigInt(e.target.value))}
            aria-valuetext={usd(amount)}
            className="w-full mt-3 accent-[var(--cp-accent)] min-h-11"
          />
          <div className="flex justify-between text-xs text-cp-muted"><span>Less now</span><span>Up to {usd(max)}</span></div>
          <p className="text-sm mt-3">
            The other members share <span className="font-bold"><Money usdc={othersShare} /></span> ({discountPct}% of the pot) if you win.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <label htmlFor="bid-exact" className="text-xs font-bold text-cp-muted">Exact amount ($)</label>
            <input id="bid-exact" inputMode="decimal" autoComplete="off" className="w-32 min-h-11 px-3 rounded-xl border-2 border-cp-line bg-cp-surface" value={formatUnits(amount, USDC_DECIMALS)} onChange={(e) => onInput(e.target.value.replace(/[^0-9.]/g, ''))} />
          </div>
        </div>
      )}

      {problem && <p role="alert" className="text-sm mt-3 font-bold text-cp-danger">{problem}</p>}
      <CountdownTimer deadline={deadline} label="Bidding closes in" isDarkMode={isDarkMode} />
      <p className="text-xs mt-2 text-cp-muted">The lowest bid wins. Each new bid must be at least 2% lower than the current lowest ({bids.hasLowest ? usd(minBidStep(bids.lowestBid)) : 'none yet'}).</p>

      <Button
        size="lg"
        className="mt-4"
        onClick={() => place.write({ ...auctionContract, functionName: 'placeBid', args: [potId, amount] })}
        disabled={!!problem || place.isBusy}
      >
        {place.isPending ? 'Confirming…' : place.isConfirming ? 'Placing bid…' : <>Bid to receive {usd(amount)}</>}
      </Button>
      {place.errorMessage && <p role="alert" className="text-sm mt-2 font-bold text-cp-danger">{place.errorMessage}</p>}
      {place.isConfirmed && !place.isBusy && <p className="text-sm mt-2 font-bold text-cp-success">Bid placed ✓</p>}
    </div>
  );
}
