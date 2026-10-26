import { limitResponse, rateLimit, readJson } from "@/lib/server/limits";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/route-auth";
import { activateMandate, AutopayError } from "@/lib/server/autopay";

// POST /api/autopay/:id/activate { serialized } — the owner-signed permission (no private key inside).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    await rateLimit(auth.query, `user:${auth.identity.userId}:autopay.activate`, 20, 3600);
    const body = await readJson<{ serialized?: unknown }>(req);
    return NextResponse.json(await activateMandate(auth.query, auth.identity, id, body.serialized));
  } catch (err) {
    const limited = limitResponse(err);
    if (limited) return limited;
    if (err instanceof AutopayError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("autopay activate error", err);
    return NextResponse.json({ error: "autopay unavailable" }, { status: 503 });
  }
}
