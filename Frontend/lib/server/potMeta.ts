import type { Engine } from "@/lib/pot";
import type { Query } from "./db";

export interface PotMeta {
  name: string;
  emoji: string | null;
}

export class PotMetaError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const KEY = /^(circle|auction):(\d{1,30})$/;

/** Parse "circle:1,auction:2" (max 100). */
export function parseKeys(raw: string | null): { engine: Engine; potId: string }[] {
  if (!raw) return [];
  return raw.split(",").slice(0, 100).flatMap((k) => {
    const m = KEY.exec(k.trim());
    return m ? [{ engine: m[1] as Engine, potId: m[2] }] : [];
  });
}

export async function getPotMeta(query: Query, keys: { engine: Engine; potId: string }[]): Promise<Record<string, PotMeta>> {
  if (!keys.length) return {};
  const rows = await query<{ engine: Engine; pot_id: string; name: string; emoji: string | null }>(
    `select engine, pot_id, name, emoji from pot_meta where (engine || ':' || pot_id::text) = any($1)`,
    [keys.map((k) => `${k.engine}:${k.potId}`)],
  );
  return Object.fromEntries(rows.map((r) => [`${r.engine}:${r.pot_id}`, { name: r.name, emoji: r.emoji }]));
}

/** Only the pot's on-chain creator may name it (checked by the caller against chain state). */
export async function setPotMeta(query: Query, engine: Engine, potId: bigint, input: { name?: unknown; emoji?: unknown }, creator: string) {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 1 || name.length > 40) throw new PotMetaError("name must be 1–40 characters");
  const emoji = input.emoji == null || input.emoji === "" ? null : String(input.emoji);
  if (emoji && [...emoji].length > 2) throw new PotMetaError("emoji must be a single emoji");
  await query(
    `insert into pot_meta (engine, pot_id, name, emoji, updated_by) values ($1, $2, $3, $4, $5)
     on conflict (engine, pot_id) do update set name = excluded.name, emoji = excluded.emoji, updated_by = excluded.updated_by, updated_at = now()`,
    [engine, potId.toString(), name, emoji, creator.toLowerCase()],
  );
  return { name, emoji };
}
