import { NextResponse } from "next/server";
import { getQuery } from "@/lib/server/db";
import { withUser } from "@/lib/server/route-auth";
import { acceptDraft, getDraftByToken } from "@/lib/server/drafts";

type Ctx = { params: Promise<{ token: string }> };

// GET  /api/drafts/join/:token — public terms + seats (no member addresses)
// POST /api/drafts/join/:token — accept a seat (signed in)
export async function GET(_req: Request, { params }: Ctx) {
  const query = getQuery();
  if (!query) return NextResponse.json({ error: "storage unavailable" }, { status: 503 });
  const { token } = await params;
  try {
    return NextResponse.json(await getDraftByToken(query, token), { headers: { "cache-control": "no-store" } });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: (err as { status?: number }).status ?? 503 });
  }
}

export async function POST(req: Request, { params }: Ctx) {
  const { token } = await params;
  return withUser(req, ({ query, identity }) => acceptDraft(query, identity, token));
}
