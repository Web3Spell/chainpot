import { withUser } from "@/lib/server/route-auth";
import { cancelDraft } from "@/lib/server/drafts";

// DELETE /api/drafts/:id — organizer cancels; the link stops working.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withUser(req, ({ query, identity }) => cancelDraft(query, identity, id));
}
