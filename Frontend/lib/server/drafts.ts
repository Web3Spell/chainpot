import { createHash, randomBytes } from "node:crypto";
import { inviteRoot } from "@/lib/invite";
import { BETA_MAX_MEMBERS, BETA_MAX_USD_PER_ROUND } from "@/config/network";
import { MAX_MEMBERS, MIN_AMOUNT_PER_CYCLE, MIN_BIDDING_PHASE, MIN_MEMBERS, MIN_PAYMENT_WINDOW, type Engine } from "@/lib/pot";
import type { Query } from "./db";
import type { PrivyIdentity } from "./auth";

export class DraftError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

export interface DraftTerms {
  name: string;
  emoji: string | null;
  engine: Engine;
  amountPerCycle: bigint;
  memberCount: number;
  cycleDuration: number;
  paymentWindow: number;
  biddingWindow: number;
}

export interface DraftView extends Omit<DraftTerms, "amountPerCycle"> {
  id: string;
  amountPerCycle: string;
  status: "open" | "locked" | "deployed" | "cancelled";
  seatsTaken: number;
  potId: string | null;
}

export interface MyDraft extends DraftView {
  isCreator: boolean;
  members: `0x${string}`[];
}

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

/** Same rules the engine enforces at createPot, so a draft can always be deployed. */
export function validateTerms(input: Record<string, unknown>): DraftTerms {
  const name = typeof input.name === "string" ? input.name.trim() : "";
  if (name.length < 1 || name.length > 40) throw new DraftError("name must be 1–40 characters");
  const emoji = input.emoji == null || input.emoji === "" ? null : String(input.emoji);
  if (emoji && [...emoji].length > 8) throw new DraftError("emoji too long");
  const engine = input.engine;
  if (engine !== "circle" && engine !== "auction") throw new DraftError("engine must be circle or auction");
  let amount: bigint;
  try {
    amount = BigInt(String(input.amountPerCycle));
  } catch {
    throw new DraftError("amountPerCycle must be an integer (USDC base units)");
  }
  const int = (k: string) => {
    const v = Number(input[k]);
    if (!Number.isInteger(v) || v < 0) throw new DraftError(`${k} must be a non-negative integer`);
    return v;
  };
  const memberCount = int("memberCount");
  const cycle = int("cycleDuration");
  const pay = int("paymentWindow");
  const bid = engine === "auction" ? int("biddingWindow") : 0;
  if (amount < MIN_AMOUNT_PER_CYCLE) throw new DraftError("minimum is $1 per round");
  if (BETA_MAX_USD_PER_ROUND && amount > BigInt(BETA_MAX_USD_PER_ROUND) * BigInt(1_000_000)) throw new DraftError(`maximum is $${BETA_MAX_USD_PER_ROUND} per round during the beta`);
  const maxMembers = Math.min(MAX_MEMBERS, BETA_MAX_MEMBERS);
  if (memberCount < MIN_MEMBERS || memberCount > maxMembers) throw new DraftError(`a circle needs ${MIN_MEMBERS}–${maxMembers} members`);
  if (pay < MIN_PAYMENT_WINDOW || pay >= cycle) throw new DraftError("time to pay must be at least 1 day and shorter than the round");
  if (engine === "auction" && (bid < pay + MIN_BIDDING_PHASE || bid >= cycle)) throw new DraftError("bidding must close 1h+ after payments and before the round ends");
  return { name, emoji, engine, amountPerCycle: amount, memberCount, cycleDuration: cycle, paymentWindow: pay, biddingWindow: bid };
}

async function ensureProfile(query: Query, identity: PrivyIdentity) {
  // Smart wallet, or a Privy-verified outside wallet (Rabby, MetaMask…). A brand-new phone/email account's
  // first token can predate its smart wallet; the client refreshes and retries.
  const account = identity.account ?? identity.smartWallet;
  if (!account) {
    throw new DraftError("Your ChainPot account is still being set up. Wait a few seconds and try again.", 401);
  }
  await query(
    `insert into profiles (user_id, address) values ($1, $2)
     on conflict (user_id) do update set address = coalesce(profiles.address, excluded.address)`,
    [identity.userId, account.toLowerCase()],
  );
  return account.toLowerCase();
}

