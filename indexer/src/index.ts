import { ponder, type Context } from "ponder:registry";
import schema from "ponder:schema";
import { ADDRESSES } from "../ponder.config";
import { CircleEngineV4Abi } from "../abis/CircleEngineV4";

type EngineName = "circle" | "auction";
const ENGINES = [
  ["CircleEngine", "circle"],
  ["AuctionEngine", "auction"],
] as const;

const potKey = (engine: EngineName, potId: bigint) => `${engine}:${potId}`;
const cycleKey = (engine: EngineName, potId: bigint, cycleId: bigint) => `${engine}:${potId}:${cycleId}`;
const memberKey = (engine: EngineName, potId: bigint, address: string) => `${engine}:${potId}:${address.toLowerCase()}`;
const ZERO = "0x0000000000000000000000000000000000000000";

function engineByAddress(address: string): EngineName | null {
  const a = address.toLowerCase();
  if (a === ADDRESSES.circleEngine.toLowerCase()) return "circle";
  if (a === ADDRESSES.auctionEngine.toLowerCase()) return "auction";
  return null;
}

type Db = Context["db"];
type EventMeta = { block: { timestamp: bigint }; log: { logIndex: number }; transaction: { hash: `0x${string}` } };

const ts = (e: EventMeta) => Number(e.block.timestamp);
const eventId = (e: EventMeta) => `${e.transaction.hash}-${e.log.logIndex}`;

async function bumpStats(db: Db, patch: Partial<{ potsCreated: number; potsCompleted: number; totalContributed: bigint; totalPaidOut: bigint; safetyFundAccrued: bigint }>) {
  await db
    .insert(schema.stats)
    .values({
      id: "global",
      potsCreated: patch.potsCreated ?? 0,
      potsCompleted: patch.potsCompleted ?? 0,
      totalContributed: patch.totalContributed ?? 0n,
      totalPaidOut: patch.totalPaidOut ?? 0n,
      safetyFundAccrued: patch.safetyFundAccrued ?? 0n,
    })
    .onConflictDoUpdate((row) => ({
      potsCreated: row.potsCreated + (patch.potsCreated ?? 0),
      potsCompleted: row.potsCompleted + (patch.potsCompleted ?? 0),
      totalContributed: row.totalContributed + (patch.totalContributed ?? 0n),
      totalPaidOut: row.totalPaidOut + (patch.totalPaidOut ?? 0n),
      safetyFundAccrued: row.safetyFundAccrued + (patch.safetyFundAccrued ?? 0n),
    }));
}

async function upsertAccount(db: Db, address: `0x${string}`, patch: Partial<typeof schema.account.$inferInsert>, add?: { credited?: bigint; claimed?: bigint }) {
  await db
    .insert(schema.account)
    .values({
      address,
      blacklisted: false,
      totalCredited: add?.credited ?? 0n,
      totalClaimed: add?.claimed ?? 0n,
      ...patch,
    })
    .onConflictDoUpdate((row) => ({
      ...patch,
      totalCredited: row.totalCredited + (add?.credited ?? 0n),
      totalClaimed: row.totalClaimed + (add?.claimed ?? 0n),
    }));
}

async function addActivity(
  db: Db,
  e: EventMeta,
  row: { address: `0x${string}`; type: string; engine?: EngineName | null; potId?: bigint; cycleId?: bigint; amount?: bigint; detail?: number },
) {
  await db.insert(schema.activity).values({
    id: `${eventId(e)}-${row.type}-${row.address.toLowerCase()}`,
    address: row.address,
    type: row.type,
    engine: row.engine ?? null,
    potId: row.potId ?? null,
    cycleId: row.cycleId === undefined ? null : Number(row.cycleId),
    amount: row.amount ?? null,
    detail: row.detail ?? null,
    timestamp: ts(e),
    txHash: e.transaction.hash,
  });
}

// ---------------------------------------------------------------------------------------------
// Engine events (identical on both engines)
// ---------------------------------------------------------------------------------------------

