'use client';

import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { engineContract, useCycle, useMemberState, usePot } from '@/hooks/useRoscaEngine';
import { auctionContract, useAuctionBids } from '@/hooks/useAuctionEngine';
import { useUSDCAllowance, useUSDCApprove, useUSDCBalance } from '@/hooks/useUsdc';
import { useContractAction } from '@/hooks/useContractAction';
import { useNow } from '@/hooks/useNow';
import { CONTRACT_CONFIG } from '@/config/hooksConf';
import { CountdownTimer } from './countdown-timer';
import { PotStatus, cyclePhase, formatDateTime, maxAllowedBid, minBidStep, sameAddress, type Engine } from '@/lib/pot';

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
  const { address } = useAccount();
  const now = useNow();
  const { pot } = usePot(engine, potId);
  const { cycle } = useCycle(engine, potId, pot?.currentCycle ?? 0);
  const member = useMemberState(engine, potId, pot?.currentCycle ?? 0, address);
  const phase = cyclePhase(engine, cycle, now);

  if (!pot || !cycle || !address || !member.isMember || pot.status !== PotStatus.Active) return null;
  if (phase === 'none' || phase === 'completed') return null;

  const card = `p-8 rounded-2xl border-3 border-black ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`;
  const muted = isDarkMode ? 'text-gray-400' : 'text-gray-600';

  let body: React.ReactNode;
  if (member.defaulted) {
    body = (
      <p className="font-medium text-red-500">
        You missed a payment deadline in this pot, so you can no longer pay, bid or receive a payout here.
      </p>
    );
  } else if (phase === 'payment' && !member.paid) {
    body = <PayStep engine={engine} potId={potId} amount={pot.amountPerCycle} deadline={cycle.paymentDeadline} isDarkMode={isDarkMode} />;
  } else if (!member.paid) {
    body = <p className="font-medium text-red-500">The payment deadline for this round passed before you paid. You&apos;ll be marked as having missed it.</p>;
  } else if (engine === 'auction' && !member.hasWon && (phase === 'payment' || phase === 'bidding')) {
    body = phase === 'payment' ? (
      <div>
        <p className="text-green-600 font-bold mb-2">✓ You&apos;ve paid for this round.</p>
        <p className={muted}>Bidding opens when payments close, {formatDateTime(cycle.paymentDeadline)}.</p>
        <CountdownTimer deadline={cycle.paymentDeadline} label="Bidding opens in" isDarkMode={isDarkMode} />
      </div>
    ) : (
      <BidStep potId={potId} cycleIdx={pot.currentCycle} totalCollected={cycle.totalCollected} deadline={cycle.biddingDeadline} isDarkMode={isDarkMode} />
    );
  } else {
    body = (
      <div>
        <p className="text-green-600 font-bold mb-2">✓ You&apos;ve paid for this round.</p>
        <p className={muted}>
          {member.hasWon
            ? 'You already received this pot\'s payout. Keep paying each round so the others get theirs.'
            : phase === 'drawing'
              ? 'The receiver is being drawn now.'
              : 'Nothing else to do. The receiver is picked after the deadline.'}
        </p>
      </div>
    );
  }

  return (
    <section className="mb-8">
      <h2 className="text-3xl font-bold mb-6">Your round</h2>
      <div className={card}>{body}</div>
    </section>
  );
}

function PayStep({ engine, potId, amount, deadline, isDarkMode }: { engine: Engine; potId: bigint; amount: bigint; deadline: number; isDarkMode: boolean }) {
  const { address } = useAccount();
  const { data: balance } = useUSDCBalance(address);
  const { data: allowance } = useUSDCAllowance(address, VAULT);
  const approve = useUSDCApprove(VAULT);
  const pay = useContractAction();

  const needsApproval = (allowance ?? BigInt(0)) < amount;
  const insufficient = balance !== undefined && balance < amount;
  const busy = approve.isBusy || pay.isBusy;
  const muted = isDarkMode ? 'text-gray-400' : 'text-gray-600';

  const label = approve.isPending || pay.isPending ? 'Confirm in wallet…'
    : approve.isConfirming ? 'Approving…'
    : pay.isConfirming ? 'Paying…'
    : needsApproval ? `Step 1 of 2: Allow ${usd(amount)}` : `Pay ${usd(amount)}`;

  return (
    <div className="flex flex-col md:flex-row gap-6 md:items-center">
      <div className="flex-1">
        <p className="text-xl font-bold">Pay {usd(amount)} for this round</p>
        <CountdownTimer deadline={deadline} label="Due in" isDarkMode={isDarkMode} />
        <p className={`text-sm mt-2 ${muted}`}>
          {needsApproval
            ? 'First allow ChainPot to take exactly this amount of USDC, then confirm the payment.'
            : 'Missing the deadline means losing your place in the pot, so pay early.'}
        </p>
        {balance !== undefined && <p className={`text-xs mt-1 ${muted}`}>Your USDC balance: {usd(balance)}</p>}
        {insufficient && (
          <p className="text-sm mt-2 font-medium text-red-500">
            You need {usd(amount - balance!)} more USDC.{' '}
            <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer" className="underline">Get test USDC</a>
          </p>
        )}
        {(approve.errorMessage || pay.errorMessage) && <p className="text-sm mt-2 font-medium text-red-500">{approve.errorMessage ?? pay.errorMessage}</p>}
      </div>
      <button
        onClick={() => (needsApproval ? approve.approve(amount) : pay.write({ ...engineContract(engine), functionName: 'payForCycle', args: [potId] }))}
        disabled={busy || insufficient}
        className="px-8 py-3 rounded-full font-bold bg-black text-white hover:bg-black/80 disabled:opacity-50 whitespace-nowrap"
      >
        {label}
      </button>
    </div>
  );
}

