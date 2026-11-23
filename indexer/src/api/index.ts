import { db } from "ponder:api";
import schema from "ponder:schema";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { and, desc, eq, graphql, inArray, replaceBigInts } from "ponder";
import { getAddress, isAddress } from "viem";

const app = new Hono();

// Read-only public data; restrict origins in production via ALLOWED_ORIGINS="https://app.example,https://…".
const allowed = process.env.ALLOWED_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean);
app.use("*", cors({ origin: allowed && allowed.length ? allowed : "*" }));

app.use("/graphql", graphql({ db, schema }));

// BigInts serialize as decimal strings.
const json = <T>(value: T) => replaceBigInts(value, (v) => String(v));

const ENGINES = new Set(["circle", "auction"]);
const clampLimit = (raw: string | undefined, def: number, max: number) => {
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.min(Math.floor(n), max) : def;
};

/** GET /pots?engine=circle&status=open&limit=50 */
app.get("/pots", async (c) => {
  const engine = c.req.query("engine");
  const status = c.req.query("status");
  const filters = [];
  if (engine && ENGINES.has(engine)) filters.push(eq(schema.pot.engine, engine));
  if (status) filters.push(eq(schema.pot.status, status));
  const rows = await db
    .select()
    .from(schema.pot)
    .where(filters.length ? and(...filters) : undefined)
    .orderBy(desc(schema.pot.createdAt))
    .limit(clampLimit(c.req.query("limit"), 50, 200));
  return c.json(json(rows));
});

/** GET /pots/:engine/:potId — pot, its cycles (newest first) and members. */
app.get("/pots/:engine/:potId", async (c) => {
  const { engine, potId } = c.req.param();
  if (!ENGINES.has(engine) || !/^\d+$/.test(potId)) return c.json({ error: "bad pot id" }, 400);
  const key = `${engine}:${potId}`;
  const [pot] = await db.select().from(schema.pot).where(eq(schema.pot.id, key));
  if (!pot) return c.json({ error: "not found" }, 404);
  const [cycles, members] = await Promise.all([
    db.select().from(schema.cycle).where(eq(schema.cycle.potKey, key)).orderBy(desc(schema.cycle.cycleId)),
    db.select().from(schema.member).where(eq(schema.member.potKey, key)),
  ]);
  return c.json(json({ pot, cycles, members, currentCycle: cycles.find((x) => x.cycleId === pot.currentCycle) ?? null }));
});

/** GET /users/:address/pots — every pot the address is (or was) a member of, with its membership row. */
app.get("/users/:address/pots", async (c) => {
  const raw = c.req.param("address");
  if (!isAddress(raw)) return c.json({ error: "bad address" }, 400);
  const memberships = await db
    .select()
    .from(schema.member)
    .where(and(eq(schema.member.address, getAddress(raw)), eq(schema.member.active, true)));
  if (!memberships.length) return c.json([]);
  const pots = await db.select().from(schema.pot).where(inArray(schema.pot.id, memberships.map((m) => m.potKey)));
  const byKey = new Map(pots.map((p) => [p.id, p]));
  return c.json(json(memberships.map((m) => ({ membership: m, pot: byKey.get(m.potKey) ?? null }))));
});

/** GET /users/:address/activity?limit=50 */
app.get("/users/:address/activity", async (c) => {
  const raw = c.req.param("address");
  if (!isAddress(raw)) return c.json({ error: "bad address" }, 400);
  const rows = await db
    .select()
    .from(schema.activity)
    .where(eq(schema.activity.address, getAddress(raw)))
    .orderBy(desc(schema.activity.timestamp))
    .limit(clampLimit(c.req.query("limit"), 50, 500));
  return c.json(json(rows));
});

/** GET /stats */
app.get("/stats", async (c) => {
  const [row] = await db.select().from(schema.stats).where(eq(schema.stats.id, "global"));
  return c.json(json(row ?? { potsCreated: 0, potsCompleted: 0, totalContributed: 0, totalPaidOut: 0, safetyFundAccrued: 0 }));
});

export default app;
