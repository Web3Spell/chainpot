'use client';

import { useAccount, useSimulateContract } from 'wagmi';
import { engineContract, useCycle, useDrawReady, useMemberState, usePot, usePotConfig } from '@/hooks/useRoscaEngine';
import { auctionContract, circleContract } from '@/hooks/useAuctionEngine';
import { useContractAction } from '@/hooks/useContractAction';
import { useNow } from '@/hooks/useNow';
import { usePotIndex } from '@/hooks/useIndexer';
import { PotStatus, cyclePhase, formatDateTime, formatDuration, type Engine } from '@/lib/pot';
import { nextProtocolStep } from '@/lib/potState';

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
  const drawing = cyclePhase(engine, cycle, now) === 'drawing';
  const { data: drawReady } = useDrawReady(engine, potId, drawing);
  const { data: indexed } = usePotIndex(engine, potId);
  const action = useContractAction();
  const contract = engineContract(engine);

  // cancelStuckVRFCycle is only valid after VRF_TIMEOUT; simulate it when the indexer can't tell us when VRF was requested.
  const vrfRequestedAt = indexed?.currentCycle?.vrfRequestedAt ?? undefined;
  const retry = useSimulateContract({
    ...contract,
    functionName: 'cancelStuckVRFCycle',
    args: [potId],
    account: address,
    query: { enabled: drawing && !drawReady && !!address && vrfRequestedAt === undefined, refetchInterval: 60_000 },
  });

  if (!pot || pot.status === PotStatus.Open) return null;

  const step = nextProtocolStep({
    engine, pot, config, cycle, now,
    drawReady: !!drawReady,
    vrfRequestedAt,
    retrySimulates: vrfRequestedAt === undefined ? retry.isSuccess : undefined,
  });

  const muted = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  let title = '';
  let detail: React.ReactNode = null;
  let button: { label: string; run: () => void } | null = null;
  const write = (functionName: 'startCycle' | 'finalizeDraw' | 'cancelStuckVRFCycle') =>
    action.write({ ...contract, functionName, args: [potId] });

  switch (step.kind) {
    case 'completed':
      title = 'This pot has finished';
      detail = 'All rounds are done. Any payouts, interest or refunds are in your claimable balance (top right).';
      if (member.isMember && !member.slotReleased) {
        button = { label: 'Free up my pot slot', run: () => action.write({ ...contract, functionName: 'releaseSlot', args: [potId, address!] }) };
        detail = <>{detail} You can also free this pot&apos;s slot so it no longer counts toward your 50-pot limit.</>;
      }
      break;
    case 'finishing':
      title = 'Finishing up';
      break;
    case 'waitCycleStart':
      title = `Round ${step.round} of ${pot.expectedMembers}`;
      detail = `The next round can start ${formatDateTime(step.at)} (in ${formatDuration(step.at - now)}), following the pot's schedule.`;
      break;
    case 'startCycle':
      title = `Round ${step.round} of ${pot.expectedMembers}`;
      detail = 'Ready to start. Starting the round opens payments for all members.';
      button = { label: `Start round ${step.round}`, run: () => write('startCycle') };
      break;
    case 'collectingPayments':
      title = `Round ${step.round}: collecting payments`;
      detail = `${cycle?.paidCount ?? 0} of ${pot.memberCount} members have paid. Payments close ${formatDateTime(step.until)} (in ${formatDuration(step.until - now)}).`;
      break;
    case 'bidding':
      title = `Round ${step.round}: bidding open`;
      detail = `Members who paid can bid until ${formatDateTime(step.until)} (in ${formatDuration(step.until - now)}).`;
      break;
    case 'drawWinner':
      title = `Round ${step.round}: ready to pick the receiver`;
      detail = 'Payments are closed. Run the draw to pick this round\'s receiver. If two or more members are eligible, Chainlink VRF provides the randomness, which takes a minute or two.';
      button = { label: 'Run the draw', run: () => action.write({ ...circleContract, functionName: 'drawWinner', args: [potId] }) };
      break;
    case 'declareWinner':
      title = `Round ${step.round}: ready to pick the receiver`;
      detail = 'Bidding has closed. The lowest bidder receives their bid; if nobody bid, a fair random draw picks the receiver.';
      button = { label: 'Declare the receiver', run: () => action.write({ ...auctionContract, functionName: 'declareWinner', args: [potId] }) };
      break;
    case 'finalizeDraw':
      title = `Round ${step.round}: drawing the receiver`;
      detail = 'The random number has arrived from Chainlink. Finalize to pay out the round.';
      button = { label: 'Finalize the draw', run: () => write('finalizeDraw') };
      break;
    case 'retryDraw':
      title = `Round ${step.round}: drawing the receiver`;
      detail = 'Chainlink hasn\'t delivered the random number for over a day. You can retry the draw (after two retries a fallback draw is used so the pot never gets stuck).';
      button = { label: 'Retry the draw', run: () => write('cancelStuckVRFCycle') };
      break;
    case 'awaitingRandomness':
      title = `Round ${step.round}: drawing the receiver`;
      detail = `Waiting for Chainlink VRF to deliver a verifiable random number. This usually takes a minute or two; this page updates automatically.${step.retryAt ? ` If it hasn't arrived by ${formatDateTime(step.retryAt)}, the draw can be retried.` : ''}`;
      break;
    default:
      return null;
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
