// Typed views over the V4 engine reads, plus the contract rules the UI must respect.
// Constants mirror RoscaEngineBaseV4 / AuctionEngineV4 — keep them in sync with the contracts.

export type Engine = "circle" | "auction";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000" as const;

export const MIN_AMOUNT_PER_CYCLE = BigInt(1_000_000); // 1 USDC
export const MIN_MEMBERS = 2;
export const MAX_MEMBERS = 100;
export const MIN_PAYMENT_WINDOW = 86_400; // 1 day
export const MIN_BIDDING_PHASE = 3_600; // 1 hour after the payment deadline
export const MIN_BID_STEP_BPS = BigInt(200); // 2 %
export const VRF_TIMEOUT = 86_400;

export enum PotStatus {
  None = 0,
  Open = 1,
  Active = 2,
  Completed = 3,
}

export enum CycleStatus {
  None = 0,
  Active = 1,
  AwaitingVRF = 2,
  Completed = 3,
}

export interface Pot {
  creator: `0x${string}`;
  merkleRoot: `0x${string}`;
  rootFrozen: boolean;
  expectedMembers: number;
  amountPerCycle: bigint;
  status: PotStatus;
  currentCycle: number;
  completedCycles: number;
  memberCount: number;
}

export interface PotConfig {
  cycleDuration: number;
  paymentWindow: number;
  biddingWindow: number;
  winnersCount: number;
  rootVersion: number;
}

/** Deadlines are the contract's EFFECTIVE (pause-extended) deadlines. */
export interface Cycle {
  startTime: number;
  paymentDeadline: number;
  biddingDeadline: number;
  totalCollected: bigint;
  paidCount: number;
  status: CycleStatus;
  winner: `0x${string}`;
  settled: boolean;
}

type Raw = readonly unknown[] | undefined;

export function parsePot(raw: unknown): Pot | undefined {
  const r = raw as Raw;
  if (!r) return undefined;
  const pot: Pot = {
    creator: r[0] as `0x${string}`,
    merkleRoot: r[1] as `0x${string}`,
    rootFrozen: Boolean(r[2]),
    expectedMembers: Number(r[3]),
    amountPerCycle: BigInt(r[4] as bigint),
    status: Number(r[5]) as PotStatus,
    currentCycle: Number(r[6]),
    completedCycles: Number(r[7]),
    memberCount: Number(r[8]),
  };
  // Unknown pot IDs return a zeroed struct.
  return pot.creator === ZERO_ADDRESS ? undefined : pot;
}

export function parsePotConfig(raw: unknown): PotConfig | undefined {
  const r = raw as Raw;
  if (!r) return undefined;
  return {
    cycleDuration: Number(r[0]),
    paymentWindow: Number(r[1]),
    biddingWindow: Number(r[2]),
    winnersCount: Number(r[3]),
    rootVersion: Number(r[4]),
  };
}

export function parseCycle(raw: unknown): Cycle | undefined {
  const r = raw as Raw;
  if (!r) return undefined;
  return {
    startTime: Number(r[0]),
    paymentDeadline: Number(r[1]),
    biddingDeadline: Number(r[2]),
    totalCollected: BigInt(r[3] as bigint),
    paidCount: Number(r[4]),
    status: Number(r[5]) as CycleStatus,
    winner: r[6] as `0x${string}`,
    settled: Boolean(r[7]),
  };
}

export function potHref(engine: Engine, id: number | bigint | string) {
  return `/pots/${String(id)}?engine=${engine}`;
}

export function engineLabel(engine: Engine) {
  return engine === "circle" ? "Community Circle" : "Business ROSCA";
}

export function sameAddress(a?: string | null, b?: string | null) {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

export function shortAddress(a?: string | null) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "";
}

export function formatDuration(seconds: number) {
  if (seconds <= 0) return "0m";
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3_600);
  const m = Math.floor((seconds % 3_600) / 60);
  const parts: string[] = [];
  if (d) parts.push(`${d}d`);
  if (h) parts.push(`${h}h`);
  if (!d && m) parts.push(`${m}m`);
  return parts.join(" ") || "<1m";
}

export function formatDateTime(ts: number) {
  if (!ts) return "—";
  return new Date(ts * 1000).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Smallest improvement a new lowest bid must make over the standing one (M-03). */
export function minBidStep(standing: bigint) {
  const step = (standing * MIN_BID_STEP_BPS) / BigInt(10_000);
  return step === BigInt(0) ? BigInt(1) : step;
}

/** Highest amount a member may bid right now, or 0n if no valid bid exists. */
export function maxAllowedBid(totalCollected: bigint, lowestBid: bigint, hasLowest: boolean) {
  if (totalCollected <= BigInt(0)) return BigInt(0);
  const ceiling = totalCollected - BigInt(1); // strictly below totalCollected (H-03)
  if (!hasLowest) return ceiling;
  const max = lowestBid - minBidStep(lowestBid);
  return max > BigInt(0) ? (max < ceiling ? max : ceiling) : BigInt(0);
}

export type CyclePhase =
  | "none" // pot not active / no cycle yet
  | "payment" // members pay
  | "bidding" // auction: [paymentDeadline, biddingDeadline)
  | "readyToClose" // deadlines passed, winner can be drawn/declared
  | "drawing" // waiting for Chainlink VRF
  | "completed";

export function cyclePhase(engine: Engine, cycle: Cycle | undefined, now: number): CyclePhase {
  if (!cycle || cycle.status === CycleStatus.None) return "none";
  if (cycle.status === CycleStatus.Completed) return "completed";
  if (cycle.status === CycleStatus.AwaitingVRF) return "drawing";
  if (now < cycle.paymentDeadline) return "payment";
  if (engine === "auction" && now < cycle.biddingDeadline) return "bidding";
  return "readyToClose";
}

/** Earliest time the next cycle may start (F-08 cadence), or 0 if it can start now/never applies. */
export function nextCycleStartsAt(pot: Pot, config: PotConfig | undefined, current: Cycle | undefined) {
  if (pot.currentCycle === 0 || !current || !config) return 0;
  return current.startTime + config.cycleDuration;
}