type Row = {
  id: string; name: string; emoji: string | null; engine: Engine; amount_per_cycle: string; member_count: number;
  cycle_duration: number; payment_window: number; bidding_window: number; status: DraftView["status"]; pot_id: string | null;
  creator_user_id: string; seats: string;
};
const SELECT = `select d.id, d.name, d.emoji, d.engine, d.amount_per_cycle, d.member_count, d.cycle_duration, d.payment_window,
                       d.bidding_window, d.status, d.pot_id, d.creator_user_id,
                       (select count(*) from draft_members m where m.draft_id = d.id) as seats
                  from circle_drafts d`;
const toView = (r: Row): DraftView => ({
  id: r.id, name: r.name, emoji: r.emoji, engine: r.engine, amountPerCycle: String(r.amount_per_cycle), memberCount: r.member_count,
  cycleDuration: r.cycle_duration, paymentWindow: r.payment_window, biddingWindow: r.bidding_window, status: r.status,
  seatsTaken: Number(r.seats), potId: r.pot_id == null ? null : String(r.pot_id),
});

export async function createDraft(query: Query, identity: PrivyIdentity, input: Record<string, unknown>) {
  const t = validateTerms(input);
  const address = await ensureProfile(query, identity);
  const token = randomBytes(24).toString("base64url");
  const [d] = await query<{ id: string }>(
    `insert into circle_drafts (creator_user_id, name, emoji, engine, amount_per_cycle, member_count, cycle_duration, payment_window, bidding_window, invite_token_hash)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning id`,
    [identity.userId, t.name, t.emoji, t.engine, t.amountPerCycle.toString(), t.memberCount, t.cycleDuration, t.paymentWindow, t.biddingWindow, hashToken(token)],
  );
  await query(`insert into draft_members (draft_id, user_id, address) values ($1, $2, $3)`, [d.id, identity.userId, address]);
  return { id: d.id, token };
}

/** Public, unauthenticated view for the join page: terms and seat count, never member addresses. */
export async function getDraftByToken(query: Query, token: string): Promise<DraftView> {
  const [r] = await query<Row>(`${SELECT} where d.invite_token_hash = $1`, [hashToken(token)]);
  if (!r || r.status === "cancelled") throw new DraftError("this invite link isn't valid anymore", 404);
  return toView(r);
}

export async function acceptDraft(query: Query, identity: PrivyIdentity, token: string): Promise<DraftView> {
  const address = await ensureProfile(query, identity);
  const [r] = await query<Row>(`${SELECT} where d.invite_token_hash = $1`, [hashToken(token)]);
  if (!r || r.status === "cancelled") throw new DraftError("this invite link isn't valid anymore", 404);
  const already = await query(`select 1 from draft_members where draft_id = $1 and user_id = $2`, [r.id, identity.userId]);
  if (already.length) return toView(r);
  if (r.status !== "open") throw new DraftError("the organizer has already started creating this circle", 409);
  // Seat check and insert in one statement so two people can't take the last seat.
  const inserted = await query(
    `insert into draft_members (draft_id, user_id, address)
     select $1, $2, $3 where (select count(*) from draft_members where draft_id = $1) < $4
     on conflict do nothing returning user_id`,
    [r.id, identity.userId, address, r.member_count],
  );
  if (!inserted.length) throw new DraftError("this circle is full", 409);
  return (await query<Row>(`${SELECT} where d.id = $1`, [r.id])).map(toView)[0];
}

export async function listMyDrafts(query: Query, identity: PrivyIdentity): Promise<MyDraft[]> {
  const rows = await query<Row>(
    `${SELECT} where d.status <> 'cancelled' and exists (select 1 from draft_members m where m.draft_id = d.id and m.user_id = $1)
      order by d.created_at desc`,
    [identity.userId],
  );
  const out: MyDraft[] = [];
  for (const r of rows) {
    const members = await query<{ address: `0x${string}` }>(`select address from draft_members where draft_id = $1 order by accepted_at`, [r.id]);
    out.push({ ...toView(r), isCreator: r.creator_user_id === identity.userId, members: members.map((m) => m.address) });
  }
  return out;
}

async function creatorDraft(query: Query, identity: PrivyIdentity, id: string) {
  const [r] = await query<Row>(`${SELECT} where d.id = $1`, [id]);
  if (!r || r.creator_user_id !== identity.userId) throw new DraftError("draft not found", 404);
  return r;
}

export async function removeDraftMember(query: Query, identity: PrivyIdentity, id: string, address: string) {
  const r = await creatorDraft(query, identity, id);
  if (r.status !== "open") throw new DraftError("can't change members while the circle is being created", 409);
  if (address.toLowerCase() === (identity.account ?? identity.smartWallet)?.toLowerCase()) throw new DraftError("you can't remove yourself; cancel the draft instead");
  await query(`delete from draft_members where draft_id = $1 and address = $2`, [id, address.toLowerCase()]);
}

