import { NextResponse } from "next/server";
import { getQuery } from "@/lib/server/db";
import { readPotRoot } from "@/lib/server/chain";
import { defaultInviteStore, submitInviteList } from "@/lib/server/invites";

/** POST /api/invites  { engine, potId, addresses[] } — store a pot's invite list (verified on-chain). */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
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
