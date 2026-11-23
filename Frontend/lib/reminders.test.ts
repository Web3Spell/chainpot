import { describe, expect, it } from "vitest";
import { CycleStatus, PotStatus, type Cycle, type Pot } from "./pot";
import { remindersFor, renderReminder, type MemberState, type PotState } from "./reminders";

const HOUR = 3_600;
const T0 = 1_800_000_000;
const A = "0x00000000000000000000000000000000000000a1" as const;
const B = "0x00000000000000000000000000000000000000b2" as const;

const pot: Pot = {
  creator: A, merkleRoot: "0x01", rootFrozen: true, expectedMembers: 2, amountPerCycle: BigInt(50_000_000),
  status: PotStatus.Active, currentCycle: 3, completedCycles: 2, memberCount: 2,
};
const cycle = (o: Partial<Cycle> = {}): Cycle => ({
  startTime: T0, paymentDeadline: T0 + 72 * HOUR, biddingDeadline: T0 + 96 * HOUR, totalCollected: BigInt(0), paidCount: 0,
  status: CycleStatus.Active, winner: "0x0000000000000000000000000000000000000000", settled: false, ...o,
});
const member = (address: `0x${string}`, o: Partial<MemberState> = {}): MemberState => ({ address, paid: false, hasWon: false, defaulted: false, ...o });
const state = (o: Partial<PotState> = {}): PotState => ({ engine: "circle", potId: BigInt(1), pot, cycle: cycle(), members: [member(A), member(B, { paid: true })], ...o });
const kinds = (s: PotState, now: number) => remindersFor(s, now).map((r) => `${r.kind}:${r.address.slice(-2)}`);

describe("reminder rules", () => {
  it("announces a fresh round only to members who still owe", () => {
    expect(kinds(state(), T0 + HOUR)).toEqual(["roundStarted:a1"]);
    expect(kinds(state(), T0 + 7 * HOUR)).toEqual([]); // stale announcement suppressed
  });

  it("escalates payment reminders as the deadline approaches", () => {
    const deadline = T0 + 72 * HOUR;
    expect(kinds(state(), deadline - 47 * HOUR)).toEqual(["due48h:a1"]);
    expect(kinds(state(), deadline - 23 * HOUR)).toEqual(["due24h:a1"]);
    expect(kinds(state(), deadline - HOUR)).toEqual(["due2h:a1"]);
    expect(kinds(state(), deadline + 1)).toEqual([]);
  });

  it("keys are per round so the send log dedupes repeats", () => {
    const [r] = remindersFor(state(), T0 + 72 * HOUR - HOUR);
    expect(r.key).toBe("due2h:circle:1:3");
  });

  it("tells paid, not-yet-won auction members when bidding opens", () => {
    const s = state({ engine: "auction", members: [member(A, { paid: true }), member(B, { paid: true, hasWon: true })] });
    expect(kinds(s, T0 + 80 * HOUR)).toEqual(["biddingOpen:a1"]);
  });

  it("notifies the receiver and members who missed", () => {
    const s = state({ cycle: cycle({ status: CycleStatus.Completed, winner: B }), members: [member(A, { defaulted: true }), member(B, { paid: true })] });
    expect(remindersFor(s, T0).map((r) => r.key)).toEqual(["missed:circle:1", "youReceived:circle:1:3"]);
  });

  it("renders plain messages with exact dollar amounts and a link", () => {
    const [r] = remindersFor(state(), T0 + 72 * HOUR - HOUR);
    const msg = renderReminder(r, "https://app.chainpot.example");
    expect(msg.subject).toBe("Payment due in 2 hours — Community Circle #1");
    expect(msg.body).toContain("$50");
    expect(msg.body).toContain("https://app.chainpot.example/pots/1?engine=circle");
  });
});
