import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/route-auth";
import { activateMandate, AutopayError } from "@/lib/server/autopay";

// POST /api/autopay/:id/activate { serialized } — the owner-signed permission (no private key inside).
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { serialized?: unknown };
  try {
    return NextResponse.json(await activateMandate(auth.query, auth.identity, id, body.serialized));
  } catch (err) {
    if (err instanceof AutopayError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("autopay activate error", err);
    return NextResponse.json({ error: "autopay unavailable" }, { status: 503 });
  }
}
