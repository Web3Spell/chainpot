import { withUser } from "@/lib/server/route-auth";
import { readPotTerms } from "@/lib/server/chain";
import { DraftError, markDeployed } from "@/lib/server/drafts";
import { parsePotParams } from "@/lib/server/invites";

// POST /api/drafts/:id/deployed { engine, potId } — verified against the chain before linking.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withUser(req, async ({ query, identity }) => {
    const body = (await req.json().catch(() => ({}))) as { engine?: unknown; potId?: unknown };
    const pot = parsePotParams(body.engine, body.potId);
    if (!pot) throw new DraftError("bad pot id");
    const onchain = await readPotTerms(pot.engine, pot.potId);
    if (!onchain) throw new DraftError("pot not found", 404);
    await markDeployed(query, identity, id, pot.engine, pot.potId, onchain);
    return { engine: pot.engine, potId: pot.potId.toString() };
  });
}
