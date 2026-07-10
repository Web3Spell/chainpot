# ChainPot V4.1 — Security-Review Remediations

This document records the fixes applied to the `v4/` contracts in response to the architecture &
security review (`chainpot_audit_review.md`). Every finding F-01 … F-14 is closed with a code change
and a regression test. The design intent from `findings.md` and `CHAINPOT_V4_PLAN.md` is preserved:
**ChainPot remains an invite-only, zero-collateral ROSCA** — the Merkle invite gate is the primary
sybil defense, and none of these fixes weaken it. Where a fix touches the roster (F-02 pot reopen),
the frozen Merkle root is retained so only the originally-invited wallets can ever (re)join.

Tests: **41/41 passing** (`forge test`), including new large-roster (n = 100) regressions that
exercise the real Chainlink `callbackGasLimit` budget.

---

## Priority 0 — blocking issues

### F-01 — VRF callback could not fit realistic pots (store-then-finalize)
**Before:** the VRF callback ran `harvestCycle` + Comet withdraw + up to n recipient credits inside
Chainlink's 500k `callbackGasLimit`. Beyond ~10–15 members it OOG'd, the cycle stuck in
`AwaitingVRF`, and retries failed identically until the pot force-completed.
**Fix (`RoscaEngineBaseV4`):** `fulfillRandomness` now *only* stores the random word (`ready`/`word`
on `PendingDraw`) and emits `RandomnessReady` — a few thousand gas, impossible to OOG. A new
permissionless `finalizeDraw(potId)` performs the harvest + distribution in an ordinary transaction
with the full block gas budget. `drawReady(potId)` lets keepers/frontends see when settlement is
pending. `cancelStuckVRFCycle` now also *consumes* an already-delivered word instead of discarding it.
**Tests:** `test_F01_wordStored_thenPermissionlessFinalize`,
`test_F01_largeCircle_perCycleVRF_survives500kCallback` (100 members, fulfilled under a hard 500k budget).

### F-02 — Circle shuffle bricked large pots with no recovery
**Before:** `_onShuffleSeed` wrote n addresses to storage inside the VRF callback (broke past ~25
members), and a never-fulfilled shuffle left the pot permanently stuck (`leavePot` needs `Open`,
`startCycle`/`cancelStuckVRFCycle` both revert).
**Fix (`CircleEngineV4` + base):** the shuffle callback stores only the 1-word **seed**; the winner
order is recomputed in memory on demand (`_computeOrder`, pure Fisher–Yates, cheap at n = 100). The
seed is finalized via `finalizeDraw` (full gas). New `cancelStuckShuffle(potId)` retries the VRF
request `MAX_VRF_RETRIES` times, then **reopens** the pot (`PotStatus.Open`, `PotReopened` event) so
members can leave — no funds are ever at risk pre-first-cycle. The **frozen Merkle root is kept**, so
a reopened pot stays invite-only to the original roster.
**Tests:** `test_F02_largeCircle_shuffleSurvives500kCallback`, `test_F02_stuckShuffle_retriesThenReopens`.

### F-03 — Owner key could drain the entire Comet position
**Before:** `CompoundIntegratorV4.setVault` was re-callable, and `VaultV4.setEngine` could authorize
an arbitrary contract at any time — either one drains TVL in a single tx.
**Fix:**
- `CompoundIntegratorV4.setVault` is now a **one-time** binding (`VaultAlreadySet` on re-call).
- `VaultV4` engine authorization is **timelocked** after deploy: wire the two engines, then call
  `lockEngineSetup()`. Adding an engine afterwards requires `proposeEngine` → 2-day wait →
  `executeEngine` (observable on-chain via `EngineProposed`). Removals stay instant (defensive).
- `DeployV4.s.sol` calls `lockEngineSetup()` as the last wiring step.
**Tests:** `test_F03_integratorVaultBindingIsOneTime`, `test_F03_engineAdditionsTimelockedAfterLock`.

### F-06 — Value could strand permanently in `backing`
**Before:** `_distribute` early-returned on an empty recipient set, leaving harvested USDC in
`backing` — unclaimable by anyone and explicitly excluded from `rescueSurplus`.
**Fix (`RoscaEngineBaseV4` + `VaultV4`):** `_finalize` routes any leftover to the winner (if one
exists) via a `Residual` credit, else to the treasury via the new `creditToTreasury`. Invariant:
**`backing == 0` after every finalization** — asserted in the happy-path and F-06 tests.
**Tests:** `test_F06_emptyRecipients_residualRoutedToTreasury`, plus `backing == 0` assertions in
`test_circle_fullPot_eachWinsOnce_conservation`.

---

## Priority 1 — before mainnet

### F-04 — Pause + running deadlines caused mass default
`pause()`/`unpause()` now accumulate `cumulativePauseDuration`; every cycle snapshots the pause debt
at start (`pauseDebtSnapshot`) and all deadline checks use **effective** (pause-extended) deadlines
(`_effPaymentDeadline` / `_effBiddingDeadline`). An emergency pause can no longer default honest
members. `getCycle` returns effective deadlines. **Test:** `test_F04_pauseExtendsPaymentDeadline`.

