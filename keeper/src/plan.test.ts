import { describe, expect, it } from "vitest";
import { CycleStatus, PotStatus, type Cycle, type Pot, type PotConfig } from "../../Frontend/lib/pot.ts";
import { planClaims, planPot, type PotSnapshot } from "./plan.ts";

const DAY = 86_400;
const T0 = 1_800_000_000;
const pot = (o: Partial<Pot> = {}): Pot => ({
  creator: "0x00000000000000000000000000000000000000c1", merkleRoot: "0x01", rootFrozen: true, expectedMembers: 2,
  amountPerCycle: 1_000_000n, status: PotStatus.Active, currentCycle: 1, completedCycles: 0, memberCount: 2, ...o,
});
const config: PotConfig = { cycleDuration: 2 * DAY, paymentWindow: DAY, biddingWindow: 1.5 * DAY, winnersCount: 0, rootVersion: 0 };
const cycle = (o: Partial<Cycle> = {}): Cycle => ({
  startTime: T0, paymentDeadline: T0 + DAY, biddingDeadline: T0 + 1.5 * DAY, totalCollected: 2_000_000n, paidCount: 2,
  status: CycleStatus.Active, winner: "0x0000000000000000000000000000000000000000", settled: false, ...o,
});
const snap = (o: Partial<PotSnapshot>): PotSnapshot => ({ engine: "circle", potId: 1n, pot: pot(), config, cycle: cycle(), ...o });
const kinds = (s: PotSnapshot, now: number) => planPot(s, now).map((a) => (a.kind === "engine" ? a.functionName : a.kind));

describe("keeper planning", () => {
  it("does nothing while members are paying or bidding", () => {
    expect(kinds(snap({}), T0 + DAY / 2)).toEqual([]);
    expect(kinds(snap({ engine: "auction" }), T0 + DAY + 60)).toEqual([]);
  });

  it("closes rounds on the right engine call", () => {
    expect(kinds(snap({}), T0 + DAY)).toEqual(["drawWinner"]);
    expect(kinds(snap({ engine: "auction" }), T0 + 2 * DAY)).toEqual(["declareWinner"]);
  });

  it("finalizes delivered randomness and retries only when the contract allows it", () => {
    const drawing = cycle({ status: CycleStatus.AwaitingVRF });
    expect(kinds(snap({ cycle: drawing, drawReady: true }), T0 + DAY)).toEqual(["finalizeDraw"]);
    expect(kinds(snap({ cycle: drawing, drawReady: false, retrySimulates: false }), T0 + DAY)).toEqual([]);
    expect(kinds(snap({ cycle: drawing, drawReady: false, retrySimulates: true }), T0 + DAY)).toEqual(["cancelStuckVRFCycle"]);
  });

  it("starts the next round only on schedule", () => {
    const done = cycle({ status: CycleStatus.Completed });
    expect(kinds(snap({ cycle: done }), T0 + DAY)).toEqual([]);
    expect(kinds(snap({ cycle: done }), T0 + 2 * DAY)).toEqual(["startCycle"]);
  });

  it("never starts a pot (creator-only) and frees slots once complete", () => {
    expect(kinds(snap({ pot: pot({ status: PotStatus.Open, currentCycle: 0 }) }), T0)).toEqual([]);
    const members = [
      { address: "0x00000000000000000000000000000000000000a1" as const, slotReleased: true },
      { address: "0x00000000000000000000000000000000000000b2" as const, slotReleased: false },
    ];
    expect(planPot(snap({ pot: pot({ status: PotStatus.Completed }), members }), T0)).toEqual([
      { kind: "releaseSlot", engine: "circle", potId: 1n, member: members[1].address },
    ]);
  });

  it("pushes balances above the threshold, honouring opt-outs", () => {
    const a = "0x00000000000000000000000000000000000000a1" as const;
    const b = "0x00000000000000000000000000000000000000B2" as const;
    const c = "0x00000000000000000000000000000000000000c3" as const;
    const balances = new Map([[a, 5_000_000n], [b, 2_000_000n], [c, 10n]]);
    expect(planClaims(balances, 1_000_000n, new Set([b.toLowerCase()]))).toEqual([{ kind: "claimFor", user: a, amount: 5_000_000n }]);
  });
});
