import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/route-auth";
import { AutopayError, revokeMandate } from "@/lib/server/autopay";

// DELETE /api/autopay/:id — turn autopay off; the session key is destroyed immediately.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireUser(req);
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  try {
    return NextResponse.json(await revokeMandate(auth.query, auth.identity, id));
  } catch (err) {
    if (err instanceof AutopayError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("autopay revoke error", err);
    return NextResponse.json({ error: "autopay unavailable" }, { status: 503 });
  }
}
