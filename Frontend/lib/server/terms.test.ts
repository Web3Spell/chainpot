import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { TERMS_VERSION } from "@/lib/legal";
import type { Query } from "./db";
import { hasAccepted, recordAcceptance, TermsError } from "./terms";

let query: Query;
const alice = { userId: "did:privy:alice", smartWallet: "0x00000000000000000000000000000000000000A1" as const };
const NOW = Date.parse("2026-11-25T12:00:00Z");

beforeAll(async () => {
  const pg = new PGlite();
  await pg.exec(readFileSync(fileURLToPath(new URL("../../../supabase/migrations/0007_terms_acceptance.sql", import.meta.url)), "utf8"));
  query = async (text, params) => (await pg.query(text, params)).rows as never;
});

describe("terms acceptance", () => {
  it("rejects an outdated version", async () => {
    await expect(recordAcceptance(query, alice, { version: "2020-01-01" }, null, NOW)).rejects.toBeInstanceOf(TermsError);
    expect(await hasAccepted(query, alice.userId)).toBe(false);
  });

  it("records the current version with the token's address and keeps the first timestamp", async () => {
    const first = await recordAcceptance(query, alice, { version: TERMS_VERSION, acceptedAt: "2026-11-25T11:00:00Z" }, "UA/1", NOW);
    expect(first.acceptedAt).toBe("2026-11-25T11:00:00.000Z");
    const again = await recordAcceptance(query, alice, { version: TERMS_VERSION, acceptedAt: "2026-11-25T11:30:00Z" }, "UA/2", NOW);
    expect(again.acceptedAt).toBe(first.acceptedAt);
    expect(await hasAccepted(query, alice.userId)).toBe(true);
    const rows = await query<{ address: string }>("select address from terms_acceptances where user_id = $1", [alice.userId]);
    expect(rows[0].address).toBe(alice.smartWallet.toLowerCase());
  });

  it("ignores future or very old client timestamps", async () => {
    const bob = { userId: "did:privy:bob" };
    const r = await recordAcceptance(query, bob, { version: TERMS_VERSION, acceptedAt: "2030-01-01T00:00:00Z" }, null, NOW);
    expect(r.acceptedAt).toBe(new Date(NOW).toISOString());
  });
});
