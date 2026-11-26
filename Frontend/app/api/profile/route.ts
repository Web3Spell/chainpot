import { limitResponse, rateLimit, readJson } from "@/lib/server/limits";
import { NextResponse } from "next/server";
import { getQuery } from "@/lib/server/db";
import { AuthError, identityFromRequest } from "@/lib/server/auth";
import { getProfile, ProfileError, saveProfile } from "@/lib/server/profiles";

// GET/PUT /api/profile — the signed-in user's country, display name and reminder settings.
// Auth: Privy identity token (`privy-id-token` header or cookie). Contacts come from that token.

async function handle(req: Request, write: boolean) {
  const query = getQuery();
  if (!query) return NextResponse.json({ error: "profile storage unavailable" }, { status: 503 });
  let identity;
  try {
    identity = await identityFromRequest(req);
  } catch (err) {
    const status = err instanceof AuthError && err.message === "Privy is not configured" ? 503 : 401;
    return NextResponse.json({ error: (err as Error).message }, { status });
  }
  try {
    if (!write) return NextResponse.json(await getProfile(query, identity), { headers: { "cache-control": "no-store" } });
    await rateLimit(query, `user:${identity.userId}:profile.put`, 30, 3600);
    const body = await readJson(req);
    return NextResponse.json(await saveProfile(query, identity, (body ?? {}) as never), { headers: { "cache-control": "no-store" } });
  } catch (err) {
    const limited = limitResponse(err);
    if (limited) return limited;
    if (err instanceof ProfileError) return NextResponse.json({ error: err.message }, { status: 400 });
    console.error("profile API error", err);
    return NextResponse.json({ error: "profile storage unavailable" }, { status: 503 });
  }
}

export const GET = (req: Request) => handle(req, false);
export const PUT = (req: Request) => handle(req, true);
