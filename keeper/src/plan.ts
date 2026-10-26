// Pure planning: given what's on-chain, which permissionless calls should the keeper send?
// Uses the same state machine as the app, so the UI's "Next step" and the keeper never disagree.

import { PotStatus, type Cycle, type Engine, type Pot, type PotConfig } from "../../Frontend/lib/pot.ts";
import { nextProtocolStep } from "../../Frontend/lib/potState.ts";

export type EngineCall = "startCycle" | "drawWinner" | "declareWinner" | "finalizeDraw" | "cancelStuckVRFCycle";

export type KeeperAction =
  | { kind: "engine"; engine: Engine; potId: bigint; functionName: EngineCall; reason: string }
  | { kind: "releaseSlot"; engine: Engine; potId: bigint; member: `0x${string}` }
  | { kind: "claimFor"; user: `0x${string}`; amount: bigint };

export interface PotSnapshot {
  engine: Engine;
  potId: bigint;
  pot: Pot;
  config?: PotConfig;
  cycle?: Cycle;
  drawReady?: boolean;
  retrySimulates?: boolean;
  /** Only needed for completed pots. */
  members?: { address: `0x${string}`; slotReleased: boolean }[];
}

export function planPot(s: PotSnapshot, now: number): KeeperAction[] {
  const step = nextProtocolStep({
    engine: s.engine,
    pot: s.pot,
    config: s.config,
    cycle: s.cycle,
    now,
    drawReady: s.drawReady,
    retrySimulates: s.retrySimulates,
  });
  const call = (functionName: EngineCall, reason: string): KeeperAction[] => [
    { kind: "engine", engine: s.engine, potId: s.potId, functionName, reason },
  ];

  switch (step.kind) {
    case "startCycle":
      return call("startCycle", `round ${step.round} is due`);
    case "drawWinner":
      return call("drawWinner", `round ${step.round} payments closed`);
    case "declareWinner":
      return call("declareWinner", `round ${step.round} bidding closed`);
    case "finalizeDraw":
      return call("finalizeDraw", `round ${step.round} randomness delivered`);
    case "retryDraw":
      return call("cancelStuckVRFCycle", `round ${step.round} VRF timed out`);
    case "completed":
      return s.pot.status === PotStatus.Completed
        ? (s.members ?? []).filter((m) => !m.slotReleased).map((m) => ({ kind: "releaseSlot", engine: s.engine, potId: s.potId, member: m.address }))
        : [];
    default:
      // startPot is creator-only; waiting states need nothing.
      return [];
  }
}

/** Push balances to their owners (claimFor can only ever send a user's balance to that same user). */
export function planClaims(balances: Map<`0x${string}`, bigint>, minAmount: bigint, optOut: Set<string>): KeeperAction[] {
  const out: KeeperAction[] = [];
  for (const [user, amount] of balances) {
    if (amount >= minAmount && !optOut.has(user.toLowerCase())) out.push({ kind: "claimFor", user, amount });
  }
  return out;
}
