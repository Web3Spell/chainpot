import { withUser } from "@/lib/server/route-auth";
import { unlockDraft } from "@/lib/server/drafts";

// POST /api/drafts/:id/unlock — creating on-chain was cancelled; reopen the link.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withUser(req, ({ query, identity }) => unlockDraft(query, identity, id));
}
