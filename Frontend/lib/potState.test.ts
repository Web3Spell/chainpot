import { describe, expect, it } from "vitest";
import { CycleStatus, PotStatus, VRF_TIMEOUT, type Cycle, type Pot, type PotConfig } from "./pot";
import { memberAction, nextProtocolStep, type ViewerState } from "./potState";

const DAY = 86_400;
const T0 = 1_800_000_000;

const pot = (o: Partial<Pot> = {}): Pot => ({
  creator: "0x00000000000000000000000000000000000000c1",
  merkleRoot: "0x01",
  rootFrozen: true,
  expectedMembers: 3,
  amountPerCycle: BigInt(50_000_000),
  status: PotStatus.Active,
  currentCycle: 1,
  completedCycles: 0,
  memberCount: 3,
  ...o,
});
const config: PotConfig = { cycleDuration: 7 * DAY, paymentWindow: 2 * DAY, biddingWindow: 3 * DAY, winnersCount: 0, rootVersion: 0 };
const cycle = (o: Partial<Cycle> = {}): Cycle => ({
  startTime: T0,
  paymentDeadline: T0 + 2 * DAY,
  biddingDeadline: T0 + 3 * DAY,
  totalCollected: BigInt(150_000_000),
  paidCount: 3,
  status: CycleStatus.Active,
  winner: "0x0000000000000000000000000000000000000000",
  settled: false,
  ...o,
});
const member = (o: Partial<ViewerState> = {}): ViewerState => ({
  address: "0x00000000000000000000000000000000000000a1",
  isCreator: false,
  isMember: true,
  hasWon: false,
  defaulted: false,
  paidThisRound: false,
  ...o,
});

describe("nextProtocolStep", () => {
  it("waits for members, then lets the creator start", () => {
    expect(nextProtocolStep({ engine: "circle", pot: pot({ status: PotStatus.Open, memberCount: 2, currentCycle: 0 }), now: T0 }))
      .toEqual({ kind: "awaitingMembers", joined: 2, expected: 3 });
    expect(nextProtocolStep({ engine: "circle", pot: pot({ status: PotStatus.Open, currentCycle: 0 }), now: T0 }).kind).toBe("startPot");
  });

  it("starts round 1 immediately after the pot starts", () => {
    expect(nextProtocolStep({ engine: "circle", pot: pot({ currentCycle: 0 }), config, now: T0 })).toEqual({ kind: "startCycle", round: 1 });
  });

  it("enforces the cycle cadence before the next round (F-08)", () => {
    const done = cycle({ status: CycleStatus.Completed });
    expect(nextProtocolStep({ engine: "circle", pot: pot(), config, cycle: done, now: T0 + 3 * DAY }))
      .toEqual({ kind: "waitCycleStart", round: 2, at: T0 + 7 * DAY });
    expect(nextProtocolStep({ engine: "circle", pot: pot(), config, cycle: done, now: T0 + 7 * DAY })).toEqual({ kind: "startCycle", round: 2 });
  });

  it("circle: collect payments, then draw", () => {
    expect(nextProtocolStep({ engine: "circle", pot: pot(), config, cycle: cycle(), now: T0 + DAY }).kind).toBe("collectingPayments");
    expect(nextProtocolStep({ engine: "circle", pot: pot(), config, cycle: cycle(), now: T0 + 2 * DAY }).kind).toBe("drawWinner");
  });

  it("auction: bidding only between the payment and bidding deadlines (F-10)", () => {
    expect(nextProtocolStep({ engine: "auction", pot: pot(), config, cycle: cycle(), now: T0 + DAY }).kind).toBe("collectingPayments");
    expect(nextProtocolStep({ engine: "auction", pot: pot(), config, cycle: cycle(), now: T0 + 2 * DAY }).kind).toBe("bidding");
    expect(nextProtocolStep({ engine: "auction", pot: pot(), config, cycle: cycle(), now: T0 + 3 * DAY }).kind).toBe("declareWinner");
  });

  it("VRF: finalize when ready, retry only after the timeout", () => {
    const drawing = cycle({ status: CycleStatus.AwaitingVRF });
    const base = { engine: "circle" as const, pot: pot(), config, cycle: drawing };
    expect(nextProtocolStep({ ...base, now: T0 + 3 * DAY, drawReady: true }).kind).toBe("finalizeDraw");
    expect(nextProtocolStep({ ...base, now: T0 + 3 * DAY, vrfRequestedAt: T0 + 3 * DAY - 60 }))
      .toEqual({ kind: "awaitingRandomness", round: 1, retryAt: T0 + 3 * DAY - 60 + VRF_TIMEOUT });
    expect(nextProtocolStep({ ...base, now: T0 + 5 * DAY, vrfRequestedAt: T0 + 3 * DAY }).kind).toBe("retryDraw");
    expect(nextProtocolStep({ ...base, now: T0 + 5 * DAY, vrfRequestedAt: T0 + 3 * DAY, retrySimulates: false }).kind).toBe("awaitingRandomness");
  });

  it("finishes after the last round", () => {
    const p = pot({ currentCycle: 3, completedCycles: 3 });
    expect(nextProtocolStep({ engine: "circle", pot: p, config, cycle: cycle({ status: CycleStatus.Completed }), now: T0 }).kind).toBe("finishing");
    expect(nextProtocolStep({ engine: "circle", pot: pot({ status: PotStatus.Completed }), now: T0 }).kind).toBe("completed");
  });
});

