import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { CycleStatus, PotStatus } from "@/lib/pot";
import type { PotState } from "@/lib/reminders";
import type { Query } from "./db";
import { runReminders } from "./notify";
import { saveProfile } from "./profiles";

const HOUR = 3_600;
const T0 = 1_800_000_000;
const ALICE = "0x00000000000000000000000000000000000000a1" as const;
const BOB = "0x00000000000000000000000000000000000000b2" as const;

let query: Query;
const states: PotState[] = [
  {
    engine: "circle",
    potId: BigInt(1),
    pot: { creator: ALICE, merkleRoot: "0x01", rootFrozen: true, expectedMembers: 2, amountPerCycle: BigInt(50_000_000), status: PotStatus.Active, currentCycle: 1, completedCycles: 0, memberCount: 2 },
    cycle: { startTime: T0, paymentDeadline: T0 + 48 * HOUR, biddingDeadline: 0, totalCollected: BigInt(0), paidCount: 0, status: CycleStatus.Active, winner: "0x0000000000000000000000000000000000000000", settled: false },
    members: [
      { address: ALICE, paid: false, hasWon: false, defaulted: false },
      { address: BOB, paid: false, hasWon: false, defaulted: false },
    ],
  },
];
const now = T0 + 47 * HOUR; // 1h before the deadline → due2h

beforeAll(async () => {
  const pg = new PGlite();
  for (const f of ["0001_init.sql", "0002_notifications.sql"]) {
    await pg.exec(readFileSync(fileURLToPath(new URL(`../../../supabase/migrations/${f}`, import.meta.url)), "utf8"));
  }
  query = async (text, params) => (await pg.query(text, params)).rows as never;
  // Alice opted in to WhatsApp; Bob has no profile, so he's never contacted.
  await saveProfile(query, { userId: "did:privy:alice", smartWallet: ALICE, phone: "+919876543210" }, { country: "IN", channels: { whatsapp: true } });
});

describe("runReminders", () => {
  it("dry run plans without sending or logging", async () => {
    const whatsapp = vi.fn(async () => {});
    const s = await runReminders({ query, states, senders: { whatsapp }, now, appUrl: "https://x", dryRun: true });
    expect(s.planned).toEqual([{ key: "due2h:circle:1:1", channel: "whatsapp" }]);
    expect(whatsapp).not.toHaveBeenCalled();
  });

  it("retries after a failed send, then sends exactly once", async () => {
    const failing = vi.fn(async () => {
      throw new Error("twilio 500");
    });
    expect(await runReminders({ query, states, senders: { whatsapp: failing }, now, appUrl: "https://x" })).toMatchObject({ failed: 1, sent: 0 });

    const whatsapp = vi.fn(async () => {});
    expect(await runReminders({ query, states, senders: { whatsapp }, now, appUrl: "https://x" })).toMatchObject({ sent: 1 });
    expect(whatsapp).toHaveBeenCalledWith("+919876543210", expect.objectContaining({ subject: "Payment due in 2 hours — Community Circle #1" }));

    expect(await runReminders({ query, states, senders: { whatsapp }, now, appUrl: "https://x" })).toMatchObject({ sent: 0, skippedDuplicate: 1 });
    expect(whatsapp).toHaveBeenCalledTimes(1);
  });

  it("respects per-kind preferences", async () => {
    await saveProfile(query, { userId: "did:privy:alice", smartWallet: ALICE, phone: "+919876543210" }, { channels: { whatsapp: true }, prefs: { payment_due: false } });
    const whatsapp = vi.fn(async () => {});
    const s = await runReminders({ query, states, senders: { whatsapp }, now: now + 60, appUrl: "https://x", dryRun: true });
    expect(s.planned).toEqual([]);
  });
});
