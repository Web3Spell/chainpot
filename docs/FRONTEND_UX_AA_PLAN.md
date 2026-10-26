# ChainPot Frontend — Integration Review & Web2-Grade UX / Account Abstraction Plan

_Status: draft, 2026-10-26. Contracts (V4, Certora-remediated) are treated as fixed — every item below is
frontend / off-chain infra only. No contract change is required._

---

## Part 1 — How accurately is the current frontend integrated?

**Wiring is correct; behaviour on top of it is not.**

- ✅ ABIs in `Frontend/config/hooksConf.ts` match the compiled V4 artifacts exactly (registry, circle,
  auction, vault — 0 missing, 0 stale functions/events).
- ✅ Addresses match `smart-contracts/v4/DEPLOYMENT.md` (Base Sepolia).
- ✅ Merkle leaf format (`StandardMerkleTree` `["address"]`) matches the contract's
  `keccak256(bytes.concat(keccak256(abi.encode(addr))))`.
- ✅ `tsc --noEmit` clean, `next build` succeeds. ❌ `eslint`: 76 errors / 22 warnings (mostly `any`).

### Bugs that break or mislead real users

| # | Severity | Where | Problem |
|---|---|---|---|
| 1 | **Critical** | `components/pots/bidding-section.tsx` | Copy says "you bid the *discount*… winner takes the pot minus the bid". On-chain the bid is the **amount the winner receives** (`winnerCredit = lowestBid`). Users will bid the opposite of what they mean. |
| 2 | **Critical** | same | Bid box appears right after paying, but the contract only accepts bids **after the payment deadline** (F-10 → `BiddingNotOpen`). No client check of the 2 % min step or the `< totalCollected` ceiling either. |
| 3 | **Critical** | `create-pot-form.tsx` | `memberCount = addresses.length` uses the *unfiltered* list while the Merkle tree drops invalid addresses; duplicates are also counted. Either case → roster can never fill → pot can **never start**. Creator is not auto-included. |
| 4 | **Critical** | `create-pot-form.tsx` / `pot-header.tsx` | Merkle proofs live only in the creator's `localStorage`. Invitees on their own device **cannot join**. |
| 5 | High | `create-pot-form.tsx` → `app/pots/[id]` | Redirect after create is `/pots/{id}` with no `?engine=`; pot IDs overlap between engines and detection prefers circle → auction creators land on the wrong pot. New ID is read from `potCounter` (race) instead of the `PotCreated` event in the receipt. |
| 6 | High | pot page | `finalizeDraw` and `cancelStuckVRFCycle` are never called. Every Circle cycle with ≥2 eligible members sits in `AwaitingVRF` forever from the UI's point of view; `CircleCycle` renders `null` in that state. |
| 7 | High | `pot-header.tsx` | Lifecycle buttons (start cycle, settle, draw, declare) are **creator-only** although the contract is permissionless, and are shown without time gating → reverts (`PaymentWindowOpen`, `BiddingOpen`, `CycleTooEarly` from the F-08 cadence). If the creator disappears, the pot stalls. |
| 8 | Medium | create form | No client validation of contract rules (`paymentWindow ≥ 1 day`, `< cycleDuration`, `biddingWindow ≥ paymentWindow + 1h`, `< cycleDuration`, amount ≥ 1 USDC, 2–100 members). Users get raw reverts. |
| 9 | Medium | everywhere | Raw viem error strings / `alert()`; custom errors (`NotRegisteredOrAllowed`, `CooldownActive`, `InvalidProof`…) are not decoded to human text. `canJoin` / `canCreate` / blacklist are never pre-checked. |
| 10 | Medium | `useGlobalStats.ts`, `stats-card.tsx`, `pots-grid.tsx` | `activeContributions` formula is wrong (counts paid-out funds), `prevInterest = total / 3` is mocked, chart bars hard-coded, Circle shown as "Yield: None" though it earns Compound yield, `cycleDuration` shown as 0 although `getPotConfig` exists. |
| 11 | Medium | `useUserActivityEvents.tsx` | Only live events since page load (no history); `CycleStarted` isn't filtered to the user's pots. |
| 12 | Low | hooks | One RPC call per pot (N+1), refresh via `setTimeout`, no polling — stale state after other members act. |
| 13 | Low | config | `appName: 'My Next.js DApp'`, hard-coded WalletConnect project ID fallback, public RPC, metadata says "Dutch auctions" / `generator: v0.app`. |
| 14 | Low | repo | `Chainpot/Frontend` is a stale duplicate of `Frontend/`. |
| — | Missing | — | No UI for `leavePot`, `releaseSlot`, cycle history from events, refunds/dividends breakdown. |

