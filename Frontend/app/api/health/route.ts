import { NextResponse } from "next/server";
import { getQuery } from "@/lib/server/db";
import { serverPublicClient } from "@/lib/server/chain";

// GET /api/health — for uptime monitors. Reports reachability only; never configuration or secrets.
// Cached for 15s per instance so a monitor (or an attacker) can't turn it into an RPC amplifier.
export const dynamic = "force-dynamic";

type Check = "ok" | "unconfigured" | "error";
let cached: { at: number; body: Record<string, unknown>; status: number } | undefined;

async function timed<T>(p: Promise<T>, ms = 4000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))]);
}

export async function GET() {
  if (cached && Date.now() - cached.at < 15_000) return NextResponse.json(cached.body, { status: cached.status });

  const query = getQuery();
  const db: Check = !query ? "unconfigured" : await timed(query("select 1")).then(() => "ok" as const, () => "error" as const);
  let block: string | undefined;
  const rpc: Check = await timed(serverPublicClient.getBlockNumber()).then((b) => ((block = b.toString()), "ok" as const), () => "error" as const);
  const indexerUrl = process.env.NEXT_PUBLIC_INDEXER_URL;
  const indexer: Check = !indexerUrl ? "unconfigured" : await timed(fetch(`${indexerUrl.replace(/\/$/, "")}/ready`)).then((r) => (r.ok ? "ok" : "error"), () => "error");

  const healthy = rpc === "ok" && db !== "error" && indexer !== "error";
  const body = { status: healthy ? "ok" : "degraded", db, rpc, indexer, block };
  cached = { at: Date.now(), body, status: healthy ? 200 : 503 };
  return NextResponse.json(body, { status: cached.status, headers: { "cache-control": "no-store" } });
}
