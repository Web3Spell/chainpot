import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import type { Query } from "./db";
import { getPotMeta, parseKeys, PotMetaError, setPotMeta } from "./potMeta";

let query: Query;
beforeAll(async () => {
  const pg = new PGlite();
  await pg.exec(readFileSync(fileURLToPath(new URL("../../../supabase/migrations/0004_pot_meta.sql", import.meta.url)), "utf8"));
  query = async (text, params) => (await pg.query(text, params)).rows as never;
});

describe("pot names", () => {
  it("parses id lists defensively", () => {
    expect(parseKeys("circle:1, auction:22,bogus,circle:x")).toEqual([{ engine: "circle", potId: "1" }, { engine: "auction", potId: "22" }]);
    expect(parseKeys(null)).toEqual([]);
  });
  it("stores, updates and reads names", async () => {
    await setPotMeta(query, "circle", BigInt(1), { name: "  Family Circle ", emoji: "🏠" }, "0xABC");
    await setPotMeta(query, "circle", BigInt(1), { name: "Family", emoji: "🏠" }, "0xabc");
    expect(await getPotMeta(query, parseKeys("circle:1,auction:1"))).toEqual({ "circle:1": { name: "Family", emoji: "🏠" } });
  });
  it("validates", async () => {
    await expect(setPotMeta(query, "circle", BigInt(2), { name: "" }, "0x1")).rejects.toBeInstanceOf(PotMetaError);
    await expect(setPotMeta(query, "circle", BigInt(2), { name: "x".repeat(41) }, "0x1")).rejects.toBeInstanceOf(PotMetaError);
    await expect(setPotMeta(query, "circle", BigInt(2), { name: "ok", emoji: "not-an-emoji" }, "0x1")).rejects.toBeInstanceOf(PotMetaError);
  });
});
