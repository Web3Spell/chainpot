import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { SignJWT, generateKeyPair } from "jose";
import { beforeAll, describe, expect, it } from "vitest";
import { AuthError, verifyIdentityToken } from "./auth";
import type { Query } from "./db";
import { getProfile, ProfileError, recipientsFor, saveProfile } from "./profiles";

const APP_ID = "test-app";
const WALLET = "0x00000000000000000000000000000000000000A1";
const migrations = ["0001_init.sql", "0002_notifications.sql"].map((f) =>
  readFileSync(fileURLToPath(new URL(`../../../supabase/migrations/${f}`, import.meta.url)), "utf8"),
);

let keys: Awaited<ReturnType<typeof generateKeyPair>>;
let query: Query;

const token = (claims: Record<string, unknown>, o: { aud?: string; iss?: string; key?: CryptoKey } = {}) =>
  new SignJWT(claims)
    .setProtectedHeader({ alg: "ES256" })
    .setIssuer(o.iss ?? "privy.io")
    .setAudience(o.aud ?? APP_ID)
    .setSubject("did:privy:alice")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(o.key ?? keys.privateKey);

const linked = JSON.stringify([
  { type: "phone", number: "+919876543210" },
  { type: "email", address: "alice@example.com" },
  { type: "smart_wallet", address: WALLET },
  { type: "wallet", address: "0x00000000000000000000000000000000000000ff" },
]);

beforeAll(async () => {
  keys = await generateKeyPair("ES256");
  const pg = new PGlite();
  for (const m of migrations) await pg.exec(m);
  query = async (text, params) => (await pg.query(text, params)).rows as never;
});

describe("Privy identity token", () => {
  it("accepts a valid token and reads verified contacts + smart wallet", async () => {
    const id = await verifyIdentityToken(await token({ linked_accounts: linked }), { appId: APP_ID, key: keys.publicKey });
    expect(id).toEqual({ userId: "did:privy:alice", smartWallet: WALLET, externalWallets: [], email: "alice@example.com", phone: "+919876543210" });
  });

  it("rejects wrong audience, issuer, signer or a missing token", async () => {
    const other = await generateKeyPair("ES256");
    const opts = { appId: APP_ID, key: keys.publicKey };
    await expect(verifyIdentityToken(await token({}, { aud: "other-app" }), opts)).rejects.toBeInstanceOf(AuthError);
    await expect(verifyIdentityToken(await token({}, { iss: "evil.io" }), opts)).rejects.toBeInstanceOf(AuthError);
    await expect(verifyIdentityToken(await token({}, { key: other.privateKey }), opts)).rejects.toBeInstanceOf(AuthError);
    await expect(verifyIdentityToken(null, opts)).rejects.toBeInstanceOf(AuthError);
  });
});

describe("profiles", () => {
  const identity = { userId: "did:privy:alice", smartWallet: WALLET as `0x${string}`, email: "alice@example.com", phone: "+919876543210" };

  it("stores country (currency derived server-side) and channel choices", async () => {
    const p = await saveProfile(query, identity, { country: "IN", channels: { whatsapp: true, email: true }, prefs: { bidding_open: false } });
    expect(p).toMatchObject({ country: "IN", currency: "INR", channels: { email: true, sms: false, whatsapp: true }, prefs: { bidding_open: false, payment_due: true } });
    expect((await getProfile(query, identity)).currency).toBe("INR");
  });

  it("only uses verified contacts, and only for enabled channels", async () => {
    const [r] = await recipientsFor(query, [WALLET.toLowerCase()]);
    expect(r.contacts.sort((a, b) => a.kind.localeCompare(b.kind))).toEqual([
      { kind: "email", value: "alice@example.com" },
      { kind: "whatsapp", value: "+919876543210" },
    ]);
    await saveProfile(query, identity, { channels: { email: false } });
    expect(await recipientsFor(query, [WALLET])).toEqual([]);
  });

  it("validates input", async () => {
    await expect(saveProfile(query, identity, { country: "XX" })).rejects.toBeInstanceOf(ProfileError);
    await expect(saveProfile(query, { userId: "did:privy:bob" }, { channels: { sms: true } })).rejects.toBeInstanceOf(ProfileError);
    await expect(saveProfile(query, identity, { channels: { email: "yes" } })).rejects.toBeInstanceOf(ProfileError);
  });
});
