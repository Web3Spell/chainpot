import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { inviteRoot, normalizeAddresses } from "@/lib/invite";
import type { Query } from "./db";
import { fetchInviteList, sqlInviteStore, submitInviteList, type InviteDeps } from "./invites";

const migration = readFileSync(fileURLToPath(new URL("../../../supabase/migrations/0001_init.sql", import.meta.url)), "utf8");

const { valid: LIST } = normalizeAddresses([
  "0x00000000000000000000000000000000000000a1",
  "0x00000000000000000000000000000000000000b2",
  "0x00000000000000000000000000000000000000c3",
]);
const ROOT = inviteRoot(LIST);

let deps: InviteDeps;
let onchainRoot: `0x${string}` | undefined = ROOT;

beforeAll(async () => {
  const pg = new PGlite();
  await pg.exec(migration); // also proves the Supabase migration applies cleanly
  const query: Query = async (text, params) => (await pg.query(text, params)).rows as never;
  deps = { store: sqlInviteStore(query), readRoot: async () => onchainRoot };
});

describe("invite API", () => {
  it("rejects a list that doesn't match the on-chain root", async () => {
    const r = await submitInviteList({ engine: "circle", potId: "1", addresses: LIST.slice(0, 2) }, deps);
    expect(r).toMatchObject({ ok: false, status: 409 });
  });

  it("validates input", async () => {
    expect(await submitInviteList({ engine: "x", potId: "1", addresses: LIST }, deps)).toMatchObject({ status: 400 });
    expect(await submitInviteList({ engine: "circle", potId: "0", addresses: LIST }, deps)).toMatchObject({ status: 400 });
    expect(await submitInviteList({ engine: "circle", potId: "1", addresses: ["nope", ...LIST] }, deps)).toMatchObject({ status: 400 });
  });

  it("stores a matching list (any order, duplicates ignored) and serves it back", async () => {
    const shuffled = [LIST[2], LIST[0], LIST[1], LIST[0].toLowerCase()];
    const put = await submitInviteList({ engine: "circle", potId: "7", addresses: shuffled }, deps);
    expect(put).toMatchObject({ ok: true, status: 201 });
    // idempotent
    expect(await submitInviteList({ engine: "circle", potId: "7", addresses: LIST }, deps)).toMatchObject({ ok: true });

    const got = await fetchInviteList("circle", "7", deps);
    expect(got.ok && new Set(got.body.addresses)).toEqual(new Set(LIST));
    // engines are namespaced
    expect(await fetchInviteList("auction", "7", deps)).toMatchObject({ ok: false, status: 404 });
  });

  it("hides the list once the creator re-issues the root", async () => {
    onchainRoot = `0x${"ab".repeat(32)}`;
    expect(await fetchInviteList("circle", "7", deps)).toMatchObject({ ok: false, status: 404 });
    onchainRoot = undefined;
    expect(await fetchInviteList("circle", "7", deps)).toMatchObject({ ok: false, status: 404, error: "pot not found" });
    onchainRoot = ROOT;
  });
});
