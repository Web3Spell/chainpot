import { index, onchainTable, relations } from "ponder";

// IDs are strings so the two engines (whose pot IDs overlap) never collide:
//   pot    = "<engine>:<potId>"
//   cycle  = "<engine>:<potId>:<cycleId>"
//   member = "<engine>:<potId>:<address>"

export const pot = onchainTable(
  "pot",
  (t) => ({
    id: t.text().primaryKey(),
    engine: t.text().notNull(), // "circle" | "auction"
    potId: t.bigint().notNull(),
    creator: t.hex().notNull(),
    merkleRoot: t.hex().notNull(),
    rootVersion: t.integer().notNull(),
    expectedMembers: t.integer().notNull(),
    amountPerCycle: t.bigint().notNull(),
    cycleDuration: t.integer().notNull(),
    paymentWindow: t.integer().notNull(),
    biddingWindow: t.integer().notNull(),
    status: t.text().notNull(), // "open" | "active" | "completed"
    memberCount: t.integer().notNull(),
    currentCycle: t.integer().notNull(),
    completedCycles: t.integer().notNull(),
    createdAt: t.integer().notNull(),
    startedAt: t.integer(),
    completedAt: t.integer(),
  }),
  (table) => ({ creatorIdx: index().on(table.creator), statusIdx: index().on(table.status) }),
);

export const cycle = onchainTable(
  "cycle",
  (t) => ({
    id: t.text().primaryKey(),
    potKey: t.text().notNull(),
    engine: t.text().notNull(),
    potId: t.bigint().notNull(),
    cycleId: t.integer().notNull(),
    startTime: t.integer().notNull(),
    status: t.text().notNull(), // "active" | "awaitingVRF" | "completed"
    totalCollected: t.bigint().notNull(),
    paidCount: t.integer().notNull(),
    defaultsCount: t.integer().notNull(),
    settledAt: t.integer(),
    vrfRequestId: t.bigint(),
    vrfRequestedAt: t.integer(),
    randomnessReadyAt: t.integer(),
    fallbackWinner: t.boolean().notNull(),
    winner: t.hex(),
    winnerAmount: t.bigint(),
    harvestedAssets: t.bigint(),
    completedAt: t.integer(),
  }),
  (table) => ({ potIdx: index().on(table.potKey) }),
);

export const member = onchainTable(
  "member",
  (t) => ({
    id: t.text().primaryKey(),
    potKey: t.text().notNull(),
    engine: t.text().notNull(),
    potId: t.bigint().notNull(),
    address: t.hex().notNull(),
    active: t.boolean().notNull(), // false after leaving before start
    joinedAt: t.integer().notNull(),
    paidCount: t.integer().notNull(),
    totalPaid: t.bigint().notNull(),
    hasWon: t.boolean().notNull(),
    wonCycle: t.integer(),
    defaulted: t.boolean().notNull(),
    slotReleased: t.boolean().notNull(),
  }),
  (table) => ({ addressIdx: index().on(table.address), potIdx: index().on(table.potKey) }),
);

export const payment = onchainTable(
  "payment",
  (t) => ({
    id: t.text().primaryKey(), // txHash-logIndex
    potKey: t.text().notNull(),
    cycleId: t.integer().notNull(),
    member: t.hex().notNull(),
    amount: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({ memberIdx: index().on(table.member), potIdx: index().on(table.potKey) }),
);

export const bid = onchainTable(
  "bid",
  (t) => ({
    id: t.text().primaryKey(),
    potKey: t.text().notNull(),
    cycleId: t.integer().notNull(),
    bidder: t.hex().notNull(),
    amount: t.bigint().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({ potIdx: index().on(table.potKey) }),
);

/** Vault pull-ledger credits (Win / Dividend / Refund / Residual / Treasury). */
export const credit = onchainTable(
  "credit",
  (t) => ({
    id: t.text().primaryKey(),
    to: t.hex().notNull(),
    amount: t.bigint().notNull(),
    engine: t.text(), // null if credited by an unknown engine
    potKey: t.text(),
    cycleId: t.integer().notNull(),
    kind: t.integer().notNull(),
    timestamp: t.integer().notNull(),
  }),
  (table) => ({ toIdx: index().on(table.to) }),
);

export const account = onchainTable("account", (t) => ({
  address: t.hex().primaryKey(),
  registeredAt: t.integer(),
  reputation: t.integer(),
  blacklisted: t.boolean().notNull(),
  totalCredited: t.bigint().notNull(),
  totalClaimed: t.bigint().notNull(),
}));

/** Unified per-user feed (what "My activity" shows). */
export const activity = onchainTable(
  "activity",
  (t) => ({
    id: t.text().primaryKey(),
    address: t.hex().notNull(),
    type: t.text().notNull(), // created | joined | left | paid | bid | won | missed | credited | claimed
    engine: t.text(),
    potId: t.bigint(),
    cycleId: t.integer(),
    amount: t.bigint(),
    detail: t.integer(), // credit kind for "credited"
    timestamp: t.integer().notNull(),
    txHash: t.hex().notNull(),
  }),
  (table) => ({ addressIdx: index().on(table.address, table.timestamp) }),
);

export const stats = onchainTable("stats", (t) => ({
  id: t.text().primaryKey(), // "global"
  potsCreated: t.integer().notNull(),
  potsCompleted: t.integer().notNull(),
  totalContributed: t.bigint().notNull(),
  totalPaidOut: t.bigint().notNull(),
  safetyFundAccrued: t.bigint().notNull(),
}));

export const potRelations = relations(pot, ({ many }) => ({ cycles: many(cycle), members: many(member) }));
export const cycleRelations = relations(cycle, ({ one }) => ({ pot: one(pot, { fields: [cycle.potKey], references: [pot.id] }) }));
export const memberRelations = relations(member, ({ one }) => ({ pot: one(pot, { fields: [member.potKey], references: [pot.id] }) }));
