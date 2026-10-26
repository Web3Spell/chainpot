import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import { inviteRoot } from "@/lib/invite";
import type { Query } from "./db";
import {
  acceptDraft, cancelDraft, createDraft, rotateDraftLink, DraftError, getDraftByToken, listMyDrafts, lockDraft, markDeployed, removeDraftMember,
  unlockDraft, validateTerms, type OnchainPot,
} from "./drafts";

const DAY = 86_400;
const user = (n: string, hex: string) => ({ userId: `did:privy:${n}`, smartWallet: `0x${hex.padStart(40, "0")}` as `0x${string}` });
const org = user("org", "a1");
const bob = user("bob", "b2");
const cat = user("cat", "c3");
const dan = user("dan", "d4");
const terms = { name: "Family", emoji: "🏠", engine: "circle", amountPerCycle: "50000000", memberCount: 3, cycleDuration: 30 * DAY, paymentWindow: 5 * DAY, biddingWindow: 0 };

let query: Query;
beforeAll(async () => {
  const pg = new PGlite();
  for (const f of ["0001_init.sql", "0002_notifications.sql", "0003_autopay.sql", "0004_pot_meta.sql", "0005_link_invites.sql"]) {
    await pg.exec(readFileSync(fileURLToPath(new URL(`../../../supabase/migrations/${f}`, import.meta.url)), "utf8"));
  }
  query = async (text, params) => (await pg.query(text, params)).rows as never;
});

describe("validateTerms mirrors createPot rules", () => {
  it("rejects what the contract would", () => {
    expect(() => validateTerms({ ...terms, amountPerCycle: "999999" })).toThrow(DraftError);
    expect(() => validateTerms({ ...terms, memberCount: 1 })).toThrow(DraftError);
    expect(() => validateTerms({ ...terms, paymentWindow: 3600 })).toThrow(DraftError);
    expect(() => validateTerms({ ...terms, engine: "auction", biddingWindow: 5 * DAY })).toThrow(DraftError);
    expect(validateTerms({ ...terms, engine: "auction", biddingWindow: 6 * DAY }).biddingWindow).toBe(6 * DAY);
  });
});

describe("invite-by-link drafts", () => {
  let id: string;
  let token: string;

  it("organizer creates a draft and holds the first seat", async () => {
    ({ id, token } = await createDraft(query, org, terms));
    const view = await getDraftByToken(query, token);
    expect(view).toMatchObject({ name: "Family", seatsTaken: 1, memberCount: 3, status: "open" });
    expect(JSON.stringify(view)).not.toContain(org.smartWallet); // public view never leaks addresses
    await expect(getDraftByToken(query, "wrong-token")).rejects.toMatchObject({ status: 404 });
  });

  it("friends accept until the circle is full; accepting twice is harmless", async () => {
    expect((await acceptDraft(query, bob, token)).seatsTaken).toBe(2);
    expect((await acceptDraft(query, bob, token)).seatsTaken).toBe(2);
    expect((await acceptDraft(query, cat, token)).seatsTaken).toBe(3);
    await expect(acceptDraft(query, dan, token)).rejects.toMatchObject({ status: 409 });
    await expect(acceptDraft(query, { userId: "did:privy:nowallet" }, token)).rejects.toMatchObject({ status: 401 });
  });

  it("members see the list; only the organizer can remove someone", async () => {
    const [mine] = await listMyDrafts(query, bob);
    expect(mine).toMatchObject({ isCreator: false, members: [org.smartWallet, bob.smartWallet, cat.smartWallet] });
    await expect(removeDraftMember(query, bob, id, cat.smartWallet)).rejects.toMatchObject({ status: 404 });
    await removeDraftMember(query, org, id, cat.smartWallet);
    expect((await getDraftByToken(query, token)).seatsTaken).toBe(2);
    expect((await acceptDraft(query, dan, token)).seatsTaken).toBe(3);
  });

  it("locking freezes the roster for the on-chain create", async () => {
    const lock = await lockDraft(query, org, id);
    expect(lock.members).toHaveLength(3);
    expect(lock.merkleRoot).toBe(inviteRoot(lock.members));
    await expect(removeDraftMember(query, org, id, dan.smartWallet)).rejects.toMatchObject({ status: 409 });
    await unlockDraft(query, org, id);
    await lockDraft(query, org, id);
  });

  it("deploy is accepted only when the chain matches the draft exactly", async () => {
    const members = (await listMyDrafts(query, org))[0].members;
    const pot: OnchainPot = {
      creator: org.smartWallet, merkleRoot: inviteRoot(members), expectedMembers: 3, amountPerCycle: BigInt(50_000_000),
      cycleDuration: 30 * DAY, paymentWindow: 5 * DAY, biddingWindow: 0,
    };
    await expect(markDeployed(query, org, id, "circle", BigInt(7), { ...pot, merkleRoot: inviteRoot(members.slice(0, 2)) })).rejects.toMatchObject({ status: 409 });
    await expect(markDeployed(query, org, id, "circle", BigInt(7), { ...pot, amountPerCycle: BigInt(1) })).rejects.toMatchObject({ status: 409 });
    await expect(markDeployed(query, org, id, "circle", BigInt(7), { ...pot, creator: bob.smartWallet })).rejects.toMatchObject({ status: 409 });
    await markDeployed(query, org, id, "circle", BigInt(7), pot);

    const [d] = await listMyDrafts(query, dan);
    expect(d).toMatchObject({ status: "deployed", potId: "7" });
    const [inv] = await query<{ addresses: string[] }>(`select addresses from pot_invites where engine = 'circle' and pot_id = 7`);
    expect(inv.addresses).toHaveLength(3);
    const [meta] = await query<{ name: string }>(`select name from pot_meta where engine = 'circle' and pot_id = 7`);
    expect(meta.name).toBe("Family");
    await expect(cancelDraft(query, org, id)).rejects.toMatchObject({ status: 409 });
  });

  it("a new link replaces the old one", async () => {
    const d = await createDraft(query, org, terms);
    const fresh = await rotateDraftLink(query, org, d.id);
    await expect(getDraftByToken(query, d.token)).rejects.toMatchObject({ status: 404 });
    expect((await getDraftByToken(query, fresh.token)).id).toBe(d.id);
    await expect(rotateDraftLink(query, bob, d.id)).rejects.toMatchObject({ status: 404 });
  });

  it("cancelled drafts disable the link", async () => {
    const d = await createDraft(query, org, terms);
    await cancelDraft(query, org, d.id);
    await expect(getDraftByToken(query, d.token)).rejects.toMatchObject({ status: 404 });
  });
});
