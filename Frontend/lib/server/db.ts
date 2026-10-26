import postgres from "postgres";

/** Minimal query surface shared by postgres.js (prod) and PGlite (tests). */
export type Query = <T = Record<string, unknown>>(text: string, params?: unknown[]) => Promise<T[]>;

let cached: Query | null | undefined;

/** Server-side Postgres (Supabase) from DATABASE_URL, or null when not configured. */
export function getQuery(): Query | null {
  if (cached !== undefined) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) return (cached = null);
  // prepare:false keeps this compatible with Supabase's transaction pooler (pgbouncer).
  const sql = postgres(url, { prepare: false, max: 5 });
  cached = async <T,>(text: string, params: unknown[] = []) =>
    (await sql.unsafe(text, params as postgres.ParameterOrJSON<never>[])) as unknown as T[];
  return cached;
}