function BidStep({ potId, cycleIdx, totalCollected, deadline, isDarkMode }: { potId: bigint; cycleIdx: number; totalCollected: bigint; deadline: number; isDarkMode: boolean }) {
  const { address } = useAccount();
  const bids = useAuctionBids(potId, cycleIdx, address);
  const place = useContractAction();
  const [input, setInput] = useState('');
  const muted = isDarkMode ? 'text-gray-400' : 'text-gray-600';

  const youLead = bids.hasLowest && sameAddress(bids.lowestBidder, address);
  const max = maxAllowedBid(totalCollected, bids.lowestBid, bids.hasLowest);
  const amount = useMemo(() => {
    try {
      return input ? parseUnits(input, USDC_DECIMALS) : BigInt(0);
    } catch {
      return BigInt(0);
    }
  }, [input]);

  let problem: string | undefined;
  if (input && amount <= BigInt(0)) problem = 'Enter an amount above $0.';
  else if (amount > max) problem = bids.hasLowest
    ? `Must be at most ${usd(max)}: at least 2% (${usd(minBidStep(bids.lowestBid))}) below the current lowest bid.`
    : `Must be below the pot total of ${usd(totalCollected)}.`;
  else if (bids.hasBid && amount >= bids.myBid) problem = `Must be lower than your previous bid of ${usd(bids.myBid)}.`;

  const othersShare = amount > BigInt(0) && amount < totalCollected ? totalCollected - amount : BigInt(0);

  return (
    <div>
      <div className="flex flex-wrap gap-6 mb-4 text-sm">
        <div><p className={muted}>Pot this round</p><p className="text-xl font-bold">{usd(totalCollected)}</p></div>
        <div><p className={muted}>Current lowest bid</p><p className="text-xl font-bold">{bids.hasLowest ? usd(bids.lowestBid) : 'No bids yet'}</p></div>
        {bids.hasBid && <div><p className={muted}>Your bid</p><p className="text-xl font-bold">{usd(bids.myBid)}{youLead ? ' · leading' : ''}</p></div>}
      </div>

      {youLead ? (
        <p className="text-green-600 font-bold mb-3">You have the lowest bid. If nobody bids lower before bidding closes, you receive {usd(bids.lowestBid)}.</p>
      ) : null}

      <label className="block text-sm font-bold mb-2" htmlFor="bid">How much do you want to receive this round? (USDC)</label>
      <div className="flex flex-col md:flex-row gap-4 md:items-start">
        <div className="flex-1">
          <input
            id="bid"
            type="number"
            step="any"
            min="0"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={max > BigInt(0) ? `Up to ${formatUnits(max, USDC_DECIMALS)}` : ''}
            className={`w-full px-4 py-3 rounded-lg border-2 border-black ${isDarkMode ? 'bg-white/5 text-white' : 'bg-white text-black'}`}
          />
          {problem ? (
            <p className="text-sm mt-2 text-red-500">{problem}</p>
          ) : othersShare > BigInt(0) ? (
            <p className={`text-sm mt-2 ${muted}`}>If you win, you receive {usd(amount)} now and the other {usd(othersShare)} is shared among the other members.</p>
          ) : null}
          <CountdownTimer deadline={deadline} label="Bidding closes in" isDarkMode={isDarkMode} />
          <p className={`text-xs mt-2 ${muted}`}>The lowest bid wins. Each new bid must be at least 2% lower than the current lowest.</p>
        </div>
        <button
          onClick={() => place.write({ ...auctionContract, functionName: 'placeBid', args: [potId, amount] })}
          disabled={!input || !!problem || max === BigInt(0) || place.isBusy}
          className="px-8 py-3 rounded-full font-bold bg-black text-white hover:bg-black/80 disabled:opacity-50 whitespace-nowrap"
        >
          {place.isPending ? 'Confirm in wallet…' : place.isConfirming ? 'Placing bid…' : 'Place bid'}
        </button>
      </div>
      {place.errorMessage && <p className="text-sm mt-2 font-medium text-red-500">{place.errorMessage}</p>}
      {place.isConfirmed && !place.isBusy && <p className="text-sm mt-2 font-medium text-green-600">Bid placed ✓</p>}
    </div>
  );
}
