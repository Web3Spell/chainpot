import { NextResponse } from "next/server";
import { getQuery } from "@/lib/server/db";
import { requireCron } from "@/lib/server/route-auth";
import { readMandateRoundState } from "@/lib/server/chain";
import { runAutopay } from "@/lib/server/autopay";
import { payWithSessionKey } from "@/lib/server/autopay-send";

// GET /api/cron/autopay — pays due installments for members with autopay on. Run every ~15 minutes.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(req: Request) {
  const denied = requireCron(req);
  if (denied) return denied;
  const query = getQuery();
  if (!query) return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });
  const summary = await runAutopay({ query, now: Math.floor(Date.now() / 1000), readState: readMandateRoundState, pay: payWithSessionKey });
  return NextResponse.json(summary, { headers: { "cache-control": "no-store" } });
}
