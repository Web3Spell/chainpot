import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { autopayPolicies, mandateExpiry, type AutopayScope } from "@/lib/aa/autopay";
import type { Engine } from "@/lib/pot";
import type { Query } from "./db";
import type { PrivyIdentity } from "./auth";

export class AutopayError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

// ---- Session-key encryption (AES-256-GCM). Production: replace with a KMS envelope key. ----

function encryptionKey(): Buffer {
  const raw = process.env.AUTOPAY_KEY_ENCRYPTION_KEY;
  const key = raw ? Buffer.from(raw, "base64") : undefined;
  if (!key || key.length !== 32) throw new AutopayError("autopay is not configured (AUTOPAY_KEY_ENCRYPTION_KEY)", 503);
  return key;
}

export function encryptSecret(plain: string, key = encryptionKey()): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64");
}

export function decryptSecret(blob: string, key = encryptionKey()): string {
  const buf = Buffer.from(blob, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
  decipher.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
}

// ---- Permission blob verification ----

const toJson = (v: unknown) => JSON.parse(JSON.stringify(v, (_k, x) => (typeof x === "bigint" ? x.toString() : x)));

interface SerializedPermission {
  privateKey?: string;
  accountParams?: { accountAddress?: string };
  permissionParams?: { policies?: { policyParams?: unknown }[] };
}

export function decodePermissionBlob(serialized: string): SerializedPermission {
  try {
    return JSON.parse(Buffer.from(serialized, "base64").toString("utf8")) as SerializedPermission;
  } catch {
    throw new AutopayError("malformed permission");
  }
}

/**
 * The blob a browser submits must be for the member's own wallet, contain no private key, and carry
 * exactly the policies the server expects. (The enable signature inside it is checked on-chain
 * against these same policies, so a tampered blob can't be enabled anyway.)
 */
export function verifyPermissionBlob(serialized: string, expected: AutopayScope, wallet: string) {
  const blob = decodePermissionBlob(serialized);
  if (blob.privateKey) throw new AutopayError("permission must not contain a private key");
  if (blob.accountParams?.accountAddress?.toLowerCase() !== wallet.toLowerCase()) throw new AutopayError("permission is for a different account");
  const got = toJson((blob.permissionParams?.policies ?? []).map((p) => p.policyParams));
  const want = toJson(autopayPolicies(expected).map((p) => p.policyParams));
  if (JSON.stringify(got) !== JSON.stringify(want)) throw new AutopayError("permission limits don't match this pot");
}

// ---- Mandates ----

export interface PotFacts {
  exists: boolean;
  isMember: boolean;
  amountPerCycle: bigint;
  cycleDuration: number;
  cyclesLeft: number;
  active: boolean; // Open or Active (not Completed)
}

export interface Mandate {
  id: string;
  engine: Engine;
  potId: string;
  status: "pending" | "active" | "revoked";
  sessionKeyAddress: `0x${string}`;
  amountPerCycle: string;
  validUntil: number;
  lastPaidCycle: number | null;
  lastError: string | null;
}

type Row = {
  id: string; engine: Engine; pot_id: string; status: Mandate["status"]; session_key_address: `0x${string}`;
  amount_per_cycle: string; valid_until: string; last_paid_cycle: number | null; last_error: string | null;
};
const toMandate = (r: Row): Mandate => ({
  id: r.id, engine: r.engine, potId: String(r.pot_id), status: r.status, sessionKeyAddress: r.session_key_address,
  amountPerCycle: String(r.amount_per_cycle), validUntil: Number(r.valid_until), lastPaidCycle: r.last_paid_cycle, lastError: r.last_error,
});
const COLS = "id, engine, pot_id, status, session_key_address, amount_per_cycle, valid_until, last_paid_cycle, last_error";

export function scopeFor(engine: Engine, potId: bigint, facts: PotFacts, now: number): AutopayScope {
  return { engine, potId, amountPerCycle: facts.amountPerCycle, validUntil: mandateExpiry(now, facts.cyclesLeft, facts.cycleDuration) };
}

/** Step 1: server creates the session key; the browser gets only its address + the exact scope to sign. */
export async function createMandate(query: Query, identity: PrivyIdentity, engine: Engine, potId: bigint, facts: PotFacts, now: number) {
  if (!identity.smartWallet) throw new AutopayError("autopay needs a ChainPot smart account");
  if (!facts.exists || !facts.active) throw new AutopayError("pot not found or already finished", 404);
  if (!facts.isMember) throw new AutopayError("join the pot before turning on autopay", 403);
  const scope = scopeFor(engine, potId, facts, now);
  const sessionKey = generatePrivateKey();
  const sessionAddress = privateKeyToAccount(sessionKey).address;
  await query(`insert into profiles (user_id, address) values ($1, $2) on conflict (user_id) do nothing`, [identity.userId, identity.smartWallet.toLowerCase()]);
  // Replace any unfinished grant for this pot.
  await query(
    `update autopay_mandates set status = 'revoked', revoked_at = now(), session_key_cipher = null
      where address = $1 and engine = $2 and pot_id = $3 and status = 'pending'`,
    [identity.smartWallet.toLowerCase(), engine, potId.toString()],
  );
  const rows = await query<Row>(
    `insert into autopay_mandates (user_id, address, engine, pot_id, amount_per_cycle, valid_until, session_key_address, session_key_cipher)
     values ($1, $2, $3, $4, $5, $6, $7, $8) returning ${COLS}`,
    [identity.userId, identity.smartWallet.toLowerCase(), engine, potId.toString(), scope.amountPerCycle.toString(), scope.validUntil, sessionAddress, encryptSecret(sessionKey)],
  ).catch((err: Error) => {
    if (/autopay_one_live_idx|unique/i.test(err.message)) throw new AutopayError("autopay is already on for this pot", 409);
    throw err;
  });
  return { mandate: toMandate(rows[0]), scope };
}

/** Step 2: browser returns the owner-signed permission; verified, then the mandate goes live. */
export async function activateMandate(query: Query, identity: PrivyIdentity, id: string, serialized: unknown) {
  if (typeof serialized !== "string" || serialized.length > 20_000) throw new AutopayError("missing permission");
  const [r] = await query<Row & { user_id: string }>(`select user_id, ${COLS} from autopay_mandates where id = $1`, [id]);
  if (!r || r.user_id !== identity.userId) throw new AutopayError("mandate not found", 404);
  if (r.status !== "pending") throw new AutopayError("mandate is not awaiting activation", 409);
  verifyPermissionBlob(
    serialized,
    { engine: r.engine, potId: BigInt(r.pot_id), amountPerCycle: BigInt(r.amount_per_cycle), validUntil: Number(r.valid_until) },
    identity.smartWallet ?? "",
  );
  const rows = await query<Row>(`update autopay_mandates set status = 'active', serialized_account = $2 where id = $1 returning ${COLS}`, [id, serialized]);
  return toMandate(rows[0]);
}

/** Revoking destroys the session key, so it can never sign again (the on-chain plugin then expires). */
export async function revokeMandate(query: Query, identity: PrivyIdentity, id: string) {
  const rows = await query<Row>(
    `update autopay_mandates set status = 'revoked', revoked_at = now(), session_key_cipher = null, serialized_account = null
      where id = $1 and user_id = $2 and status <> 'revoked' returning ${COLS}`,
    [id, identity.userId],
  );
  if (!rows.length) throw new AutopayError("mandate not found", 404);
  return toMandate(rows[0]);
}

export async function listMandates(query: Query, identity: PrivyIdentity) {
  return (await query<Row>(`select ${COLS} from autopay_mandates where user_id = $1 and status <> 'revoked' order by created_at desc`, [identity.userId])).map(toMandate);
}

// ---- Executor ----

export interface MandateRoundState {
  /** Current round is collecting payments. */
  paymentOpen: boolean;
  cycleId: number;
  paid: boolean;
  defaulted: boolean;
  amountPerCycle: bigint;
  balance: bigint;
  potFinished: boolean;
}

export interface ExecutorDeps {
  query: Query;
  now: number;
  readState: (engine: Engine, potId: bigint, member: `0x${string}`) => Promise<MandateRoundState>;
  /** Sends [approve(vault, amount), payForCycle(potId)] as one user operation with the session key. */
  pay: (m: { engine: Engine; potId: bigint; serialized: string; sessionKey: `0x${string}`; amount: bigint }) => Promise<`0x${string}`>;
}

export async function runAutopay(d: ExecutorDeps) {
  const rows = await d.query<Row & { address: `0x${string}`; serialized_account: string; session_key_cipher: string }>(
    `select ${COLS}, address, serialized_account, session_key_cipher from autopay_mandates where status = 'active'`,
  );
  const summary = { mandates: rows.length, paid: 0, skipped: 0, failed: 0, expired: 0 };
  for (const r of rows) {
    const potId = BigInt(r.pot_id);
    if (Number(r.valid_until) <= d.now) {
      await d.query(`update autopay_mandates set status = 'revoked', revoked_at = now(), session_key_cipher = null where id = $1`, [r.id]);
      summary.expired++;
      continue;
    }
    const s = await d.readState(r.engine, potId, r.address);
    if (s.potFinished) {
      await d.query(`update autopay_mandates set status = 'revoked', revoked_at = now(), session_key_cipher = null where id = $1`, [r.id]);
      summary.expired++;
      continue;
    }
    // Never more than the amount the member agreed to; insufficient balance is left to reminders.
    if (!s.paymentOpen || s.paid || s.defaulted || s.amountPerCycle > BigInt(r.amount_per_cycle) || s.balance < s.amountPerCycle) {
      summary.skipped++;
      continue;
    }
    try {
      await d.query(`update autopay_mandates set last_attempt_at = now() where id = $1`, [r.id]);
      const sessionKey = decryptSecret(r.session_key_cipher) as `0x${string}`;
      await d.pay({ engine: r.engine, potId, serialized: r.serialized_account, sessionKey, amount: s.amountPerCycle });
      await d.query(`update autopay_mandates set last_paid_cycle = $2, last_error = null where id = $1`, [r.id, s.cycleId]);
      summary.paid++;
    } catch (err) {
      await d.query(`update autopay_mandates set last_error = $2 where id = $1`, [r.id, String((err as Error).message).slice(0, 300)]);
      summary.failed++;
    }
  }
  return summary;
}