**Verdict:** a crypto-native tester who knows the contracts can push a pot through with manual calls; a
normal user cannot complete the flow (can't join, can't see draws finish, can mis-bid).

---

## Part 2 — Target experience

> A web2 user signs in with phone/email/Google/passkey, sees "Family Circle — pay $50 by Friday",
> taps **Pay**, and later gets "🎉 It's your turn — $500 is in your ChainPot balance." They never see a
> wallet, a seed phrase, gas, USDC, a Merkle proof, VRF, or a "settle" button.

Design principles

1. **One primary action per screen**, derived from on-chain state (no menus of lifecycle buttons).
2. **Nobody operates the protocol by hand.** Every permissionless call is done by a keeper.
3. **Plain language.** Crypto vocabulary only on an optional "Details / Verify on-chain" drawer.
4. **Security is invisible but real**: passkeys, scoped permissions, sponsored-but-allowlisted gas,
   human-readable confirmations, self-custody with recovery.
5. **Crypto natives keep their path**: "Use my own wallet" (RainbowKit) remains available.

### Vocabulary map

| Contract term | User-facing term |
|---|---|
| Pot | Circle |
| Cycle | Round (e.g. "Round 3 of 10 — March") |
| `amountPerCycle` | "Everyone puts in $50 each month" |
| Circle engine / Auction engine | "Take turns (fair draw)" / "Bid for early payout" |
| Merkle root / proof | Invite list / invite link |
| `payForCycle` + approve | Pay |
| Payment deadline | Due date |
| Bidding window | "Bidding open until …" |
| VRF draw | "Fair draw — anyone can verify it" |
| `defaulted` | "Missed payment" |
| `settleCycle` / `drawWinner` / `finalizeDraw` / `startCycle` | (automatic — never shown) |
| `withdrawable` / `claim` | "Balance" / "Cash out" (auto-delivered) |
| Treasury fee 20 % of yield | "Interest earned (after 20 % safety-fund fee)" |
| USDC | "$" / local currency display |

---

## Part 3 — Architecture

```
 ┌──────────────────────────── Next.js app (Frontend/) ─────────────────────────────┐
 │  Auth (Privy: email / SMS / Google / Apple / passkey  +  "own wallet" option)    │
 │  Smart account (ERC-4337) ── batched calls ── sponsored by paymaster             │
 │  Pot state machine  →  "Next action" card   ·  Error decoder  ·  i18n / currency │
 └──────────────┬───────────────────────────────────┬───────────────────────────────┘
                │ reads (fast, history)              │ userOps
        ┌───────▼────────┐                  ┌────────▼─────────┐
        │ Indexer         │                  │ Bundler +        │
        │ (Ponder → PG)   │                  │ Paymaster        │
        └───────▲────────┘                  │ (allowlisted)    │
                │ events                     └────────┬─────────┘
 ┌──────────────┴───────────────────────────────────────▼──────────────────────────┐
 │                     ChainPot V4 contracts on Base (unchanged)                    │
 └──────────────▲──────────────────────────────────────────▲───────────────────────┘
                │ permissionless lifecycle txs               │ autopay userOps (session key)
        ┌───────┴──────────────────────────────────────────────┴───────┐
        │ Backend (API + keeper + notifier)                             │
        │  • invites / profiles / proofs   • keeper: startCycle, settle, │
        │  • reminders (email/SMS/push)      draw/declare, finalizeDraw, │
        │  • autopay executor                cancelStuckVRF, claimFor,   │
        │                                    releaseSlot                 │
        └───────────────────────────────────────────────────────────────┘
```

### Why no contract change is needed

- Every entrypoint uses `msg.sender`, so an ERC-4337 smart account is just "the member".
- Smart-account addresses are **counterfactual** (known before deployment) → they can go into the
  Merkle invite list before the invitee ever transacts.
