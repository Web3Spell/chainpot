import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { autopayPolicies, type AutopayScope } from "@/lib/aa/autopay";
import type { Query } from "./db";
import {
  activateMandate, AutopayError, createMandate, decryptSecret, encryptSecret, listMandates, revokeMandate, runAutopay,
  verifyPermissionBlob, type MandateRoundState, type PotFacts,
} from "./autopay";

const WALLET = "0x00000000000000000000000000000000000000a1" as const;
const alice = { userId: "did:privy:alice", smartWallet: WALLET };
const NOW = 1_800_000_000;
const facts: PotFacts = { exists: true, isMember: true, amountPerCycle: BigInt(50_000_000), cycleDuration: 7 * 86_400, cyclesLeft: 5, active: true };

let query: Query;
process.env.AUTOPAY_KEY_ENCRYPTION_KEY = randomBytes(32).toString("base64");

/** A blob shaped like serializePermissionAccount's output (the parts the server checks). */
const blob = (scope: AutopayScope, o: { account?: string; privateKey?: string } = {}) =>
  Buffer.from(
    JSON.stringify(
      {
        permissionParams: { policies: autopayPolicies(scope).map((p) => ({ policyParams: p.policyParams })) },
        accountParams: { accountAddress: o.account ?? WALLET },
        privateKey: o.privateKey,
      },
      (_k, v) => (typeof v === "bigint" ? v.toString() : v),
    ),
  ).toString("base64");

beforeAll(async () => {
  const pg = new PGlite();
  for (const f of ["0001_init.sql", "0002_notifications.sql", "0003_autopay.sql"]) {
    await pg.exec(readFileSync(fileURLToPath(new URL(`../../../supabase/migrations/${f}`, import.meta.url)), "utf8"));
  }
  query = async (text, params) => (await pg.query(text, params)).rows as never;
});

describe("session key encryption", () => {
  it("round-trips and detects tampering", () => {
    const c = encryptSecret("0xsecret");
    expect(decryptSecret(c)).toBe("0xsecret");
    const bad = Buffer.from(c, "base64");
    bad[bad.length - 1] ^= 1;
    expect(() => decryptSecret(bad.toString("base64"))).toThrow();
  });
});

describe("permission verification", () => {
  const scope: AutopayScope = { engine: "circle", potId: BigInt(1), amountPerCycle: BigInt(50_000_000), validUntil: NOW + 1000 };
  it("accepts exactly the expected limits for the member's wallet", () => {
    expect(() => verifyPermissionBlob(blob(scope), scope, WALLET)).not.toThrow();
  });
  it("rejects wider limits, another wallet, or an embedded key", () => {
    expect(() => verifyPermissionBlob(blob({ ...scope, amountPerCycle: BigInt(51_000_000) }), scope, WALLET)).toThrow(AutopayError);
    expect(() => verifyPermissionBlob(blob({ ...scope, potId: BigInt(2) }), scope, WALLET)).toThrow(AutopayError);
    expect(() => verifyPermissionBlob(blob({ ...scope, validUntil: NOW + 10_000_000 }), scope, WALLET)).toThrow(AutopayError);
    expect(() => verifyPermissionBlob(blob(scope, { account: "0x00000000000000000000000000000000000000b2" }), scope, WALLET)).toThrow(AutopayError);
    expect(() => verifyPermissionBlob(blob(scope, { privateKey: "0x01" }), scope, WALLET)).toThrow(AutopayError);
    expect(() => verifyPermissionBlob("not base64 json", scope, WALLET)).toThrow(AutopayError);
  });
});