### F-05 — Disproportionate, weaponizable default consequences
- `MIN_PAYMENT_WINDOW = 1 days` enforced in `_initPot` (hostile 60-second windows rejected).
- `MemberRegistryV4.markAsDefaulter` now slashes reputation and excludes the member **from that pot**
  on every default, but sets the **global blacklist only on repeat defaults**
  (`DEFAULTS_BEFORE_BLACKLIST = 2` distinct pots via `defaultCount`). One missed Sunday is a
  pot-level event; a pattern is a protocol-level one. Blacklist still hard-gates joins/creates.
**Tests:** `test_F05_minPaymentWindowEnforced`, `test_C01_F05_defaultSlashesAndExcludes_blacklistOnlyOnRepeat`.

### F-07 — `joinedPotsCount` was a lifetime cap
New permissionless `releaseSlot(potId, member)` decrements the counter once a pot is `Completed`
(guarded by `slotReleased`). The `MAX_JOINED_POTS = 50` cap is now concurrent, not lifetime.
**Test:** `test_F07_releaseSlotAfterCompletion`.

### F-08 — `cycleDuration` was never enforced
`startCycle` now requires `block.timestamp >= previous.startTime + cycleDuration` (`CycleTooEarly`),
so cycles run on the cadence members agreed to and a keeper cannot compress them.
**Test:** `test_F08_cycleCadenceEnforced`.

### F-09 — VRF retry exhaustion killed healthy pots
After `MAX_VRF_RETRIES`, `cancelStuckVRFCycle` now selects an eligible winner via a deterministic
fallback (`keccak(prevrandao, prior blockhash, potId, idx)`) and emits `FallbackWinnerSelected`,
instead of early-completing the pot. Only reachable after ≥3 days of provable VRF outage.
**Test:** `test_F09_retriesExhausted_fallbackWinner_notPotDeath`.

---

## Priority 2 — quality, UX, scale

### F-10 — Bids against a still-growing ceiling
`placeBid` now requires `block.timestamp >= effectivePaymentDeadline` (`BiddingNotOpen`). The bid
phase `[paymentDeadline, biddingDeadline)` runs over a final, known pot size. **Test:**
`test_F10_bidDuringPaymentWindowReverts`.

### F-11 — Principal-accounting drift on withdraw
`CompoundIntegratorV4.withdraw` reduces `internalPrincipal` **proportionally** to shares burned
(`mulDiv(internalPrincipal, shares, totalShares)`) instead of by principal+interest, keeping the
conservation floor accurate. **Test:** `test_F11_internalPrincipalProportionalOnWithdraw`.

### F-12 — `updateMerkleRoot` staleness
Every root update bumps `rootVersion[potId]` (emitted in `MerkleRootUpdated`) so joiners/frontends
can detect a re-issue before submitting a now-stale proof. Exposed via `getPotConfig`.

### F-13 — Treasury could be silently unset
`VaultV4` now requires the treasury in its **constructor** (reverts on `address(0)`); `DeployV4`
passes `TREASURY` (defaulting to the deployer). The Safety Module can never be skipped by deploy
ordering.

### F-14 — Cleanups
- Removed the unreachable `totalCollected < MIN_AMOUNT_PER_CYCLE` check in `_drawGated`.
- Removed the redundant `registerMember(address)` overload (and `SelfRegistrationOnly`).
- Documented the circle-includes-winner vs auction-excludes-winner interest asymmetry in NatSpec.
- `claimFor` USDC-blacklist isolation documented.

### UX / frontend integration
- `WithdrawableCredited` now carries `(engine, potId, cycleId, kind)` so indexers/frontends can
  attribute every credit (Win / Dividend / Refund / Residual / Treasury — see `VaultV4.CreditKind`).
- `payForCycleWithPermit` (EIP-2612) folds approve + pay into one transaction; best-effort permit so
  it also works when allowance already exists (MockUSDC has no permit — the try/catch handles it).
  **Test:** `test_payForCycleWithPermit_gracefulWithoutPermitSupport`.
- `getPotConfig(potId)` exposes `cycleDuration`, `paymentWindow`, `biddingWindow`, `winnersCount`,
  `rootVersion` so a prospective member sees the schedule before joining.
- `drawReady(potId)` signals a pending `finalizeDraw`.
- `Frontend/config/hooksConf.ts` ABIs regenerated from the patched artifacts. **The contract
  addresses still point at the pre-fix deployment — redeploy with `DeployV4.s.sol` and update
  `CONTRACT_ADDRESSES` before wiring the new functions.**

### Gas
Eligibility scans are single-pass (over-allocate + `mstore` trim) and drop the redundant `isMember`
SLOAD (entries of `p.members` are members by construction). Larger struct-packing / bitfield work
from the report is left as a follow-up to avoid destabilizing storage layout in a security patch.

---

## Frontend action items (not code-fixable here)
- **Redeploy** the patched contracts and update `CONTRACT_ADDRESSES`.
- Add a keeper (or UI button) that calls `finalizeDraw` when `drawReady` is true — this is now a
  required settlement step for any VRF/shuffle draw.
- Replace `useUserActivityEvents`' live-only watching with indexed history (subgraph/Ponder); the
  enriched `WithdrawableCredited` makes attribution straightforward.
- Surface `getCreatorProfile`, the default-blacklist policy, and (for default-mode circles) the fixed
  winner order to users before they join.
