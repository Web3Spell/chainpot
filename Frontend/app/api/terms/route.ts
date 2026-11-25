import { NextResponse } from "next/server";
import { getQuery } from "@/lib/server/db";
import { AuthError, identityTokenFrom, verifyIdentityToken } from "@/lib/server/auth";
import { limitResponse, rateLimit, readJson } from "@/lib/server/limits";
import { hasAccepted, recordAcceptance, TermsError } from "@/lib/server/terms";

// GET  /api/terms — has the signed-in user accepted the current Terms version?
// POST /api/terms — record acceptance of the current version ({ version, acceptedAt }).
// Auth: Privy identity token. The address stored comes from the verified token, not the body.

async function handle(req: Request, write: boolean) {
  const query = getQuery();
  if (!query) return NextResponse.json({ error: "storage unavailable" }, { status: 503 });
  let identity;
  try {
    identity = await verifyIdentityToken(identityTokenFrom(req));
  } catch (err) {
    const status = err instanceof AuthError && err.message === "Privy is not configured" ? 503 : 401;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
  try {
    if (!write) {
      return NextResponse.json({ accepted: await hasAccepted(query, identity.userId) }, { headers: { "cache-control": "no-store" } });
    }
    await rateLimit(query, `user:${identity.userId}:terms.post`, 20, 3600);
    const body = ((await readJson(req)) ?? {}) as Record<string, unknown>;
    const out = await recordAcceptance(query, identity, body, req.headers.get("user-agent"));
    return NextResponse.json(out, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    const limited = limitResponse(err);
    if (limited) return limited;
    if (err instanceof TermsError) return NextResponse.json({ error: err.message }, { status: 409 });
    console.error("terms API error", err);
    return NextResponse.json({ error: "storage unavailable" }, { status: 503 });
  }
}

export const GET = (req: Request) => handle(req, false);
export const POST = (req: Request) => handle(req, true);
