// Plain-language status for a member's next action (home cards, pot page). Pure — easy to test.

import type { MemberAction } from './potState';
import type { Tone } from '@/components/ui/status-pill';

export interface ActionCopy {
  /** One line under the circle name. */
  status: string;
  tone: Tone;
  /** Label for the single primary button, if the member has something to do. */
  cta?: string;
  urgent?: boolean;
}

const HOUR = 3_600;

export function relativeTime(target: number, now: number) {
  const s = target - now;
  if (s <= 0) return 'now';
  if (s < HOUR) return `in ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 24 * HOUR) return `in ${Math.round(s / HOUR)} h`;
  return new Date(target * 1000).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export function actionCopy(a: MemberAction, now: number, money: (v: bigint) => string): ActionCopy {
  switch (a.kind) {
    case 'pay': {
      const urgent = a.deadline - now < 24 * HOUR;
      return { status: `Pay ${money(a.amount)} — due ${relativeTime(a.deadline, now)}`, tone: urgent ? 'danger' : 'warn', cta: 'Pay now', urgent };
    }
    case 'bid':
      return { status: a.leading ? `You have the lowest bid · closes ${relativeTime(a.closesAt, now)}` : `Bidding open · closes ${relativeTime(a.closesAt, now)}`, tone: 'accent', cta: a.leading ? 'View bids' : 'Place a bid' };
    case 'paidWaitingForBidding':
      return { status: `Paid ✓ · bidding opens ${relativeTime(a.opensAt, now)}`, tone: 'success' };
    case 'paidWaitingForDraw':
      return { status: 'Paid ✓ · waiting for this round’s receiver', tone: 'success' };
    case 'drawing':
      return { status: 'Picking this round’s receiver…', tone: 'accent' };
    case 'received':
      return { status: 'You received this pot 🎉 · keep paying each round', tone: 'success' };
    case 'missedPayment':
    case 'defaulted':
      return { status: 'A payment was missed', tone: 'danger' };
    case 'waitingForMembers':
      return { status: `Waiting for ${a.expected - a.joined} more ${a.expected - a.joined === 1 ? 'person' : 'people'} to join`, tone: 'neutral', cta: 'Invite' };
    case 'startPot':
      return { status: 'Everyone has joined', tone: 'accent', cta: 'Start the circle' };
    case 'waitingForRound':
      return { status: a.at ? `Next round starts ${relativeTime(a.at, now)}` : 'Next round is about to start', tone: 'neutral' };
    case 'completed':
      return { status: 'Finished · every member received the pot', tone: 'neutral' };
    case 'join':
      return { status: 'You’re invited', tone: 'accent', cta: 'Join' };
    default:
      return { status: '', tone: 'neutral' };
  }
}
