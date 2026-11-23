import { withUser } from "@/lib/server/route-auth";
import { removeDraftMember } from "@/lib/server/drafts";

// DELETE /api/drafts/:id/members/:address — organizer removes someone before creating the circle.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; address: string }> }) {
  const { id, address } = await params;
  return withUser(req, ({ query, identity }) => removeDraftMember(query, identity, id, address));
}
