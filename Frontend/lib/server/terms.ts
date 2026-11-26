import { TERMS_VERSION } from "@/lib/legal";
import type { Query } from "./db";
import type { PrivyIdentity } from "./auth";

export class TermsError extends Error {}

export interface AcceptanceInput {
  version?: unknown;
  acceptedAt?: unknown;
}

const MAX_SKEW_MS = 30 * 24 * 3600 * 1000; // accept a client timestamp up to 30 days old (accepted before sign-in)

/**
 * Record that the signed-in user accepted the current legal documents. Only the current version is
 * accepted, the address comes from the verified identity token (never the client), and the first
 * record for a version is kept, so a later call can't rewrite when someone agreed.
 */
export async function recordAcceptance(
  query: Query,
  identity: PrivyIdentity,
  input: AcceptanceInput,
  userAgent: string | null,
  now = Date.now(),
): Promise<{ version: string; acceptedAt: string }> {
  if (input.version !== TERMS_VERSION) throw new TermsError("outdated terms version");

  let acceptedAt = now;
  if (typeof input.acceptedAt === "string") {
    const t = Date.parse(input.acceptedAt);
    if (!Number.isNaN(t) && t <= now && now - t <= MAX_SKEW_MS) acceptedAt = t;
  }

  const address = (identity.account ?? identity.smartWallet)?.toLowerCase() ?? null;
  const rows = await query<{ accepted_at: string | Date }>(
    `insert into terms_acceptances (user_id, version, address, accepted_at, user_agent)
     values ($1, $2, $3, $4, $5)
     on conflict (user_id, version) do update set user_id = excluded.user_id
     returning accepted_at`,
    [identity.userId, TERMS_VERSION, address, new Date(acceptedAt).toISOString(), userAgent?.slice(0, 400) ?? null],
  );
  const at = rows[0]?.accepted_at;
  return { version: TERMS_VERSION, acceptedAt: at instanceof Date ? at.toISOString() : String(at) };
}

export async function hasAccepted(query: Query, userId: string): Promise<boolean> {
  const rows = await query(`select 1 from terms_acceptances where user_id = $1 and version = $2`, [userId, TERMS_VERSION]);
  return rows.length > 0;
}
