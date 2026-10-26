import { clientIp, limitResponse, rateLimit, readJson } from "@/lib/server/limits";
import { NextResponse } from "next/server";
import { getQuery } from "@/lib/server/db";
import { readPotRoot } from "@/lib/server/chain";
import { defaultInviteStore, submitInviteList } from "@/lib/server/invites";

/** POST /api/invites  { engine, potId, addresses[] } — store a pot's invite list (verified on-chain). */
export async function POST(req: Request) {
  let body: unknown;
  try {
    // Public endpoint (each call reads the chain): limit per IP.
    await rateLimit(getQuery(), `ip:${clientIp(req)}:invites.post`, 30, 3600);
    body = await readJson(req);
  } catch (err) {
    return limitResponse(err) ?? NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  let result;
  try {
    result = await submitInviteList(body, { store: defaultInviteStore(getQuery()), readRoot: readPotRoot });
  } catch (err) {
    console.error("invite API error", err);
    return NextResponse.json({ error: "invite storage unavailable" }, { status: 503 });
  }
  return result.ok ? NextResponse.json(result.body, { status: result.status }) : NextResponse.json({ error: result.error }, { status: result.status });
}