- `approve(exact) + payForCycle` batches into one userOp, replacing `payForCycleWithPermit`
  (permit's `v,r,s` path does not work for smart-account signers anyway).
- `startCycle`, `settleCycle`, `drawWinner`, `declareWinner`, `finalizeDraw`, `cancelStuckVRFCycle`,
  `releaseSlot`, `claimFor` are permissionless → a keeper can run the whole lifecycle; `claimFor`
  can only push a user's balance **to that user**, so it's safe to automate.

### Recommended stack (decision needed — see Part 6)

| Concern | Recommendation | Alternatives |
|---|---|---|
| Login + embedded signer | **Privy** (email/SMS/social/passkey, wagmi connector, keeps external wallets) | Coinbase CDP Embedded Wallets (Base-native), Dynamic, Web3Auth |
| Smart account | Privy smart wallets on Base (Kernel or Coinbase Smart Wallet impl.) | ZeroDev Kernel, Alchemy Account Kit, Safe |
| Bundler / paymaster | Coinbase CDP Paymaster (Base) or Pimlico, **contract + selector allowlist** | Alchemy Gas Manager |
| Session keys / autopay | ERC-7715-style permissions (Kernel permission validators / Coinbase spend permissions) | Manual monthly tap |
| Indexer | **Ponder** (TypeScript, self-host on Postgres) | Envio, The Graph, Goldsky |
| Backend | Next.js route handlers + Postgres (Supabase/Neon) + cron worker | Separate Node service |
| Keeper | Own worker with a hot key holding only gas ETH | Gelato / Chainlink Automation |
| Fiat on/off-ramp | Coinbase Onramp/Offramp (USDC on Base) | MoonPay, Stripe, Transak (India: Onmeta/Transak) |
| Notifications | Resend (email) + Twilio/MSG91 (SMS/WhatsApp) + Web Push | — |
| Contract types | `@wagmi/cli` codegen from `smart-contracts/v4/out` | hand-maintained `hooksConf.ts` (today) |

Verify current pricing / free tiers for Privy, paymaster sponsorship and SMS before committing.

---

## Part 4 — Phased implementation

### Phase 0 — Make the current app correct (≈1 week, no new infra)
Goal: a crypto-native can run a full pot end-to-end in the UI.

1. Fix bid semantics copy + input ("Amount you'll receive"), gate bidding on payment deadline,
   enforce 2 % step / ceiling client-side, show "others share $X".
2. Create form: dedupe + checksum addresses, auto-add creator (toggle), count = tree size, validate
   all window rules with friendly messages, read pot ID from `PotCreated` log, redirect with `?engine=`.
3. Pot page: require `engine` in URL (or `/c/{id}` and `/a/{id}` routes); show "Finalize draw" when
   `drawReady`, "Retry draw" after `VRF_TIMEOUT`.
4. Make lifecycle actions available to any member and time-gated (use `getPotConfig` + effective
   deadlines from `getCycle`) — temporary until the keeper exists.
5. Invite links: encode `potId, engine, root` and the invitee proof in a shareable URL (proofs are
   not secret) as a stop-gap until the backend.
6. Central error decoder (`decodeErrorResult` → message table), remove `alert()`, pre-check
   `isRegistered` / `canJoin` / `canCreate`.
7. Remove mocked stats, use `getPotConfig`, polling (`refetchInterval`) + `useBlockNumber` invalidation.
8. Generate typed ABIs with `@wagmi/cli`; replace `as any` tuple indexing with typed structs; fix lint.
9. Delete the stale `Chainpot/Frontend` copy (separate commit, your call).

### Phase 1 — Foundations (≈1–2 weeks)
_Status 2026-10-26: built on branch `phase-1-foundations` — `Frontend/lib/potState.ts` (+ tests), `indexer/`
(Ponder, synced against Base Sepolia), `/api/invites` (trustless, root-verified) and
`supabase/migrations/0001_init.sql`. Profiles / contacts / notification tables exist but are wired in
Phase 2 once Privy provides authenticated user IDs._
1. **Pot state machine** (`lib/potState.ts`): pure function
   `(pot, config, cycle, member flags, now) → { phase, nextAction, deadline, explanation }` with phases
   `Invited · Joined/WaitingForMembers · WaitingForRound · PayDue · PaidWaiting · BiddingOpen ·
   Drawing · YouReceived · SomeoneReceived · MissedPayment · Completed`. Unit-tested against the
   contract rules (cadence, effective deadlines, F-10, eligibility). Every screen renders from this.
2. **Indexer** (Ponder): pots, cycles, payments, bids, winners, credits (`WithdrawableCredited.kind`),
   per-user activity. Replaces N+1 reads, gives history and real stats.
3. **Backend skeleton**: users ↔ smart-account address, circles drafts, invites, proof API,
   notification preferences. Contract reads remain the source of truth; DB is cache + social layer.

### Phase 2 — Account abstraction (≈2 weeks)
1. Privy provider replaces RainbowKit as primary; external wallets still allowed.
2. Smart account per user on Base; **registration is folded into the first action**
   (`registerMember` batched with `joinPot` or `createPot`).
3. Batched, sponsored userOps:
   - Join = `[registerMember?, joinPot(proof)]`
   - Pay = `[USDC.approve(vault, amount), payForCycle(potId)]` (exact amount, as today)
   - Create = `[registerMember?, createPot(...)]`
4. Paymaster policy: only ChainPot engines, `MemberRegistryV4`, `VaultV4.claim`, and
   `USDC.approve(spender == VaultV4)`; per-user daily op cap; global budget alert.
5. Human-readable confirmation sheet ("Pay $50 to *Family Circle* · Round 3") generated from the
   decoded calls, with simulation (`eth_call` / bundler `estimateUserOperationGas`) before sending.
6. Balance in "$", deposit via on-ramp (card / Apple Pay / bank), cash out via off-ramp or
   "send to my exchange".

### Phase 3 — Automation (≈1–2 weeks)
1. **Keeper worker** (idempotent, reads indexer, re-checks chain before each tx):
   `startCycle` when cadence allows → `settleCycle` after due date → `drawWinner`/`declareWinner`
   after windows → `finalizeDraw` on `RandomnessReady` → `cancelStuckVRFCycle` after timeout →
   `claimFor` for credited users (opt-out) → `releaseSlot` when pots complete.
   Hot key holds gas only; it cannot move user funds by construction.
2. **Autopay (opt-in)**: user grants a session permission limited to
   `{target: engine, selector: payForCycle, potId: X}` + `{USDC.approve(vault) ≤ amountPerCycle}`,
   valid for the pot's lifetime, revocable in Settings. Executor submits on day 1 of each round if
   the balance is sufficient; otherwise escalating reminders. This directly reduces missed payments,
   which on-chain cost the member everything they've paid.
3. **Reminders**: invite, round started, due in 48h / 24h / 2h, bidding open, you received, missed.

### Phase 4 — UX redesign (≈2–3 weeks, overlaps Phase 2/3)
Screens (mobile-first):

- **Home**: list of "My circles" each with a single status line + one button
  (`Pay $50 · due Fri` / `Bid now` / `🎉 You received $500` / `Waiting for 2 friends to join`),
  balance card, "Start a circle".
- **Start a circle wizard** (4 steps): (1) name + emoji + purpose; (2) amount & frequency presets
  (weekly / every 2 weeks / monthly) → windows auto-computed within contract limits, advanced
  toggle for custom; (3) "How is the order decided?" — *Take turns (fair draw)* vs *Bid for early
  payout* with a calculator; (4) invite by phone / email / contacts / share link; review screen in
  one sentence: "10 people · $50/month · 10 months · each month one person gets ~$500".
- **Circle page**: round timeline with avatars of who received; your position; current round card
  driven by the state machine; members list with paid/unpaid ticks; "How it works" sheet;
  "Verify on-chain" drawer (addresses, tx links, VRF request) for the curious.
- **Bid screen**: slider "Receive $X now" with live "each other member gets $Y extra", min-step
  enforced, countdown, plain-language explainer.
- **Invite acceptance**: link → sign in → see circle terms → "Join" (one sponsored userOp).
- **Activity / Balance**: credits grouped by kind (Received, Interest share, Refund), cash-out.

Invite flow detail (solves bug #4 for good):
1. Creator builds a **draft circle** off-chain and invites contacts.
2. Each invitee signs in → their smart-account address is recorded (Privy can also pregenerate
   wallets for an email/phone so the address is known before they sign in).
3. When the roster is complete (or creator chooses), backend builds the Merkle tree, creator's
   `createPot(root, n, ...)` is sent; until start, `updateMerkleRoot` handles swaps (track
   `rootVersion`).
4. Each invitee taps "Join" → proof fetched from the API → `joinPot`. Creator taps "Start" (or the
   keeper starts automatically when full, if you want that policy — `startPot` is creator-only, so
   this needs a creator-granted session permission).

### Phase 5 — Security hardening & launch
- Passkeys as default signer; recovery via second passkey / email; key export for self-custody.
- Spending limits on session keys, permission list + revoke UI.
- Strict contract-address allowlist in the app; never sign arbitrary calldata from URLs.
- CSP, SRI, no secrets client-side, rate-limited APIs, signed invite tokens, PII (phones/emails)
  encrypted at rest and never put on-chain.
- Paymaster budget/abuse monitoring, keeper liveness alerts, indexer-vs-chain reconciliation.
- Third-party review of backend, keeper and permission scopes (the contracts are audited; this
  new surface isn't).
- Legal check: ROSCAs / chit funds are regulated in several markets (e.g. India's Chit Funds Act);
  on/off-ramp KYC is handled by the provider, but confirm product positioning per region.
- Move from Base Sepolia to Base mainnet only after a full keeper-driven pot has run on testnet.

---

## Part 5 — Suggested frontend structure

```
Frontend/
  app/(marketing)/page.tsx           landing
  app/(app)/home/page.tsx            my circles + next actions
  app/(app)/circles/new/...          wizard
  app/(app)/c/[engine]/[id]/page.tsx circle page
  app/(app)/invite/[token]/page.tsx  accept invite
  app/(app)/balance/page.tsx
  app/api/...                        invites, proofs, profiles, notifications
  lib/contracts/generated.ts         @wagmi/cli output
  lib/potState.ts (+ tests)          state machine
  lib/errors.ts                      custom-error → message
  lib/aa/                            smart-account client, batching, permissions
  components/ui/                     design system (shadcn)
  keeper/                            worker (or separate package)
  indexer/                           Ponder project
```

---

## Part 6 — Decisions (settled 2026-10-26)

| # | Decision | Choice | What it implies for the build |
|---|---|---|---|
| 1 | Auth / AA | **Privy** | `@privy-io/react-auth` + `@privy-io/wagmi`; Privy smart wallets on Base; external wallets kept as a secondary login. Login methods for launch: phone OTP, email OTP, Google, Apple, passkey. |
| 2 | Gas | **Fully sponsored** | Paymaster policy = ChainPot engines, `MemberRegistryV4`, `VaultV4.claim`, `USDC.approve(spender == VaultV4)` only; per-user daily op cap; budget alerts. Users never hold ETH. |
| 3 | Autopay | **Opt-in at launch** | Offered on the Join screen; session permission scoped to `payForCycle(potId)` + `approve(vault, ≤ amountPerCycle)` for that circle's lifetime; revocable in Settings; executor in the keeper worker. Ships in the same release as the keeper (Phase 3 moves into the launch scope). |
| 4 | Hosting | **Vercel + Supabase** | Next.js app + API on Vercel; Supabase Postgres in **ap-south-1 (Mumbai)**; Ponder indexer + keeper + autopay executor on one always-on worker (Railway or Fly, Asia region). |
| 5 | Market | **India & Asia first, global-capable** | Phone-first login; reminders via WhatsApp + SMS + email + push; i18n from day 1 (English + Hindi first, structure for more); INR/Asian on-ramps (e.g. Onmeta / Transak) alongside Coinbase/Stripe for global; legal positioning review vs India's Chit Funds Act before mainnet. Note: Indian SMS needs DLT template registration — WhatsApp Business is the smoother default channel. |
| 6 | Auto-start | **Yes, with creator opt-in** | Creator grants a `startPot(potId)`-only permission in the wizard; keeper starts the circle the moment the roster is full; manual Start remains. |
| 7 | Currency display | **Ask the user's country, show that currency** | Onboarding asks "Where are you?" (prefilled from browser locale/IP, editable in Settings); amounts shown in that local currency via a cached FX feed. Because on-chain amounts are fixed in USDC, the confirmation sheet and receipts also show the exact $ amount, and local figures are labelled "≈". Circle amounts are entered in local currency and converted to a fixed USDC amount at creation (shown to the creator before confirming). |

**Gas + signing setup (researched 2026-10-26):**
- Hybrid **Privy (auth + smart wallet) + Coinbase CDP (paymaster + bundler + RPC)**. Privy's dashboard
  takes a custom paymaster and bundler URL per network and lists Coinbase as a recommended paymaster;
  CDP Paymaster accepts any ERC-7677-compatible SDK. Set CDP's bundler too — Privy otherwise falls back
  to Pimlico's heavily rate-limited public bundler. Restrict the paymaster URL's allowed domains (or
  proxy it through our API) and configure the contract allowlist + per-user limits in the CDP Portal.
- Gas credits: CDP signup credits, the paymaster credits application (up to $15k), and the Base
  Gasless Campaign tiers (Tier 1 requires supporting Base Account with preferred placement — check
  whether adding Base Account as a Privy login option qualifies). After credits: actual gas × ETH
  price × 1.07, billed monthly.
- CDP Node (10M free billing units/month) is the **RPC**, not gas — use it to replace the public RPC.
- Face ID / passkey on money moves: enable Privy wallet MFA with passkey; require it for Pay, Bid,
  Cash out and granting autopay/auto-start permissions (policy-based MFA). Note Privy skips re-prompting
  for 15 minutes on the same device. Autopay executions don't prompt — the user approved that scope
  once with Face ID.

Open items to confirm before Phase 2 starts: Privy plan/pricing for expected MAU and smart-wallet
volume; paymaster provider (Privy's built-in vs Coinbase CDP vs Pimlico) and monthly gas budget;
which on-ramp actually supports INR→USDC on Base for Indian users today.
