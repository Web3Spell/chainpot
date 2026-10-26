import { withUser } from "@/lib/server/route-auth";
import { createDraft, listMyDrafts } from "@/lib/server/drafts";

// GET  /api/drafts — drafts I organize or accepted
// POST /api/drafts { name, emoji, engine, amountPerCycle, memberCount, cycleDuration, paymentWindow, biddingWindow }
//      → { id, token } — share `${origin}/join/${token}`
export const GET = (req: Request) => withUser(req, ({ query, identity }) => listMyDrafts(query, identity));
export const POST = (req: Request) =>
  withUser(req, async ({ query, identity }) => createDraft(query, identity, ((await req.json().catch(() => ({}))) ?? {}) as Record<string, unknown>), 201);