for (const [contract, engine] of ENGINES) {
  ponder.on(`${contract}:PotCreated`, async ({ event, context }) => {
    const { potId, creator, expectedMembers, amountPerCycle } = event.args;
    // Schedule + root aren't in the event; read them at this block (Ponder caches these calls).
    const address = event.log.address;
    const [potData, config] = await Promise.all([
      context.client.readContract({ abi: CircleEngineV4Abi, address, functionName: "getPot", args: [potId] }),
      context.client.readContract({ abi: CircleEngineV4Abi, address, functionName: "getPotConfig", args: [potId] }),
    ]);
    await context.db.insert(schema.pot).values({
      id: potKey(engine, potId),
      engine,
      potId,
      creator,
      merkleRoot: potData[1],
      rootVersion: Number(config[4]),
      expectedMembers: Number(expectedMembers),
      amountPerCycle,
      cycleDuration: Number(config[0]),
      paymentWindow: Number(config[1]),
      biddingWindow: Number(config[2]),
      status: "open",
      memberCount: 0,
      currentCycle: 0,
      completedCycles: 0,
      createdAt: ts(event),
    });
    await bumpStats(context.db, { potsCreated: 1 });
    await addActivity(context.db, event, { address: creator, type: "created", engine, potId });
  });

  ponder.on(`${contract}:MerkleRootUpdated`, async ({ event, context }) => {
    await context.db
      .update(schema.pot, { id: potKey(engine, event.args.potId) })
      .set({ merkleRoot: event.args.newRoot, rootVersion: Number(event.args.version) });
  });

  ponder.on(`${contract}:Joined`, async ({ event, context }) => {
    const { potId, member } = event.args;
    await context.db
      .insert(schema.member)
      .values({
        id: memberKey(engine, potId, member),
        potKey: potKey(engine, potId),
        engine,
        potId,
        address: member,
        active: true,
        joinedAt: ts(event),
        paidCount: 0,
        totalPaid: 0n,
        hasWon: false,
        defaulted: false,
        slotReleased: false,
      })
      .onConflictDoUpdate({ active: true, joinedAt: ts(event) }); // re-join after leaving
    await context.db.update(schema.pot, { id: potKey(engine, potId) }).set((row) => ({ memberCount: row.memberCount + 1 }));
    await addActivity(context.db, event, { address: member, type: "joined", engine, potId });
  });

  ponder.on(`${contract}:Left`, async ({ event, context }) => {
    const { potId, member } = event.args;
    await context.db.update(schema.member, { id: memberKey(engine, potId, member) }).set({ active: false });
    await context.db.update(schema.pot, { id: potKey(engine, potId) }).set((row) => ({ memberCount: row.memberCount - 1 }));
    await addActivity(context.db, event, { address: member, type: "left", engine, potId });
  });

  ponder.on(`${contract}:PotStarted`, async ({ event, context }) => {
    await context.db.update(schema.pot, { id: potKey(engine, event.args.potId) }).set({ status: "active", startedAt: ts(event) });
  });

  ponder.on(`${contract}:CycleStarted`, async ({ event, context }) => {
    const { potId, cycleId, startTime } = event.args;
    await context.db.insert(schema.cycle).values({
      id: cycleKey(engine, potId, cycleId),
      potKey: potKey(engine, potId),
      engine,
      potId,
      cycleId: Number(cycleId),
      startTime: Number(startTime),
      status: "active",
      totalCollected: 0n,
      paidCount: 0,
      defaultsCount: 0,
      fallbackWinner: false,
    });
    await context.db.update(schema.pot, { id: potKey(engine, potId) }).set({ currentCycle: Number(cycleId) });
  });

  ponder.on(`${contract}:Paid`, async ({ event, context }) => {
    const { potId, cycleId, member, amount } = event.args;
    await context.db.insert(schema.payment).values({
      id: eventId(event),
      potKey: potKey(engine, potId),
      cycleId: Number(cycleId),
      member,
      amount,
      timestamp: ts(event),
    });
    await context.db
      .update(schema.cycle, { id: cycleKey(engine, potId, cycleId) })
      .set((row) => ({ totalCollected: row.totalCollected + amount, paidCount: row.paidCount + 1 }));
    await context.db
      .update(schema.member, { id: memberKey(engine, potId, member) })
      .set((row) => ({ paidCount: row.paidCount + 1, totalPaid: row.totalPaid + amount }));
    await bumpStats(context.db, { totalContributed: amount });
    await addActivity(context.db, event, { address: member, type: "paid", engine, potId, cycleId, amount });
  });

  ponder.on(`${contract}:CycleSettled`, async ({ event, context }) => {
    await context.db.update(schema.cycle, { id: cycleKey(engine, event.args.potId, event.args.cycleId) }).set({ settledAt: ts(event) });
  });

  ponder.on(`${contract}:MemberDefaultedInPot`, async ({ event, context }) => {
    const { potId, cycleId, member } = event.args;
    await context.db.update(schema.member, { id: memberKey(engine, potId, member) }).set({ defaulted: true });
    await context.db.update(schema.cycle, { id: cycleKey(engine, potId, cycleId) }).set((row) => ({ defaultsCount: row.defaultsCount + 1 }));
    await addActivity(context.db, event, { address: member, type: "missed", engine, potId, cycleId });
  });

  ponder.on(`${contract}:VRFRequested`, async ({ event, context }) => {
    const { potId, cycleId, requestId } = event.args;
    await context.db
      .update(schema.cycle, { id: cycleKey(engine, potId, cycleId) })
      .set({ status: "awaitingVRF", vrfRequestId: requestId, vrfRequestedAt: ts(event), randomnessReadyAt: null });
  });

  ponder.on(`${contract}:RandomnessReady`, async ({ event, context }) => {
    await context.db
      .update(schema.cycle, { id: cycleKey(engine, event.args.potId, event.args.cycleId) })
      .set({ randomnessReadyAt: ts(event) });
  });

  ponder.on(`${contract}:FallbackWinnerSelected`, async ({ event, context }) => {
    await context.db
      .update(schema.cycle, { id: cycleKey(engine, event.args.potId, event.args.cycleId) })
      .set({ fallbackWinner: true });
  });

  ponder.on(`${contract}:WinnerSelected`, async ({ event, context }) => {
    const { potId, cycleId, winner, amount } = event.args;
    await context.db.update(schema.cycle, { id: cycleKey(engine, potId, cycleId) }).set({ winner, winnerAmount: amount });
    await context.db.update(schema.member, { id: memberKey(engine, potId, winner) }).set({ hasWon: true, wonCycle: Number(cycleId) });
    await addActivity(context.db, event, { address: winner, type: "won", engine, potId, cycleId, amount });
  });

  ponder.on(`${contract}:CycleCompleted`, async ({ event, context }) => {
    const { potId, cycleId, winner, assets } = event.args;
    await context.db.update(schema.cycle, { id: cycleKey(engine, potId, cycleId) }).set({
      status: "completed",
      completedAt: ts(event),
      harvestedAssets: assets,
      winner: winner === ZERO ? null : winner,
    });
    await context.db.update(schema.pot, { id: potKey(engine, potId) }).set((row) => ({ completedCycles: row.completedCycles + 1 }));
  });

  ponder.on(`${contract}:PotCompleted`, async ({ event, context }) => {
    await context.db.update(schema.pot, { id: potKey(engine, event.args.potId) }).set({ status: "completed", completedAt: ts(event) });
    await bumpStats(context.db, { potsCompleted: 1 });
  });

  ponder.on(`${contract}:SlotReleased`, async ({ event, context }) => {
    await context.db.update(schema.member, { id: memberKey(engine, event.args.potId, event.args.member) }).set({ slotReleased: true });
  });
}

