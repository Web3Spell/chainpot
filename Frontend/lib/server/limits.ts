import { NextResponse } from "next/server";
import type { Query } from "./db";

export class RateLimitError extends Error {
  status = 429;
  constructor(public retryAfter: number) {
    super("Too many requests. Please wait a moment and try again.");
  }
}

export class BodyTooLargeError extends Error {
  status = 413;
  constructor() {
    super("request body too large");
  }
}

const memory = new Map<string, number>(); // dev fallback when there's no database

/**
 * Count one request against `key` in a fixed window; throws RateLimitError over `limit`.
 * Atomic upsert, so concurrent instances can't both slip past the limit.
 */
export async function rateLimit(query: Query | null, key: string, limit: number, windowSec: number, now = Math.floor(Date.now() / 1000)) {
  const start = now - (now % windowSec);
  let count: number;
  if (query) {
    const rows = await query<{ count: number }>(
      `insert into rate_limits (key, window_start, count) values ($1, $2, 1)
       on conflict (key, window_start) do update set count = rate_limits.count + 1 returning count`,
      [key, start],
    );
    count = Number(rows[0].count);
    // Opportunistic cleanup of old windows (≈1% of calls).
    if (Math.random() < 0.01) await query(`delete from rate_limits where window_start < $1`, [now - 86_400]);
  } else {
    const k = `${key}@${start}`;
    count = (memory.get(k) ?? 0) + 1;
    memory.set(k, count);
  }
  if (count > limit) throw new RateLimitError(start + windowSec - now);
}

/** Client IP as seen by the platform proxy (first hop of X-Forwarded-For). */
export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** Parse a JSON body, refusing anything over `maxBytes` (default 32 KB). */
export async function readJson<T = Record<string, unknown>>(req: Request, maxBytes = 32_768): Promise<T> {
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > maxBytes) throw new BodyTooLargeError();
  const text = await req.text();
  if (text.length > maxBytes) throw new BodyTooLargeError();
  try {
    return (text ? JSON.parse(text) : {}) as T;
  } catch {
    return {} as T;
  }
}

export function limitResponse(err: unknown) {
  if (err instanceof RateLimitError) return NextResponse.json({ error: err.message }, { status: 429, headers: { "retry-after": String(err.retryAfter) } });
  if (err instanceof BodyTooLargeError) return NextResponse.json({ error: err.message }, { status: 413 });
  return null;
}
