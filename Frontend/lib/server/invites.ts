import { inviteRoot, normalizeAddresses } from "@/lib/invite";
import { MAX_MEMBERS, MIN_MEMBERS, type Engine } from "@/lib/pot";
import type { Query } from "./db";

export interface InviteStore {
  put(engine: Engine, potId: bigint, root: string, addresses: `0x${string}`[]): Promise<void>;
  get(engine: Engine, potId: bigint, root: string): Promise<`0x${string}`[] | undefined>;
}

export function sqlInviteStore(query: Query): InviteStore {
  return {
    async put(engine, potId, root, addresses) {
      await query(
        `insert into pot_invites (engine, pot_id, merkle_root, addresses) values ($1, $2, $3, $4)
         on conflict (engine, pot_id, merkle_root) do nothing`,
        [engine, potId.toString(), root.toLowerCase(), addresses],
      );
    },
    async get(engine, potId, root) {
      const rows = await query<{ addresses: string[] }>(
        `select addresses from pot_invites where engine = $1 and pot_id = $2 and merkle_root = $3`,
        [engine, potId.toString(), root.toLowerCase()],
      );
      return rows[0]?.addresses as `0x${string}`[] | undefined;
    },
  };
}

/** Dev fallback when DATABASE_URL isn't set: per-process memory (lost on restart). */
export function memoryInviteStore(): InviteStore {
  const m = new Map<string, `0x${string}`[]>();
  const k = (e: string, p: bigint, r: string) => `${e}:${p}:${r.toLowerCase()}`;
  return {
    async put(e, p, r, a) {
      if (!m.has(k(e, p, r))) m.set(k(e, p, r), a);
    },
    async get(e, p, r) {
      return m.get(k(e, p, r));
    },
  };
}

export interface InviteDeps {
  store: InviteStore;
  readRoot: (engine: Engine, potId: bigint) => Promise<`0x${string}` | undefined>;
}

export type InviteResult =
  | { ok: true; status: number; body: { engine: Engine; potId: string; merkleRoot: string; addresses: `0x${string}`[] } }
  | { ok: false; status: number; error: string };

export function parsePotParams(engine: unknown, potId: unknown): { engine: Engine; potId: bigint } | undefined {
  if (engine !== "circle" && engine !== "auction") return undefined;
  if (typeof potId !== "string" && typeof potId !== "number") return undefined;
  if (!/^\d{1,30}$/.test(String(potId)) || BigInt(potId) === BigInt(0)) return undefined;
  return { engine, potId: BigInt(potId) };
}

/**
 * Store an invite list. Trustless: accepted only if it rebuilds the pot's CURRENT on-chain Merkle
 * root, so anyone may submit it (creator, any invitee) and nobody can store a wrong list.
 */
export async function submitInviteList(input: unknown, deps: InviteDeps): Promise<InviteResult> {
  const body = (input ?? {}) as { engine?: unknown; potId?: unknown; addresses?: unknown };
  const pot = parsePotParams(body.engine, body.potId);
  if (!pot) return { ok: false, status: 400, error: "engine must be circle|auction and potId a positive integer" };
  if (!Array.isArray(body.addresses) || body.addresses.length > MAX_MEMBERS * 2) {
    return { ok: false, status: 400, error: "addresses must be an array" };
  }
  const { valid, invalid } = normalizeAddresses(body.addresses.map(String));
  if (invalid.length) return { ok: false, status: 400, error: `invalid addresses: ${invalid.slice(0, 3).join(", ")}` };
  if (valid.length < MIN_MEMBERS || valid.length > MAX_MEMBERS) return { ok: false, status: 400, error: "invite list size out of range" };

  const onchain = await deps.readRoot(pot.engine, pot.potId);
  if (!onchain) return { ok: false, status: 404, error: "pot not found" };
  const root = inviteRoot(valid);
  if (root.toLowerCase() !== onchain.toLowerCase()) {
    return { ok: false, status: 409, error: "invite list does not match the pot's on-chain invite root" };
  }
  await deps.store.put(pot.engine, pot.potId, root, valid);
  return { ok: true, status: 201, body: { engine: pot.engine, potId: pot.potId.toString(), merkleRoot: root, addresses: valid } };
}

/** Fetch the invite list matching the pot's current root (a re-issued root hides the old list). */
export async function fetchInviteList(engine: unknown, potId: unknown, deps: InviteDeps): Promise<InviteResult> {
  const pot = parsePotParams(engine, potId);
  if (!pot) return { ok: false, status: 400, error: "bad pot id" };
  const onchain = await deps.readRoot(pot.engine, pot.potId);
  if (!onchain) return { ok: false, status: 404, error: "pot not found" };
  const addresses = await deps.store.get(pot.engine, pot.potId, onchain);
  if (!addresses) return { ok: false, status: 404, error: "no invite list stored for this pot" };
  return { ok: true, status: 200, body: { engine: pot.engine, potId: pot.potId.toString(), merkleRoot: onchain.toLowerCase(), addresses } };
}

let fallbackStore: InviteStore | undefined;
export function defaultInviteStore(query: Query | null): InviteStore {
  if (query) return sqlInviteStore(query);
  if (process.env.NODE_ENV === "production") throw new Error("DATABASE_URL is required in production");
  return (fallbackStore ??= memoryInviteStore());
}
