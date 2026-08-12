# ChainPot — Security Remediation & V4 Implementation Plan

> Status: **Design / pre-implementation spec** for the re-audit after the Compound-team
> audit was paused on `[C-01] Paying is optional`.
> Target: a new **V4** contract set (`AuctionEngineV4`, `EscrowV4`, `CompoundIntegratorV4`,
> `LotteryEngineV4`, `MemberAccountManagerV4`) deployed alongside the existing, paused V3
> snapshot. V3 source is left untouched so the auditors can diff cleanly.
>
> Solidity `0.8.24`, OpenZeppelin + Chainlink VRF v2.5, Foundry.

---

## 0. What ChainPot actually is (corrected model)

ChainPot is a **low-bid ROSCA** (rotating savings & credit association / "chit fund"):

- A pot has a **fixed roster of N members** and runs for **exactly N cycles** (one "month" each).
- **Every cycle, every member contributes `amountPerCycle`.** The pot for that cycle = `amountPerCycle × N`.
- Members **bid down**: the *lowest* bid wins the pot for that cycle. The winner accepts taking
  *less* than the full pot — the difference is the **discount**.
- The **discount + the Compound interest** accrued on the cycle's deposits is split among the
  **other members** (their yield for waiting).
- **Each member wins exactly once.** Over N cycles, all N members have taken the pot once.
- If nobody bids in a cycle, the winner is drawn **randomly (Chainlink VRF) among members who have
  not yet won**.

This model dictates the two structural invariants the current code violates:

1. **N members ⇔ N cycles ⇔ each member wins once** (broken by H-01, H-02, M-05).
2. **All contributions for a cycle are actually collected and irreversible** (broken by C-01, H-03, M-06).

Everything below is organized around restoring those invariants and removing the
trust assumptions the auditors flagged.

---

## 1. Root-cause analysis: why the audit was paused

