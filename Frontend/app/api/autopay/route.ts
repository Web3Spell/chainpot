import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/route-auth";
import { readPotFacts } from "@/lib/server/chain";
import { AutopayError, createMandate, listMandates } from "@/lib/server/autopay";
import { parsePotParams } from "@/lib/server/invites";

// GET  /api/autopay                      — the caller's live mandates
// POST /api/autopay { engine, potId }    — start a grant: returns the session key ADDRESS and the exact
//                                           limits for the browser to sign. The key itself never leaves the server.

export async function GET(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(await listMandates(auth.query, auth.identity), { headers: { "cache-control": "no-store" } });
}

export async function POST(req: Request) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const body = (await req.json().catch(() => ({}))) as { engine?: unknown; potId?: unknown };
  const pot = parsePotParams(body.engine, body.potId);
  if (!pot) return NextResponse.json({ error: "bad pot id" }, { status: 400 });
  if (!auth.identity.smartWallet) return NextResponse.json({ error: "autopay needs a ChainPot smart account" }, { status: 400 });
  try {
    const facts = await readPotFacts(pot.engine, pot.potId, auth.identity.smartWallet);
    const { mandate, scope } = await createMandate(auth.query, auth.identity, pot.engine, pot.potId, facts, Math.floor(Date.now() / 1000));
    return NextResponse.json({ mandate, scope: { ...scope, potId: scope.potId.toString(), amountPerCycle: scope.amountPerCycle.toString() } }, { status: 201 });
  } catch (err) {
    if (err instanceof AutopayError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("autopay create error", err);
    return NextResponse.json({ error: "autopay unavailable" }, { status: 503 });
  }
}
