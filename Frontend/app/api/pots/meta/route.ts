import { limitResponse, rateLimit, readJson } from "@/lib/server/limits";
import { NextResponse } from "next/server";
import { getQuery } from "@/lib/server/db";
import { requireUser } from "@/lib/server/route-auth";
import { readPotCreator } from "@/lib/server/chain";
import { parsePotParams } from "@/lib/server/invites";
import { getPotMeta, parseKeys, PotMetaError, setPotMeta } from "@/lib/server/potMeta";

// GET /api/pots/meta?ids=circle:1,auction:2  — public display names
// PUT /api/pots/meta { engine, potId, name, emoji } — creator only (Privy identity == on-chain creator)

export async function GET(req: Request) {
  const query = getQuery();
  if (!query) return NextResponse.json({}); // names are optional; the app falls back to "Community Circle #1"
  const keys = parseKeys(new URL(req.url).searchParams.get("ids"));
  return NextResponse.json(await getPotMeta(query, keys), { headers: { "cache-control": "public, max-age=30" } });
}

export async function PUT(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;
  let body: { engine?: unknown; potId?: unknown; name?: unknown; emoji?: unknown };
  try {
    await rateLimit(auth.query, `user:${auth.identity.userId}:meta.put`, 20, 3600);
    body = await readJson(req);
  } catch (err) {
    return limitResponse(err) ?? NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const pot = parsePotParams(body.engine, body.potId);
  if (!pot) return NextResponse.json({ error: "bad pot id" }, { status: 400 });
  const creator = await readPotCreator(pot.engine, pot.potId);
  if (!creator) return NextResponse.json({ error: "pot not found" }, { status: 404 });
  if (creator.toLowerCase() !== (auth.identity.account ?? auth.identity.smartWallet)?.toLowerCase()) {
    return NextResponse.json({ error: "only the pot's creator can name it" }, { status: 403 });
  }
  try {
    return NextResponse.json(await setPotMeta(auth.query, pot.engine, pot.potId, body, creator));
  } catch (err) {
    if (err instanceof PotMetaError) return NextResponse.json({ error: err.message }, { status: err.status });
    throw err;
  }
}
