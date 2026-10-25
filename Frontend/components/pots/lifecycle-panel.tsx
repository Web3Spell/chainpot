'use client';

import { useAccount, useSimulateContract } from 'wagmi';
import { engineContract, useCycle, useDrawReady, useMemberState, usePot, usePotConfig } from '@/hooks/useRoscaEngine';
import { auctionContract, circleContract } from '@/hooks/useAuctionEngine';
import { useContractAction } from '@/hooks/useContractAction';
import { useNow } from '@/hooks/useNow';
import { PotStatus, cyclePhase, formatDateTime, formatDuration, nextCycleStartsAt, type Engine } from '@/lib/pot';

interface LifecyclePanelProps {
  potId: bigint;
  engine: Engine;
  isDarkMode: boolean;
}

/**
 * "Next step" for the pot. Every action here is permissionless on-chain, so any connected user can
 * keep the pot moving — the pot no longer stalls if the creator disappears.
 */
export function LifecyclePanel({ potId, engine, isDarkMode }: LifecyclePanelProps) {
  const { address } = useAccount();
  const now = useNow();
  const { pot } = usePot(engine, potId);
  const { config } = usePotConfig(engine, potId);
  const { cycle } = useCycle(engine, potId, pot?.currentCycle ?? 0);
  const member = useMemberState(engine, potId, pot?.currentCycle ?? 0, address);
  const phase = cyclePhase(engine, cycle, now);
  const { data: drawReady } = useDrawReady(engine, potId, phase === 'drawing');
  const action = useContractAction();
  const contract = engineContract(engine);

  // cancelStuckVRFCycle is only valid after VRF_TIMEOUT; simulate it instead of guessing the request time.
  const retry = useSimulateContract({
    ...contract,
    functionName: 'cancelStuckVRFCycle',
    args: [potId],
    account: address,
    query: { enabled: phase === 'drawing' && !drawReady && !!address, refetchInterval: 60_000 },
  });

  if (!pot || pot.status === PotStatus.Open) return null;

  const muted = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  let title = '';
  let detail: React.ReactNode = null;
  let button: { label: string; run: () => void } | null = null;

  if (pot.status === PotStatus.Completed) {
    title = 'This pot has finished';
    detail = 'All rounds are done. Any payouts, interest or refunds are in your claimable balance (top right).';
    if (member.isMember && !member.slotReleased) {
      button = { label: 'Free up my pot slot', run: () => action.write({ ...contract, functionName: 'releaseSlot', args: [potId, address!] }) };
      detail = <>{detail} You can also free this pot&apos;s slot so it no longer counts toward your 50-pot limit.</>;
    }
  } else if (pot.currentCycle === 0 || phase === 'completed') {
    const next = pot.currentCycle + 1;
    if (next > pot.expectedMembers) {
      title = 'Finishing up';
    } else {
      const startsAt = nextCycleStartsAt(pot, config, cycle);
      title = `Round ${next} of ${pot.expectedMembers}`;
      if (startsAt > now) {
        detail = `The next round can start ${formatDateTime(startsAt)} (in ${formatDuration(startsAt - now)}), following the pot's schedule.`;
      } else {
        detail = 'Ready to start. Starting the round opens payments for all members.';
        button = { label: `Start round ${next}`, run: () => action.write({ ...contract, functionName: 'startCycle', args: [potId] }) };
      }
    }
  } else if (phase === 'payment' && cycle) {
    title = `Round ${pot.currentCycle}: collecting payments`;
    detail = `${cycle.paidCount} of ${pot.memberCount} members have paid. Payments close ${formatDateTime(cycle.paymentDeadline)} (in ${formatDuration(cycle.paymentDeadline - now)}).`;
  } else if (phase === 'bidding' && cycle) {
    title = `Round ${pot.currentCycle}: bidding open`;
    detail = `Members who paid can bid until ${formatDateTime(cycle.biddingDeadline)} (in ${formatDuration(cycle.biddingDeadline - now)}).`;
  } else if (phase === 'readyToClose') {
    title = `Round ${pot.currentCycle}: ready to pick the receiver`;
    if (engine === 'circle') {
      detail = 'Payments are closed. Run the draw to pick this round\'s receiver. If two or more members are eligible, Chainlink VRF provides the randomness, which takes a minute or two.';
      button = { label: 'Run the draw', run: () => action.write({ ...circleContract, functionName: 'drawWinner', args: [potId] }) };
    } else {
      detail = 'Bidding has closed. The lowest bidder receives their bid; if nobody bid, a fair random draw picks the receiver.';
      button = { label: 'Declare the receiver', run: () => action.write({ ...auctionContract, functionName: 'declareWinner', args: [potId] }) };
    }
  } else if (phase === 'drawing') {
    title = `Round ${pot.currentCycle}: drawing the receiver`;
    if (drawReady) {
      detail = 'The random number has arrived from Chainlink. Finalize to pay out the round.';
      button = { label: 'Finalize the draw', run: () => action.write({ ...contract, functionName: 'finalizeDraw', args: [potId] }) };
    } else if (retry.isSuccess) {
      detail = 'Chainlink hasn\'t delivered the random number for over a day. You can retry the draw (after two retries a fallback draw is used so the pot never gets stuck).';
      button = { label: 'Retry the draw', run: () => action.write({ ...contract, functionName: 'cancelStuckVRFCycle', args: [potId] }) };
    } else {
      detail = 'Waiting for Chainlink VRF to deliver a verifiable random number. This usually takes a minute or two; this page updates automatically.';
    }
  }

  if (!title) return null;

  return (
    <section className={`mb-8 p-6 rounded-2xl border-3 border-black ${isDarkMode ? 'bg-white/5' : 'bg-white/90'}`}>
      <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${muted}`}>Next step</p>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {detail && <p className={`text-sm mt-1 ${muted}`}>{detail}</p>}
        </div>
        {button && (
          <div className="flex flex-col items-start md:items-end gap-1">
            <button
              onClick={button.run}
              disabled={!address || action.isBusy}
              className={`px-6 py-3 rounded-full font-bold whitespace-nowrap disabled:opacity-50 ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
            >
              {action.isPending ? 'Confirm in wallet…' : action.isConfirming ? 'Working…' : button.label}
            </button>
            <span className={`text-xs ${muted}`}>{address ? 'Anyone can do this step.' : 'Connect a wallet to do this step.'}</span>
          </div>
        )}
      </div>
      {action.errorMessage && <p className="mt-3 text-sm font-medium text-red-500">{action.errorMessage}</p>}
    </section>
  );
}