describe("mandate lifecycle + executor", () => {
  let id: string;
  let scope: AutopayScope;

  it("refuses non-members and finished pots", async () => {
    await expect(createMandate(query, alice, "circle", BigInt(1), { ...facts, isMember: false }, NOW)).rejects.toMatchObject({ status: 403 });
    await expect(createMandate(query, alice, "circle", BigInt(1), { ...facts, active: false }, NOW)).rejects.toMatchObject({ status: 404 });
  });

  it("creates a pending mandate with a server-held key and a scope to sign", async () => {
    const res = await createMandate(query, alice, "circle", BigInt(1), facts, NOW);
    id = res.mandate.id;
    scope = res.scope;
    expect(res.mandate.status).toBe("pending");
    expect(res.mandate.sessionKeyAddress).toMatch(/^0x[0-9a-fA-F]{40}$/);
    expect(scope.validUntil).toBe(NOW + 6 * 7 * 86_400 + 86_400);
    const [row] = await query<{ session_key_cipher: string }>(`select session_key_cipher from autopay_mandates where id = $1`, [id]);
    expect(decryptSecret(row.session_key_cipher)).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("activates only with a matching signed permission", async () => {
    await expect(activateMandate(query, alice, id, blob({ ...scope, potId: BigInt(9) }))).rejects.toBeInstanceOf(AutopayError);
    await expect(activateMandate(query, { userId: "did:privy:mallory", smartWallet: WALLET }, id, blob(scope))).rejects.toMatchObject({ status: 404 });
    expect((await activateMandate(query, alice, id, blob(scope))).status).toBe("active");
    await expect(createMandate(query, alice, "circle", BigInt(1), facts, NOW)).rejects.toMatchObject({ status: 409 });
  });

  const state = (o: Partial<MandateRoundState> = {}): MandateRoundState => ({
    paymentOpen: true, cycleId: 2, paid: false, defaulted: false, amountPerCycle: BigInt(50_000_000), balance: BigInt(80_000_000), potFinished: false, ...o,
  });

  it("pays once when due, and skips when paid, broke, defaulted or the amount grew", async () => {
    const pay = vi.fn(async () => "0xhash" as const);
    for (const s of [state({ paid: true }), state({ balance: BigInt(1) }), state({ defaulted: true }), state({ paymentOpen: false }), state({ amountPerCycle: BigInt(60_000_000) })]) {
      expect(await runAutopay({ query, now: NOW, readState: async () => s, pay })).toMatchObject({ paid: 0, skipped: 1 });
    }
    expect(pay).not.toHaveBeenCalled();

    expect(await runAutopay({ query, now: NOW, readState: async () => state(), pay })).toMatchObject({ paid: 1 });
    expect(pay).toHaveBeenCalledWith(expect.objectContaining({ engine: "circle", potId: BigInt(1), amount: BigInt(50_000_000), sessionKey: expect.stringMatching(/^0x/) }));
    const [m] = await listMandates(query, alice);
    expect(m.lastPaidCycle).toBe(2);
  });

  it("records failures without dropping the mandate", async () => {
    const pay = vi.fn(async () => {
      throw new Error("bundler: AA21 didn't pay prefund");
    });
    expect(await runAutopay({ query, now: NOW, readState: async () => state({ cycleId: 3 }), pay })).toMatchObject({ failed: 1 });
    expect((await listMandates(query, alice))[0]).toMatchObject({ status: "active", lastError: expect.stringContaining("AA21") });
  });

  it("revoking destroys the key; expiry retires mandates automatically", async () => {
    const revoked = await revokeMandate(query, alice, id);
    expect(revoked.status).toBe("revoked");
    const [row] = await query<{ session_key_cipher: string | null }>(`select session_key_cipher from autopay_mandates where id = $1`, [id]);
    expect(row.session_key_cipher).toBeNull();

    const fresh = await createMandate(query, alice, "circle", BigInt(1), facts, NOW);
    await activateMandate(query, alice, fresh.mandate.id, blob(fresh.scope));
    expect(await runAutopay({ query, now: fresh.scope.validUntil + 1, readState: async () => state(), pay: vi.fn() })).toMatchObject({ expired: 1 });
    expect(await listMandates(query, alice)).toEqual([]);
  });
});
