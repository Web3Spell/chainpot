import { NextResponse } from "next/server";
import { getQuery, type Query } from "./db";
import { AuthError, identityTokenFrom, verifyIdentityToken, type PrivyIdentity } from "./auth";

/** DB + verified Privy identity for a request, or the error response to return. */
export async function requireUser(req: Request): Promise<{ query: Query; identity: PrivyIdentity } | NextResponse> {
  const query = getQuery();
  if (!query) return NextResponse.json({ error: "storage unavailable" }, { status: 503 });
  try {
    return { query, identity: await verifyIdentityToken(identityTokenFrom(req)) };
  } catch (err) {
    const status = err instanceof AuthError && err.message === "Privy is not configured" ? 503 : 401;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}

/** Shared-secret check for cron routes (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`). */
export function requireCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (req.headers.get("authorization") !== `Bearer ${secret}`) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}

/** Run an authenticated handler; typed errors with a `status` become JSON responses. */
export async function withUser(req: Request, fn: (ctx: { query: Query; identity: PrivyIdentity }) => Promise<unknown>, okStatus = 200) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    const body = await fn(auth);
    return NextResponse.json(body ?? { ok: true }, { status: okStatus, headers: { "cache-control": "no-store" } });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (typeof status === "number" && status < 500) return NextResponse.json({ error: (err as Error).message }, { status });
    console.error("API error", err);
    return NextResponse.json({ error: "something went wrong" }, { status: 503 });
  }
}
