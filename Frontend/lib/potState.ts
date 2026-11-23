// Pure state machine over a pot's on-chain state. No React, no RPC: the UI renders from it today and
// the Phase 3 keeper will use `nextProtocolStep` to decide which permissionless call to send.

import { CycleStatus, PotStatus, VRF_TIMEOUT, cyclePhase, type Cycle, type Engine, type Pot, type PotConfig } from "./pot";

// ---- Protocol step: what has to happen next for the pot to progress (anyone may do it) ----

export type ProtocolStep =
  | { kind: "awaitingMembers"; joined: number; expected: number }
  | { kind: "startPot" } // creator-only
  | { kind: "startCycle"; round: number }
  | { kind: "waitCycleStart"; round: number; at: number }
  | { kind: "collectingPayments"; round: number; until: number }
  | { kind: "bidding"; round: number; until: number }
  | { kind: "drawWinner"; round: number } // circle
  | { kind: "declareWinner"; round: number } // auction
  | { kind: "finalizeDraw"; round: number }
  | { kind: "awaitingRandomness"; round: number; retryAt?: number }
  | { kind: "retryDraw"; round: number }
  | { kind: "finishing" }
  | { kind: "completed" };

export interface ProtocolInput {
  engine: Engine;
  pot: Pot;
  config?: PotConfig;
  cycle?: Cycle; // the pot's current cycle (index pot.currentCycle)
  now: number;
  drawReady?: boolean;
  /** When the VRF was requested, if known (indexer). Enables a precise retry time. */
  vrfRequestedAt?: number;
  /** Result of simulating cancelStuckVRFCycle, if the caller ran one. Overrides vrfRequestedAt. */
  retrySimulates?: boolean;
}

export function nextProtocolStep(i: ProtocolInput): ProtocolStep {
  const { engine, pot, config, cycle, now } = i;
  if (pot.status === PotStatus.Completed) return { kind: "completed" };
  if (pot.status === PotStatus.Open) {
    return pot.memberCount >= pot.expectedMembers
      ? { kind: "startPot" }
      : { kind: "awaitingMembers", joined: pot.memberCount, expected: pot.expectedMembers };
  }

  const round = pot.currentCycle;
  const phase = cyclePhase(engine, cycle, now);

  if (round === 0 || phase === "completed" || phase === "none") {
    const next = round + 1;
    if (next > pot.expectedMembers) return { kind: "finishing" };
    // F-08 cadence: next start >= previous start + cycleDuration (first round has no constraint).
    const at = round > 0 && cycle && config ? cycle.startTime + config.cycleDuration : 0;
    return at > now ? { kind: "waitCycleStart", round: next, at } : { kind: "startCycle", round: next };
  }

  switch (phase) {
    case "payment":
      return { kind: "collectingPayments", round, until: cycle!.paymentDeadline };
    case "bidding":
      return { kind: "bidding", round, until: cycle!.biddingDeadline };
    case "readyToClose":
      return engine === "circle" ? { kind: "drawWinner", round } : { kind: "declareWinner", round };
    case "drawing": {
      if (i.drawReady) return { kind: "finalizeDraw", round };
      if (i.retrySimulates === true) return { kind: "retryDraw", round };
      if (i.retrySimulates === undefined && i.vrfRequestedAt !== undefined) {
        const retryAt = i.vrfRequestedAt + VRF_TIMEOUT;
        return retryAt <= now ? { kind: "retryDraw", round } : { kind: "awaitingRandomness", round, retryAt };
      }
      return { kind: "awaitingRandomness", round };
    }
  }
}

// ---- Member action: what THIS user should see as their one primary action ----

export interface ViewerState {
  address?: string;
  isCreator: boolean;
  isMember: boolean;
  hasWon: boolean;
  defaulted: boolean;
  paidThisRound: boolean;
  /** undefined = invite list unknown on this device. */
  onInviteList?: boolean;
  registered?: boolean;
  canJoin?: boolean;
  /** Auction only. */
  hasLowestBid?: boolean;
}

export type MemberAction =
  | { kind: "connect" }
  | { kind: "needInviteLink" }
  | { kind: "notInvited" }
  | { kind: "potFull" }
  | { kind: "register" }
  | { kind: "joinBlocked" }
  | { kind: "join" }
  | { kind: "waitingForMembers"; joined: number; expected: number }
  | { kind: "startPot" }
  | { kind: "waitingForRound"; at?: number }
  | { kind: "pay"; amount: bigint; deadline: number }
  | { kind: "missedPayment" }
  | { kind: "defaulted" }
  | { kind: "paidWaitingForBidding"; opensAt: number }
  | { kind: "bid"; closesAt: number; leading: boolean }
  | { kind: "paidWaitingForDraw" }
  | { kind: "drawing" }
  | { kind: "received" } // has won; must keep paying in later rounds (handled by "pay")
  | { kind: "completed" }
  | { kind: "viewer" }; // not a member, nothing to do

export function memberAction(i: ProtocolInput & { viewer: ViewerState }): MemberAction {
  const { engine, pot, cycle, now, viewer: v } = i;
  if (pot.status === PotStatus.Completed) return v.isMember ? { kind: "completed" } : { kind: "viewer" };

  if (pot.status === PotStatus.Open) {
    if (v.isMember) {
      if (v.isCreator && pot.memberCount >= pot.expectedMembers) return { kind: "startPot" };
      return { kind: "waitingForMembers", joined: pot.memberCount, expected: pot.expectedMembers };
    }
    if (!v.address) return { kind: "connect" };
    if (pot.memberCount >= pot.expectedMembers) return { kind: "potFull" };
    if (v.onInviteList === undefined) return { kind: "needInviteLink" };
    if (!v.onInviteList) return { kind: "notInvited" };
    if (v.registered === false) return { kind: "register" };
    if (v.canJoin === false) return { kind: "joinBlocked" };
    return { kind: "join" };
  }

  if (!v.isMember) return { kind: "viewer" };
  if (v.defaulted) return { kind: "defaulted" };

  const phase = cyclePhase(engine, cycle, now);
  if (pot.currentCycle === 0 || phase === "none" || phase === "completed") {
    const step = nextProtocolStep(i);
    return { kind: "waitingForRound", at: step.kind === "waitCycleStart" ? step.at : undefined };
  }
  if (!v.paidThisRound) {
    return phase === "payment"
      ? { kind: "pay", amount: pot.amountPerCycle, deadline: cycle!.paymentDeadline }
      : { kind: "missedPayment" };
  }
  if (phase === "drawing") return { kind: "drawing" };
  if (v.hasWon) return { kind: "received" };
  if (engine === "auction") {
    if (phase === "payment") return { kind: "paidWaitingForBidding", opensAt: cycle!.paymentDeadline };
    if (phase === "bidding") return { kind: "bid", closesAt: cycle!.biddingDeadline, leading: !!v.hasLowestBid };
  }
  return { kind: "paidWaitingForDraw" };
}

/** Status of a cycle as recorded on-chain, for history rows. */
export function cycleOutcome(cycle: Cycle) {
  if (cycle.status !== CycleStatus.Completed) return "inProgress" as const;
  return /^0x0+$/.test(cycle.winner) ? ("refunded" as const) : ("paidOut" as const);
}