describe("memberAction", () => {
  const open = pot({ status: PotStatus.Open, memberCount: 1, currentCycle: 0 });
  const outsider = member({ isMember: false });

  it("walks a newcomer through connect → invite → register → join", () => {
    const run = (v: Partial<ViewerState>) => memberAction({ engine: "circle", pot: open, now: T0, viewer: { ...outsider, ...v } }).kind;
    expect(run({ address: undefined })).toBe("connect");
    expect(run({ onInviteList: undefined })).toBe("needInviteLink");
    expect(run({ onInviteList: false })).toBe("notInvited");
    expect(run({ onInviteList: true, registered: false })).toBe("register");
    expect(run({ onInviteList: true, registered: true, canJoin: false })).toBe("joinBlocked");
    expect(run({ onInviteList: true, registered: true, canJoin: true })).toBe("join");
  });

  it("shows a full pot instead of a join button", () => {
    expect(memberAction({ engine: "circle", pot: pot({ status: PotStatus.Open, currentCycle: 0 }), now: T0, viewer: { ...outsider, onInviteList: true } }).kind).toBe("potFull");
  });

  it("asks members to pay before the deadline and flags a miss after it", () => {
    const a = memberAction({ engine: "circle", pot: pot(), config, cycle: cycle(), now: T0 + DAY, viewer: member() });
    expect(a).toEqual({ kind: "pay", amount: BigInt(50_000_000), deadline: T0 + 2 * DAY });
    expect(memberAction({ engine: "circle", pot: pot(), config, cycle: cycle(), now: T0 + 2 * DAY, viewer: member() }).kind).toBe("missedPayment");
  });

  it("previous winners still have to pay each round", () => {
    expect(memberAction({ engine: "circle", pot: pot(), config, cycle: cycle(), now: T0 + DAY, viewer: member({ hasWon: true }) }).kind).toBe("pay");
    expect(memberAction({ engine: "circle", pot: pot(), config, cycle: cycle(), now: T0 + DAY, viewer: member({ hasWon: true, paidThisRound: true }) }).kind).toBe("received");
  });

  it("auction: paid members wait for bidding, then bid", () => {
    const paid = member({ paidThisRound: true });
    expect(memberAction({ engine: "auction", pot: pot(), config, cycle: cycle(), now: T0 + DAY, viewer: paid }).kind).toBe("paidWaitingForBidding");
    expect(memberAction({ engine: "auction", pot: pot(), config, cycle: cycle(), now: T0 + 2 * DAY + 1, viewer: { ...paid, hasLowestBid: true } }))
      .toEqual({ kind: "bid", closesAt: T0 + 3 * DAY, leading: true });
  });

  it("defaulted members are locked out", () => {
    expect(memberAction({ engine: "circle", pot: pot(), config, cycle: cycle(), now: T0 + DAY, viewer: member({ defaulted: true }) }).kind).toBe("defaulted");
  });
});
