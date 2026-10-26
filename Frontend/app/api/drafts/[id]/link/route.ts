import { withUser } from "@/lib/server/route-auth";
import { rotateDraftLink } from "@/lib/server/drafts";

// POST /api/drafts/:id/link — organizer gets a fresh invite link; the previous one stops working.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withUser(req, ({ query, identity }) => rotateDraftLink(query, identity, id));
}
