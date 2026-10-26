// Pure reminder rules: from on-chain state, who should hear what. Missing a payment deadline costs a
// member their place and everything they've paid, so "payment due" reminders are the point.
// Dedupe is by `key` (the notifier's send log), so rules may fire on every run.

import { CycleStatus, PotStatus, ZERO_ADDRESS, cyclePhase, type Cycle, type Engine, type Pot } from "./pot";

export type ReminderKind = "roundStarted" | "due48h" | "due24h" | "due2h" | "biddingOpen" | "youReceived" | "missed";

/** Which notification_prefs flag gates each kind. */
export const PREF_FOR: Record<ReminderKind, "payment_due" | "round_started" | "bidding_open" | "you_received" | "missed"> = {
  roundStarted: "round_started",
  due48h: "payment_due",
  due24h: "payment_due",
  due2h: "payment_due",
  biddingOpen: "bidding_open",
  youReceived: "you_received",
  missed: "missed",
};

export interface MemberState {
  address: `0x${string}`;
  paid: boolean;
  hasWon: boolean;
  defaulted: boolean;
}

export interface PotState {
  engine: Engine;
  potId: bigint;
  pot: Pot;
  cycle?: Cycle; // current cycle
  members: MemberState[];
}

export interface Reminder {
  key: string;
  kind: ReminderKind;
  address: `0x${string}`;
  engine: Engine;
  potId: bigint;
  cycleId: number;
  deadline?: number;
  amount?: bigint;
}

const HOUR = 3_600;
const ROUND_STARTED_WINDOW = 6 * HOUR; // only announce rounds that started recently

export function remindersFor(s: PotState, now: number): Reminder[] {
  const { engine, potId, pot, cycle } = s;
  if (pot.status !== PotStatus.Active || !cycle || pot.currentCycle === 0) return [];
  const cycleId = pot.currentCycle;
  const base = { engine, potId, cycleId };
  const key = (kind: ReminderKind, extra = "") => `${kind}:${engine}:${potId}:${cycleId}${extra}`;
  const out: Reminder[] = [];
  const phase = cyclePhase(engine, cycle, now);

  for (const m of s.members) {
    if (m.defaulted) {
      // Once per pot, not per round.
      out.push({ ...base, kind: "missed", key: `missed:${engine}:${potId}`, address: m.address });
      continue;
    }
    if (phase === "payment" && !m.paid) {
      const left = cycle.paymentDeadline - now;
      const kind: ReminderKind | undefined = left <= 2 * HOUR ? "due2h" : left <= 24 * HOUR ? "due24h" : left <= 48 * HOUR ? "due48h" : undefined;
      if (now - cycle.startTime <= ROUND_STARTED_WINDOW) {
        out.push({ ...base, kind: "roundStarted", key: key("roundStarted"), address: m.address, deadline: cycle.paymentDeadline, amount: pot.amountPerCycle });
      }
      // Only the most urgent window; earlier ones are skipped once passed.
      if (kind) out.push({ ...base, kind, key: key(kind), address: m.address, deadline: cycle.paymentDeadline, amount: pot.amountPerCycle });
    }
    if (engine === "auction" && phase === "bidding" && m.paid && !m.hasWon) {
      out.push({ ...base, kind: "biddingOpen", key: key("biddingOpen"), address: m.address, deadline: cycle.biddingDeadline });
    }
  }

  if (cycle.status === CycleStatus.Completed && cycle.winner !== ZERO_ADDRESS) {
    out.push({ ...base, kind: "youReceived", key: key("youReceived"), address: cycle.winner });
  }
  return out;
}

const usd = (v: bigint) => `$${(Number(v) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;

function when(ts: number) {
  return new Date(ts * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC", timeZoneName: "short" });
}

/** Short message text for SMS/WhatsApp; the subject line doubles as the email subject. */
export function renderReminder(r: Reminder, appUrl: string): { subject: string; body: string } {
  const pot = `${r.engine === "circle" ? "Community Circle" : "Business ROSCA"} #${r.potId}`;
  const link = `${appUrl}/pots/${r.potId}?engine=${r.engine}`;
  switch (r.kind) {
    case "roundStarted":
      return { subject: `Round ${r.cycleId} of ${pot} has started`, body: `Round ${r.cycleId} of ${pot} has started. Please pay ${usd(r.amount!)} by ${when(r.deadline!)}. ${link}` };
    case "due48h":
    case "due24h":
    case "due2h": {
      const left = r.kind === "due48h" ? "2 days" : r.kind === "due24h" ? "24 hours" : "2 hours";
      return { subject: `Payment due in ${left} — ${pot}`, body: `Reminder: your ${usd(r.amount!)} payment for ${pot} is due in ${left} (${when(r.deadline!)}). Missing it means losing your place. ${link}` };
    }
    case "biddingOpen":
      return { subject: `Bidding is open — ${pot}`, body: `Bidding for round ${r.cycleId} of ${pot} is open until ${when(r.deadline!)}. Need the money early? Place a bid. ${link}` };
    case "youReceived":
      return { subject: `You received the pot 🎉 — ${pot}`, body: `Good news: you were picked to receive round ${r.cycleId} of ${pot}. The money is in your ChainPot balance. Keep paying each round. ${link}` };
    case "missed":
      return { subject: `You missed a payment — ${pot}`, body: `A payment deadline in ${pot} was missed, so you can no longer pay or receive in this pot. Contact your pot's creator if you think this is wrong. ${link}` };
  }
}
