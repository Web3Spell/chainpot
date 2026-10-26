# ChainPot keeper

Sends the permissionless calls that keep pots moving, so members never have to: start rounds on
schedule, run/declare the draw, finalize Chainlink VRF results, retry stuck draws, free slots in
finished pots, and push claimable balances to their owners (`claimFor`). It plans with the same state
machine as the app (`Frontend/lib/potState.ts`) and simulates every call before sending.

```bash
npm install
npm run once          # one pass, dry run (default): logs what it would send
DRY_RUN=false KEEPER_PRIVATE_KEY=0x… npm start   # loop every INTERVAL_SEC
```

The key should hold only gas ETH. Every call the keeper makes is permissionless, and none can move
user funds anywhere except to their owner. It refuses to send above `MAX_FEE_GWEI`. Logs are JSON
lines (`would_send`, `sent`, `skip` with a decoded reason, `error`). See `.env.example`.

`startPot` is creator-only, so auto-start needs the creator-granted permission described in
`docs/FRONTEND_UX_AA_PLAN.md` (Phase 3 → autopay & auto-start).
