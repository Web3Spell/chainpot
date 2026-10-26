# ChainPot indexer

[Ponder](https://ponder.sh) project that indexes the V4 contracts on Base Sepolia (both engines, the
Vault and the MemberRegistry) into Postgres and serves a read API for the frontend.

## Run locally

```bash
npm install
DATABASE_SCHEMA=chainpot npm start   # embedded PGlite in .ponder/, API on :42069
```

Then point the frontend at it: `NEXT_PUBLIC_INDEXER_URL=http://localhost:42069`.

## Configuration

| Variable | Purpose |
|---|---|
| `PONDER_RPC_URL_84532` | Base Sepolia RPC with full log history back to block 45,989,504. Defaults to Tenderly's public gateway (publicnode is pruned; `sepolia.base.org` caps `eth_getLogs` at 200 blocks). Use CDP Node or another dedicated RPC in production. |
| `PONDER_RPC_MAX_RPS`, `PONDER_GETLOGS_RANGE` | Throttling for free-tier RPCs (defaults 5 req/s, 500k blocks). |
| `DATABASE_URL` | Postgres (Supabase) for production. Omit locally to use PGlite. |
| `DATABASE_SCHEMA` | Postgres schema for this deployment (required by `ponder start`). |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins; omit to allow all. |

## API

| Route | Returns |
|---|---|
| `GET /pots?engine=&status=&limit=` | Pots, newest first |
| `GET /pots/:engine/:potId` | Pot + cycles (with VRF timing, winner amounts) + members |
| `GET /users/:address/pots` | Pots the address is an active member of |
| `GET /users/:address/activity?limit=` | Per-user feed: created, joined, left, paid, bid, won, missed, credited, claimed |
| `GET /stats` | Totals: pots, contributed, paid out, safety fund |
| `/graphql` | Auto-generated GraphQL over every table |

BigInts are returned as decimal strings. Row IDs are namespaced by engine (`circle:1`, `auction:1`)
because pot IDs overlap between the two engines.

## Updating ABIs

```bash
(cd ../smart-contracts/v4 && forge build) && node ../scripts/sync-abis.mjs
```