ponder.on("AuctionEngine:BidPlaced", async ({ event, context }) => {
  const { potId, cycleId, bidder, amount } = event.args;
  await context.db.insert(schema.bid).values({
    id: eventId(event),
    potKey: potKey("auction", potId),
    cycleId: Number(cycleId),
    bidder,
    amount,
    timestamp: ts(event),
  });
  await addActivity(context.db, event, { address: bidder, type: "bid", engine: "auction", potId, cycleId, amount });
});

// ---------------------------------------------------------------------------------------------
// Vault: pull-ledger credits, claims, safety-fund fees
// ---------------------------------------------------------------------------------------------

const CREDIT_WIN = 0;
const CREDIT_TREASURY = 4;

ponder.on("Vault:WithdrawableCredited", async ({ event, context }) => {
  const { to, amount, engine: engineAddress, potId, cycleId, kind } = event.args;
  const engine = engineByAddress(engineAddress);
  await context.db.insert(schema.credit).values({
    id: eventId(event),
    to,
    amount,
    engine,
    potKey: engine ? potKey(engine, potId) : null,
    cycleId: Number(cycleId),
    kind,
    timestamp: ts(event),
  });
  await upsertAccount(context.db, to, {}, { credited: amount });
  if (kind === CREDIT_WIN) await bumpStats(context.db, { totalPaidOut: amount });
  // Empty-recipient residuals routed to the treasury also count toward the safety fund (F-06).
  if (kind === CREDIT_TREASURY) await bumpStats(context.db, { safetyFundAccrued: amount });
  if (kind !== CREDIT_TREASURY) {
    await addActivity(context.db, event, { address: to, type: "credited", engine, potId, cycleId, amount, detail: kind });
  }
});

ponder.on("Vault:TreasuryFeeCollected", async ({ event, context }) => {
  await bumpStats(context.db, { safetyFundAccrued: event.args.fee });
});

ponder.on("Vault:Claimed", async ({ event, context }) => {
  const { user, amount } = event.args;
  await upsertAccount(context.db, user, {}, { claimed: amount });
  await addActivity(context.db, event, { address: user, type: "claimed", amount });
});

// ---------------------------------------------------------------------------------------------
// Registry: registration, reputation, blacklist
// ---------------------------------------------------------------------------------------------

ponder.on("MemberRegistry:MemberRegistered", async ({ event, context }) => {
  await upsertAccount(context.db, event.args.user, { registeredAt: Number(event.args.timestamp) });
});

ponder.on("MemberRegistry:ReputationUpdated", async ({ event, context }) => {
  await upsertAccount(context.db, event.args.user, { reputation: Number(event.args.newScore) });
});

ponder.on("MemberRegistry:BlacklistUpdated", async ({ event, context }) => {
  await upsertAccount(context.db, event.args.user, { blacklisted: event.args.blacklisted });
});
