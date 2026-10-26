import { NextResponse } from "next/server";
import { getQuery } from "@/lib/server/db";
import { requireCron } from "@/lib/server/route-auth";
import { readActivePotStates } from "@/lib/server/chain";
import { runReminders, sendersFromEnv } from "@/lib/server/notify";

// GET /api/cron/reminders — run by Vercel Cron (or the keeper worker) every ~15 minutes.
// Auth: `Authorization: Bearer $CRON_SECRET` (Vercel Cron sends this automatically). `?dryRun=1`
// computes what would be sent without sending or logging.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = requireCron(req);
  if (denied) return denied;

  const query = getQuery();
  if (!query) return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 503 });

  const url = new URL(req.url);
  const summary = await runReminders({
    query,
    states: await readActivePotStates(),
    senders: sendersFromEnv(),
    now: Math.floor(Date.now() / 1000),
    appUrl: process.env.APP_URL ?? url.origin,
    dryRun: url.searchParams.get("dryRun") === "1",
  });
  return NextResponse.json(summary, { headers: { "cache-control": "no-store" } });
}