`[C-01]` is not a bug, it's a **design gap**: on-chain ROSCAs extend *unsecured credit* to
participants (you receive the pot before you've paid all your dues). With **free, instant,
permissionless** membership and **no locked funds**, that credit is extended to anonymous,
infinitely-reproducible wallets — so the rational attack is: register → join → pay one cycle →
lowball-win the pot → disappear. Nothing on-chain can claw it back.

There are exactly two levers to close this, and a production ROSCA needs **both**:

| Lever | Closes | Mechanism |
|---|---|---|
| **A. Trust / identity gate** | the *sybil* dimension ("infinite free wallets") | Merkle-gated **invite-only** pots — only addresses the creator vetted off-chain can join. Restores real-world accountability. |
| **B. Economic security** | the *default* dimension ("take the pot and vanish") | **Collateral bonds** + **winner-collateralization** — the party holding credit risk (an early winner) has their unmet future obligation locked, so default is structurally impossible. |

This plan implements both. Lever A is the auditor's headline recommendation; Lever B is what
makes the ROSCA's credit nature safe *given* a trusted-but-still-pseudonymous roster.

---

## 2. New security architecture (the two new subsystems)

### 2.1 Invite-only pots (Merkle gate) — closes C-01 (sybil), L-01, L-02

- `createPot` takes a **`bytes32 merkleRoot`** committing to the set of invited addresses
  (leaves = `keccak256(abi.encodePacked(memberAddress))`, built with OZ
  [`@openzeppelin/merkle-tree`](https://github.com/OpenZeppelin/merkle-tree)).
- `joinPot(potId, bytes32[] calldata proof)` verifies `MerkleProof.verify(proof, root, leaf)`.
- The **invited set is the fixed roster**. `expectedMembers` (= the number of invited leaves) is
  stored at creation; the pot **cannot start until `members.length == expectedMembers`** and
  `expectedMembers == cycleCount` (enforces M-05 and invariant #1).
- Because joining now requires a creator-issued proof, the "join thousands of pots to DoS"
  (L-01) and "leave-rejoin grief" (L-02) vectors collapse: an attacker can only touch pots they
  were invited to. We still add a hard `MAX_JOINED_POTS` cap and a join/leave cooldown as
  defense-in-depth.

`onlyRegistered` is **kept** but is no longer the security boundary — the Merkle proof +
collateral are. Registration becomes a lightweight profile/reputation anchor.

### 2.2 Collateral bonds + winner-collateralization — closes C-01 (default), H-03

Every member posts a **security bond** on join and the protocol guarantees each cycle is funded:

- **Bond on join.** `bond = amountPerCycle × collateralMultiplier` (creator-set, `≥ 1`,
  default `1`). The bond is pulled into `EscrowV4` and supplied to Compound under a per-member
  **collateral ledger** `(potId, member)` — so the member *earns yield on their own bond*.
- **Cycle auto-cover (no more bricks).** After the payment deadline, anyone may call
  `settleCycle(cycleId)`. For every member who didn't `payForCycle`, the contract debits
  `amountPerCycle` from that member's collateral, credits it to the cycle, flags them
  `defaulted`, slashes reputation, and sets a **cross-pot blacklist flag**. Result: a cycle is
  **always** funded to exactly `amountPerCycle × N` → **H-03 disappears structurally** (the
  bid ceiling is now a guaranteed-collected amount, not a hopeful one), and a single
  non-payer can never freeze the pot.
- **Winner-collateralization (the key C-01 fix).** When a winner is paid in `completeCycle`:
  ```
  futureObligation = amountPerCycle × (cyclesRemainingAfterThisOne)
  shortfall        = max(0, futureObligation − winnerCurrentCollateral)
  liquidToWinner   = winningBid − shortfall      // credited to withdrawable balance (pull)
  ```
  The `shortfall` is **withheld from the payout and moved into the winner's collateral ledger**.
  From that point the winner's *entire* remaining obligation is pre-funded, so future cycles
  auto-debit and **the winner cannot default** — exactly the "lowball, pay one cycle, disappear"
  attack from C-01.
  - Symmetry check: the **first** winner owes `(N−1)` future contributions → most is withheld
    (they're taking the biggest loan, so they post the most security). The **last** winner owes
    `0` → receives the full `winningBid`. This is economically correct and self-balancing.
- **Bond return.** Unused collateral is credited to each member's withdrawable balance when the
  pot completes (or on `cancelStuckVRFCycle`), claimable via `claim()`.

> Capital note: this keeps the ROSCA's monthly-payment cash-flow shape (you do **not** prepay all
> N cycles up front). Only a *winner* gets over-collateralized, and only for their unmet dues —
> which is precisely the credit they just drew. `collateralMultiplier` lets a creator dial the
> non-winner buffer up for higher-trust-but-larger pots.

---

## 3. Finding-by-finding remediation

Legend: **AE** = AuctionEngineV4, **ES** = EscrowV4, **CI** = CompoundIntegratorV4,
**LE** = LotteryEngineV4, **MM** = MemberAccountManagerV4.

### C-01 — Paying is optional → **FIXED (design)** · AE, ES, MM
- Merkle-gated `joinPot` (§2.1) + per-member collateral bond + cycle auto-cover +
  winner-collateralization (§2.2).
- New state: `mapping(uint256 => bytes32) potMerkleRoot`, `expectedMembers`,
  `collateralMultiplier`, collateral ledger in ES, `defaulted` flag, global `isBlacklisted`.
- Net effect: membership is no longer free/anonymous, and the party holding credit risk is fully
  bonded → the documented attack is no longer profitable or even completable.

### C-02 — VRF can still be spammed → **FIXED** · AE, LE
- **`MIN_AMOUNT_PER_CYCLE`** constant in AE (e.g. `1e6` = 1 USDC, 6-decimals); `createPot` reverts
  below it. Kills the `amountPerCycle = 1 wei` throwaway pot.
- **Economic-value gate on the VRF path:** in `declareWinner`, the no-bid branch may request VRF
  **only if `cycle.totalCollected > 0`** (and in practice `== amountPerCycle × N` after
  `settleCycle`). A pot with no real money never triggers a paid VRF call.
- **Creator must fund.** Creator joins + posts collateral like everyone else (already implied by
  roster), and `startCycle` requires the roster full + bonds posted, so spinning up a "throwaway
  pot" now costs real, locked USDC per fake member — combined with Merkle gating, infinite free
  wallets are gone.
- VRF participant list is also pre-filtered to eligible (non-winner) members (see H-02), so an
  empty eligible set short-circuits instead of calling VRF.

### H-01 — Users can win more than once → **FIXED** · AE, MM
- New `mapping(uint256 potId => mapping(address => bool)) public hasWonInPot`.
- Set in `_recordWinner` (the single internal helper called by both the bid path in
  `declareWinner` and the VRF paths `fulfillRandomWinner`/`checkAndSetVRFWinner`).
- `placeBid` reverts with `AlreadyWonThisPot` if `hasWonInPot[potId][msg.sender]`.
- (Members still must `payForCycle` every cycle even after winning — that's the ROSCA — they
  just can't *win/bid* again.)

### H-02 — Random draw can pick a previous winner → **FIXED** · AE, LE
- New internal `_eligibleMembers(potId)` builds the participant array **excluding**
  `hasWonInPot` addresses, and `declareWinner` passes *that* to `lotteryEngine.requestRandomWinner`.
- `fulfillRandomWinner`/`checkAndSetVRFWinner` additionally assert
  `!hasWonInPot[potId][winner]` as belt-and-suspenders.
- Edge case: by invariant #1, the no-bid lottery in cycle *k* always has exactly `N−(k−1) ≥ 1`
  eligible members; the final cycle's sole remaining member wins by definition (no VRF needed —
  add a `if (eligible.length == 1) _recordWinner(eligible[0])` fast path, saving a VRF call).

### H-03 — DoS by bidding more than collected → **FIXED** · AE
- Bid ceiling changes from `amountPerCycle × members.length` (hopeful) to **`cycle.totalCollected`**
  (actually collected). With §2.2 auto-cover, `totalCollected` is guaranteed `== amountPerCycle × N`
  once `settleCycle` runs, so an over-bid is impossible.
- Defense-in-depth: re-validate `cycle.winningBid <= cycle.totalCollected` in `completeCycle`
  before `releaseFundsToWinner`.

### H-04 — Push payments brick on blacklisted recipient → **FIXED** · ES, AE
- **Pull over push.** `EscrowV4` gains `mapping(address => uint256) public withdrawable` and a
  `claim()` (and `claimFor(address)` keeper helper).
- `completeCycle` / `cancelStuckVRFCycle` now **credit** `withdrawable[recipient] += amount`
  internally (winner payout, non-winner remainder shares, returned collateral) instead of calling
  `USDC.safeTransfer` per recipient. One USDC-blacklisted member can no longer revert the whole
  finalization.
- `claim()` does the single `USDC.safeTransfer(msg.sender, amount)` (a blacklisted user simply
  can't pull *their own* funds — their problem, not the pot's).
- Funds are harvested from Compound into the escrow *once* during finalization; per-recipient
  accounting is purely internal.

### H-05 — 1:1 mint when `shares == 0` → **FIXED** · CI
- **Delete** the `if (shares == 0) shares = amount;` fallback in `supplyUSDCForPot`; **revert
  `ZeroShares()`** instead.
- Adopt OZ-ERC4626-style **virtual shares / decimal offset** in the share math so the
  first-depositor / inflation path that produced `shares == 0` cannot be reached cheaply (see
  next item). Together these convert the masked Low into a closed High.

### M-01 — Bidders can weaken their own bid → **FIXED** · AE
- Bids become **monotonically non-increasing and non-withdrawable.** In `placeBid`:
  - First bid for the cycle: store normally.
  - Subsequent bid by the same member: require `newBid < existingBid` (strictly lower) — you may
    only *improve* (lower) your commitment, never raise or remove it.
- Track `cycle.lowestBid` / `cycle.lowestBidder` incrementally on each accepted bid; the current
  lowest bidder is therefore locked into at least their standing bid. (Also removes the O(n) loop
  in `declareWinner` — winner is already known.)

### M-02 — Reputation farmed via losing bids → **FIXED** · AE, MM
- Reputation for bidding is granted **once per (member, cycle)**, on the *first* bid only.
- AE tracks `cycle.hasBidThisCycle[member]`; it calls `MM.updateBidInfo(..., firstBid)` and MM
  only adds `REPUTATION_BID` when `firstBid == true`. Re-bids (the M-01 lower-only revisions) earn
  nothing.

### M-03 — No bid min-step → **FIXED** · AE
- New `MIN_BID_STEP_BPS` (default `200` = 2%). A new bid that wants to become the lowest must beat
  the standing lowest by at least the step:
  ```
  require(newBid <= lowestBid - (lowestBid * MIN_BID_STEP_BPS) / 10_000), MinStepNotMet)
  ```
- Removes the `1e18+1` vs `1e18` meaningless-overtake problem.

### M-04 — Reputation is purposeless → **FIXED (incentivized)** · AE, MM
Reputation now has teeth:
- **Eligibility gate:** `MIN_REPUTATION_TO_JOIN` / `MIN_REPUTATION_TO_CREATE` (e.g. members who
  have been slashed below threshold can't join new pots).
- **Default blacklist:** `markAsDefaulter` already slashes; we add a hard `isBlacklisted[user]`
  flag set on default that blocks `joinPot`/`createPot` until cleared.
- **Worse terms for low rep:** creators may require `collateralMultiplier` to scale with the
  invitee's reputation (documented config pattern; the contract exposes `getReputationScore` for
  the front-end / creator to set per-pot bond requirements). Sybil-resetting via a fresh wallet is
  blocked by the Merkle invite (a low-rep user simply won't be re-invited).

### M-05 — Non-fixed member count → **FIXED** · AE
- `createPot` enforces **`minMembers == maxMembers == cycleCount == expectedMembers`** (a single
  `memberCount` parameter is cleaner — see §4). Range membership is removed.
- `startCycle` requires `members.length == expectedMembers`.

### M-06 — Pay after end time → **FIXED** · AE
- `payForCycle` adds an explicit **payment deadline** check:
  ```
  paymentDeadline = cycle.startTime + (pot.cycleDuration - pot.bidDepositDeadline);
  if (block.timestamp >= paymentDeadline) revert PaymentWindowClosed();
  ```
  i.e. contributions must land *before bidding closes*. After the deadline, the only way a cycle
  gets that member's money is `settleCycle` debiting their bond.

### L-01 — Unbounded pot list → **FIXED** · AE
- `MAX_JOINED_POTS` cap (e.g. `50`) checked in `createPot`/`joinPot` against `userPots[msg.sender].length`.
- Merkle gating already prevents mass uninvited joins.

### L-02 — Fixed-member pots griefed by leave-rejoin → **FIXED** · AE, MM
- **Join/leave cooldown** per (user, pot): `JOIN_LEAVE_COOLDOWN` (e.g. 1 day) blocks immediate
  rejoin; repeated leaves slash reputation.
- Leaving forfeits a small, configurable portion of any griefer incentive; combined with
  Merkle invites (the creator controls who's even on the roster) and the bond, serial griefing is
  uneconomical. Creators can also simply re-issue a root excluding the griefer.

### L-03 — Over-centralized emergency withdraw → **FIXED** · ES, CI
- **Remove** `emergencyWithdrawAll` and the broad `emergencyWithdrawUSDC` that sweep the whole
  balance.
- Replace with a **narrowly-scoped, timelocked rescue** that can only move *unaccounted* surplus
  (`USDC.balanceOf(this) - Σ tracked obligations`) — never member principal/collateral — and only
  after a `RESCUE_TIMELOCK`. `rescueTokens` for *non-USDC* tokens stays (it already reverts on the
  base asset).

### [I] CEI not followed → **FIXED** · ES, CI
- `EscrowV4.depositFromMember`: do all state writes (`cycle.totalDeposited += …`, etc.) **before**
  `USDC.safeTransferFrom` / the `compoundIntegrator.supplyUSDCForPot` external calls. Functions
  already carry `nonReentrant`; CEI ordering is tightened regardless.
- `CompoundIntegratorV4.supplyUSDCForPot`: compute shares & update ledgers, then `safeTransferFrom`
  + `COMET.supply` at the end.

### [I] Reading raw Comet balance is dangerous → **FIXED** · CI
- Stop using live `COMET.balanceOf(address(this))` as the bare share-price denominator.
- Track assets internally: `uint256 internalPrincipal` (sum of supplied principal, decremented on
  withdraw) plus an explicit **`accrueInterest()`** that realizes `balanceOf − internalPrincipal`
  as interest into a tracked figure. `totalAssets()` returns the **internal** number.
- Combine with **virtual offset** in `convertToShares/convertToAssets`
  (`shares = assets·(totalShares+1)/(totalAssets+1)` style, OZ `_decimalsOffset` pattern) so a
  direct `COMET.supplyTo(integrator)` donation can't move the price-per-share. This + the H-05
  revert removes the first-depositor/inflation attack entirely.

### [I] Max-participants mismatch → **FIXED** · AE, LE
- Normalize: `AuctionEngineV4.MAX_MEMBERS == LotteryEngineV4.MAX_PARTICIPANTS` (single shared value,
  e.g. `100`). The dead `TooManyParticipants` branch becomes live and meaningful.

---

## 4. State & signature changes (concrete)

### AuctionEngineV4 — new/changed
```solidity
// --- constants ---
uint256 public constant MIN_AMOUNT_PER_CYCLE = 1e6;        // 1 USDC (C-02)
uint256 public constant MIN_BID_STEP_BPS    = 200;         // 2% (M-03)
uint256 public constant MAX_JOINED_POTS     = 50;          // (L-01)
uint256 public constant JOIN_LEAVE_COOLDOWN = 1 days;      // (L-02)
uint256 public constant MIN_REPUTATION_TO_JOIN = 50;       // (M-04)
// MAX_MEMBERS shared with LotteryEngineV4.MAX_PARTICIPANTS  ([I])

// --- Pot struct additions ---
bytes32 merkleRoot;          // invited-set commitment (C-01)
uint256 expectedMembers;     // == cycleCount (M-05)
uint256 collateralMultiplier;// bond = amountPerCycle * this (C-01)

// --- AuctionCycle struct additions ---
uint256 lowestBid; address lowestBidder;          // (M-01) incremental winner
uint256 totalCollected;                            // bid ceiling source (H-03) [already exists]
mapping(address => bool) hasBidThisCycle;          // (M-02)
bool settled;                                       // settleCycle ran (auto-cover)

// --- new mappings ---
mapping(uint256 => mapping(address => bool)) public hasWonInPot;   // (H-01/H-02)
mapping(address => bool) public isBlacklisted;                     // (M-04/L-02)
mapping(uint256 => mapping(address => uint256)) public lastJoinLeave; // (L-02)

// --- changed signatures ---
function createPot(
    string calldata name, uint256 amountPerCycle, uint256 cycleDuration,
    uint256 memberCount,                 // replaces cycleCount + min/max (M-05)
    CycleFrequency frequency, uint256 bidDepositDeadline,
    bytes32 merkleRoot, uint256 collateralMultiplier   // (C-01)
) external onlyRegistered whenNotPaused returns (uint256);

function joinPot(uint256 potId, bytes32[] calldata proof) external …;  // (C-01)
function settleCycle(uint256 cycleId) external …;                      // (C-01/H-03) auto-cover
function claim() external;                                             // delegates to ES (H-04)
```

### EscrowV4 — new/changed
```solidity
mapping(address => uint256) public withdrawable;            // (H-04) pull ledger
mapping(uint256 => mapping(address => uint256)) public collateral; // (potId=>member=>bond) (C-01)

function postCollateral(uint256 potId, address member, uint256 amount) external onlyAuctionEngine;
function debitCollateralToCycle(uint256 potId, uint256 cycleId, address member, uint256 amount)
    external onlyAuctionEngine;                              // settleCycle auto-cover
function creditWithdrawable(address to, uint256 amount) external onlyAuctionEngine; // replaces push
function claim() external nonReentrant;                     // single safeTransfer of withdrawable
// releaseFundsToWinner / distributeRemainderTo → credit withdrawable instead of safeTransfer
// emergencyWithdrawAll/USDC → removed; timelocked surplus-only rescue added (L-03)
```

### CompoundIntegratorV4 — new/changed
```solidity
uint256 public internalPrincipal;          // ([I]) internal accounting denominator
function totalAssets() public view returns (uint256);     // returns internal figure, not balanceOf
function accrueInterest() public;                          // realizes balanceOf - internalPrincipal
function convertToShares/convertToAssets … // + virtual offset (H-05 / [I])
// supplyUSDCForPot: revert ZeroShares() instead of 1:1 fallback (H-05); CEI reordered ([I])
```

### LotteryEngineV4 — changed
```solidity
uint256 public constant MAX_PARTICIPANTS = 100;  // == AE.MAX_MEMBERS ([I])
// requestRandomWinner receives the pre-filtered ELIGIBLE (non-winner) set (H-02)
```

### MemberAccountManagerV4 — changed
```solidity
// updateBidInfo gains a `firstBid` arg; only awards REPUTATION_BID when true (M-02)
// markAsDefaulter additionally flags AuctionEngine's blacklist via callback/event (M-04)
// getReputationScore exposed for per-pot collateralMultiplier decisions (M-04)
```

---

## 5. New invariants to assert in tests / formal review

1. `pot.expectedMembers == pot.cycleCount` and `members.length == expectedMembers` before `startCycle`. (M-05)
2. After `settleCycle`: `cycle.totalCollected == amountPerCycle × N`. (H-03/C-01)
3. `Σ hasWonInPot[potId] over the pot's life == cycleCount`, and no address wins twice. (H-01/H-02)
4. `cycle.winningBid <= cycle.totalCollected` always. (H-03)
5. A winner's `collateral[potId][winner] >= amountPerCycle × cyclesRemaining` immediately after `completeCycle`. (C-01)
6. `Σ withdrawable + Σ collateral + Σ live-cycle deposits == EscrowV4 USDC + Compound value` (no funds created/destroyed). (H-04/H-05)
7. `convertToShares(x) == 0 ⇒ revert`; share price strictly increasing, immune to direct donation. (H-05/[I])
8. No external call can leave a cycle un-finalizable (no single blacklisted address blocks `completeCycle`). (H-04)
9. VRF is never requested when `totalCollected == 0` or when `eligible.length <= 1`. (C-02/H-02)

---

## 6. Implementation order (PR sequencing)

Each step is independently compilable + testable; later steps depend on earlier state.

1. **CI hardening** (H-05, [I]): internal assets + virtual offset + revert-on-zero. *No external API change.*
2. **ES pull-payment + collateral ledger** (H-04, C-01 part): `withdrawable`, `collateral`, `claim`, credit-not-push. Remove emergency sweeps (L-03).
3. **MM tweaks** (M-02, M-04): `firstBid` arg, blacklist hook, reputation gates.
4. **LE** (H-02, [I]): eligible-set input, `MAX_PARTICIPANTS = 100`.
5. **AE core rewrite** (everything else): Merkle gate + fixed roster (C-01/M-05), bonds + `settleCycle` + winner-collateralization (C-01/H-03), `hasWonInPot` (H-01), eligible VRF + economic gate (H-02/C-02), monotonic bids + min-step (M-01/M-03), payment deadline (M-06), cooldown/caps (L-01/L-02).
6. **DeployV4 script + wiring**: `setAuctionEngine`, `setEscrow`, `addAuthorizedCaller`, VRF `setAuthorizedRequester`, `setCometRewards`.
7. **Front-end / off-chain**: Merkle tree builder (OZ `@openzeppelin/merkle-tree`), proof endpoint, collateral-approval UX, `settleCycle`/`claim` keeper.

---

## 7. Testing plan (Foundry)

- **Port + extend** the existing V3 suites (`AuctionEngineV3.t.sol`, `EscrowV3.t.sol`, etc.) to V4.
- **Per-finding regression test** (one named test reproducing the attack on V3, asserting it
  reverts/fails on V4): `test_C01_lowballAndVanish_reverts`, `test_C02_vrfSpam_noEconomicValue_reverts`,
  `test_H01_doubleWin_reverts`, `test_H02_lotteryExcludesWinners`, `test_H03_overBid_reverts`,
  `test_H04_blacklistedWinner_doesNotBrickPot`, `test_H05_zeroShares_reverts`,
  `test_M01_raiseBid_reverts`, `test_M02_repeatBid_noRep`, `test_M03_minStep`,
  `test_M05_fixedRoster`, `test_M06_payAfterDeadline_reverts`, etc.
- **Invariant/fuzz tests** for §5 (StdInvariant): conservation of funds (#6), no-double-win (#3),
  share-price monotonicity (#7), full-cycle collection (#2).
- **Fork test** against mainnet/Base USDC + Comet for the CI math and a real USDC-blacklist
  scenario (H-04). Use a known blacklisted address or a USDC mock that mimics blacklist reverts.
- Gas snapshot the new `joinPot` (Merkle verify), `settleCycle`, and `completeCycle` (pull credits).

---

## 8. Re-audit handoff checklist

- [ ] V3 sources unchanged; V4 added under `smart-contracts/v3/src/` (or `…/v4/src/`).
- [ ] This document + a finding→commit/test mapping table attached to the re-audit request.
- [ ] All §5 invariants covered by passing tests; coverage report attached.
- [ ] Merkle root generation documented and reproducible (script in repo).
- [ ] Deployment/runbook for the trusted roles: who holds `owner()` on each contract, the
      VRF subscription, and the keeper for `settleCycle`/`claim` (consider a 2/3 multisig +
      timelock for `owner()` to pre-empt any residual centralization concern from L-03).

---

## 9. Open product decisions (flag to stakeholders before coding step 5)

1. **`collateralMultiplier` default & per-pot policy.** `1×` (one-cycle buffer for non-winners,
   full coverage for winners via withholding) is the lean default. Higher values increase
   non-winner default protection at the cost of locked capital.
2. **Discount/interest split audience.** Current code splits among *non-winners of that cycle*.
   Confirm whether it should be all members or only not-yet-won members (no finding requires a
   change; flagging for product correctness).
3. **Blacklist clearing.** Manual (owner/governance) vs. automatic after a cooldown — affects how
   punitive M-04/L-02 are.
4. **Keeper model.** Who calls `settleCycle`/`completeCycle`/VRF fallbacks — protocol-run keeper,
   incentivized public callable (small bounty from remainder), or creator responsibility.
```
