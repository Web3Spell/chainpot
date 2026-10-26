import { clientIp, limitResponse, rateLimit } from "@/lib/server/limits";
import { NextResponse } from "next/server";
import { getQuery } from "@/lib/server/db";
import { readPotRoot } from "@/lib/server/chain";
import { defaultInviteStore, fetchInviteList } from "@/lib/server/invites";

/** GET /api/invites/:engine/:potId — the invite list for the pot's current on-chain root. */
export async function GET(req: Request, { params }: { params: Promise<{ engine: string; potId: string }> }) {
  const { engine, potId } = await params;
  try {
    await rateLimit(getQuery(), `ip:${clientIp(req)}:invites.get`, 300, 3600);
  } catch (err) {
    return limitResponse(err)!;
  }
  let result;
  try {
    result = await fetchInviteList(engine, potId, { store: defaultInviteStore(getQuery()), readRoot: readPotRoot });
  } catch (err) {
    console.error("invite API error", err);
    return NextResponse.json({ error: "invite storage unavailable" }, { status: 503 });
  }
  return result.ok
    ? NextResponse.json(result.body, { headers: { "cache-control": "public, max-age=30" } })
    : NextResponse.json({ error: result.error }, { status: result.status });
}
