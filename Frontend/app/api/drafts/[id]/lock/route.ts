import { withUser } from "@/lib/server/route-auth";
import { lockDraft } from "@/lib/server/drafts";

// POST /api/drafts/:id/lock — freeze the roster; returns { members, merkleRoot, terms } for createPot.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withUser(req, ({ query, identity }) => lockDraft(query, identity, id));
}
