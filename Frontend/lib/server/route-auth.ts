import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { getQuery, type Query } from "./db";
import { AuthError, identityFromRequest, type PrivyIdentity } from "./auth";
import { limitResponse, rateLimit } from "./limits";

/** DB + verified Privy identity for a request, or the error response to return. */
export async function requireUser(req: Request): Promise<{ query: Query; identity: PrivyIdentity } | NextResponse> {
  const query = getQuery();
  if (!query) return NextResponse.json({ error: "storage unavailable" }, { status: 503 });
  try {
    return { query, identity: await identityFromRequest(req) };
  } catch (err) {
    const status = err instanceof AuthError && err.message === "Privy is not configured" ? 503 : 401;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
}

/** Shared-secret check for cron routes (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`). */
export function requireCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 503 });
  if (!safeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return null;
}

/** Constant-time string comparison (no early exit that leaks how much of a secret matched). */
export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export interface HandlerOptions {
  status?: number;
  /** [name, max requests, window seconds] per signed-in user. */
  limit?: [string, number, number];
}

/** Run an authenticated handler; typed errors with a `status` become JSON responses. */
export async function withUser(req: Request, fn: (ctx: { query: Query; identity: PrivyIdentity }) => Promise<unknown>, opts: number | HandlerOptions = {}) {
  const { status: okStatus = 200, limit } = typeof opts === "number" ? { status: opts } : opts;
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;
  try {
    if (limit) await rateLimit(auth.query, `user:${auth.identity.userId}:${limit[0]}`, limit[1], limit[2]);
    const body = await fn(auth);
    return NextResponse.json(body ?? { ok: true }, { status: okStatus, headers: { "cache-control": "no-store" } });
  } catch (err) {
    const limited = limitResponse(err);
    if (limited) return limited;
    const status = (err as { status?: number }).status;
    if (typeof status === "number" && status < 500) return NextResponse.json({ error: (err as Error).message }, { status });
    console.error("API error", err);
    return NextResponse.json({ error: "something went wrong" }, { status: 503 });
  }
}