export async function cancelDraft(query: Query, identity: PrivyIdentity, id: string) {
  const r = await creatorDraft(query, identity, id);
  if (r.status === "deployed") throw new DraftError("this circle is already live", 409);
  await query(`update circle_drafts set status = 'cancelled', invite_token_hash = null where id = $1`, [id]);
}

/** Freeze the roster before the on-chain create; returns exactly what to pass to createPot. */
export async function lockDraft(query: Query, identity: PrivyIdentity, id: string) {
  const r = await creatorDraft(query, identity, id);
  if (r.status === "deployed" || r.status === "cancelled") throw new DraftError("draft is closed", 409);
  const members = (await query<{ address: `0x${string}` }>(`select address from draft_members where draft_id = $1`, [id])).map((m) => m.address);
  if (members.length < MIN_MEMBERS) throw new DraftError(`at least ${MIN_MEMBERS} people need to accept first`);
  await query(`update circle_drafts set status = 'locked' where id = $1`, [id]);
  return { members, merkleRoot: inviteRoot(members), terms: toView(r) };
}

export async function unlockDraft(query: Query, identity: PrivyIdentity, id: string) {
  const r = await creatorDraft(query, identity, id);
  if (r.status === "locked") await query(`update circle_drafts set status = 'open' where id = $1`, [id]);
}

export interface OnchainPot {
  creator: string;
  merkleRoot: string;
  expectedMembers: number;
  amountPerCycle: bigint;
  cycleDuration: number;
  paymentWindow: number;
  biddingWindow: number;
}

/**
 * Link the draft to the pot the organizer just created — only if the chain says it's exactly this
 * draft: same creator, same members (Merkle root), same money and schedule. Then publish the
 * invite list and name so every accepted member can join with one tap.
 */
export async function markDeployed(query: Query, identity: PrivyIdentity, id: string, engine: Engine, potId: bigint, pot: OnchainPot) {
  const r = await creatorDraft(query, identity, id);
  if (r.status !== "locked") throw new DraftError("draft isn't being created", 409);
  if (r.engine !== engine) throw new DraftError("pot is on a different engine");
  const members = (await query<{ address: `0x${string}` }>(`select address from draft_members where draft_id = $1`, [id])).map((m) => m.address);
  const checks: [boolean, string][] = [
    [pot.creator.toLowerCase() === (identity.account ?? identity.smartWallet)?.toLowerCase(), "pot was created by a different account"],
    [pot.merkleRoot.toLowerCase() === inviteRoot(members).toLowerCase(), "pot's members don't match the accepted list"],
    [pot.expectedMembers === members.length, "member count doesn't match"],
    [pot.amountPerCycle === BigInt(r.amount_per_cycle), "amount doesn't match"],
    [pot.cycleDuration === r.cycle_duration && pot.paymentWindow === r.payment_window && pot.biddingWindow === r.bidding_window, "schedule doesn't match"],
  ];
  const failed = checks.find(([ok]) => !ok);
  if (failed) throw new DraftError(failed[1], 409);
  await query(`update circle_drafts set status = 'deployed', pot_id = $2, deployed_at = now() where id = $1`, [id, potId.toString()]);
  await query(
    `insert into pot_invites (engine, pot_id, merkle_root, addresses) values ($1, $2, $3, $4) on conflict do nothing`,
    [engine, potId.toString(), pot.merkleRoot.toLowerCase(), members],
  );
  await query(
    `insert into pot_meta (engine, pot_id, name, emoji, updated_by) values ($1, $2, $3, $4, $5)
     on conflict (engine, pot_id) do update set name = excluded.name, emoji = excluded.emoji`,
    [engine, potId.toString(), r.name, r.emoji, pot.creator.toLowerCase()],
  );
}

/** New invite link (the old one stops working). Tokens are stored hashed, so a lost link can't be shown again. */
export async function rotateDraftLink(query: Query, identity: PrivyIdentity, id: string) {
  const r = await creatorDraft(query, identity, id);
  if (r.status === "deployed" || r.status === "cancelled") throw new DraftError("draft is closed", 409);
  const token = randomBytes(24).toString("base64url");
  await query(`update circle_drafts set invite_token_hash = $2 where id = $1`, [id, hashToken(token)]);
  return { id, token };
}
