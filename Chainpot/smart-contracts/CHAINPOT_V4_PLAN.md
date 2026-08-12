# ChainPot V4 — Invite-Only ROSCA: Security Remediation & Implementation Plan

> **Status:** Design / pre-implementation spec for the Compound-team re-audit.
> **Supersedes:** `SM_IMPLEMENTATION.md` (kept in-repo for diffing). This plan keeps that
> document's strong settlement core — **pull-payments, internal share accounting, fixed roster,
> no-double-win** — and removes everything that is no longer needed under the locked product
> model: **collateral/bonds and the liquidity⟷default-risk dial are gone.**
> **Target:** a new **V4** contract set deployed alongside the paused, untouched V3 snapshot
> (so auditors diff cleanly). Solidity `0.8.24`, OpenZeppelin + Chainlink VRF v2.5, Foundry, Base.
>
> **Product decisions locked with stakeholder:**
>
> - **(2026-06-21) Two programs.** Program A (social Circle) winner = VRF random each cycle among
>   not-yet-won members. Program B (Market) = lowest-bid auction; VRF only when *nobody* bids.
> - **(2026-06-27) Invite-only, trusted roster, ZERO collateral.** Every pot is gated by a Merkle
>   roster of vetted addresses. **No bonds, no collateral, no withhold-the-tail.** The winner always
>   receives full liquidity. Default risk is consciously absorbed by the *trusted-roster* model and
>   deterred (not recovered) by reputation + a global blacklist + creator roster control. See §1.3 —
>   this is disclosed plainly to the auditors; we do not claim default is impossible.
> - **(2026-06-27) Shared core, two engines.** One MemberRegistry + one Vault/CompoundIntegrator +
>   one LotteryEngine; both engines authorized; all fund accounting namespaced by engine address.

---

## 0. What ChainPot V4 is

ChainPot is an **invite-only ROSCA protocol** (rotating savings & credit / "chit fund") for
**pre-vetted, trusted groups**, with **two programs** sharing one hardened settlement core. There is
**no collateral anywhere in the system** — trust is established off-chain by the creator and enforced
on-chain by the invite gate, payment-gated eligibility, reputation, and a global blacklist.


|                        | **Program A — Circle**                                   | **Program B — Market**                                                                      |
| ---------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Audience               | Communities, friends, family                             | Trusted business/trading circles needing rotating liquidity                                 |
| Engine                 | `CircleEngineV4`                                          | `AuctionEngineV4`                                                                            |
| Winner selection       | **VRF random** each cycle among **not-yet-won** members  | **Lowest bid wins** (discount = cost of early cash); VRF only when *nobody* bids             |
| Discount / yield       | No discount; Compound interest split among members       | Discount + interest split among the cycle's non-winners                                      |
| Collateral             | **None** — invite + reputation + blacklist               | **None** — invite + reputation + blacklist; full liquidity to winner                         |
| Trust anchor           | Creator's vetted roster (off-chain) + on-chain gating    | Creator's vetted roster (off-chain) + on-chain gating                                        |
| Attack surface removed | No bidding ⇒ **M-01, M-02, M-03 N/A**                    | Full auction machinery, hardened                                                             |


Both programs enforce the **two structural ROSCA invariants** that V3 violates:

1. **N members ⇔ N cycles ⇔ each paid-up member wins exactly once** (V3 breaks via H-01, H-02, M-05).
2. **Each cycle's collected funds are irreversible; no single actor can brick or over-draw a cycle**
   (V3 breaks via C-01, H-03, H-04, M-06).

Everything below restores those invariants and removes the trust assumptions the auditors flagged —
**while stating honestly that residual credit risk is not zero** (§1.3). Under a no-collateral model
that residual risk is borne by the trusted roster by design, not engineered away.

---

## 1. The security model — read this first

### 1.1 One structural lever, two deterrents

V3's `[C-01]` root cause: an on-chain ROSCA extends *unsecured credit* (you can receive the pot
before paying all dues), and V3 handed that credit to **free, instant, anonymous, infinitely
reproducible wallets**. The rational attack was `register → join → pay one cycle → win → vanish`.

With **no collateral**, we do not try to make that attack economically impossible on-chain. Instead:


| Mechanism                         | Purpose                                            | V4 implementation                                                                                                   |
| --------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Invite gate (Merkle)** *(primary)* | Kills "infinite free anonymous wallets"          | Creator commits a vetted roster off-chain; only proof-holders join. Roster is **frozen at `startPot`**. The auditor's headline recommendation and the *primary* C-01 fix. |
| **Payment-gated eligibility**     | A non-payer can never receive a payout             | A member must have paid the current cycle to be in that cycle's draw/auction. Skip payment ⇒ excluded + flagged.     |
| **Reputation + global blacklist** *(deterrent)* | A *vetted* member who defaults pays a lasting cost | Default ⇒ reputation slash + global blacklist ⇒ barred from joining **any** future pot (Program A *and* B). Creator can re-issue a root excluding them. |

There is **no on-chain economic recovery** of a defaulter's unpaid future dues, because there is no
bond to debit. That is the deliberate trade for full liquidity + a trusted roster.

### 1.2 The trade-off, stated plainly (no dial)

> **You cannot simultaneously have (a) full early-cash liquidity, (b) an open/anonymous roster, and
> (c) zero default risk.** ChainPot V4 picks the corner: **(a) full liquidity + (c′) a *trusted*
> roster that makes default rare and costly — accepting a small, disclosed residual default risk** —
> by giving up (b). The roster is curated by the creator; the protocol does not pretend strangers are
> safe.

Because we removed collateral, the winner **always** receives the full pot to `withdrawable[]` (pull).
No withholding, no partial liquidity, no policy enum. This is simpler to reason about, simpler to
audit, and matches the product: trusted parties who need usable cash *now*.

### 1.3 Honest disclosure for the auditors

With the invite gate in place, **the C-01 attack as written (anonymous infinite wallets) is no longer
possible.** An attacker can only act *inside a roster a creator deliberately vetted*. The remaining
risk is ordinary, disclosed credit risk with two faces:

- **Pre-win default:** a member stops paying before ever winning. *Fully contained on-chain* — they
  are excluded from all future draws (payment-gated eligibility), the cycle simply collects less
  (pull payments → never bricks), and they are reputation-slashed + globally blacklisted.
- **Post-win default ("win early, then vanish"):** a member wins an early cycle, receives full
  liquidity, then stops paying. **There is no on-chain recovery** — the shortfall is borne pro-rata
  by later members and is resolved socially/off-chain (the roster is, by construction, a known and
  trusted group). The defaulter is reputation-slashed and globally blacklisted.

We will state this explicitly in the re-audit handoff (§12) rather than claim a false absolute.
**Conservation always holds** (§8 #6): the protocol never creates or destroys funds and can never be
bricked by a default — it only redistributes a smaller-than-ideal pot, transparently, via pull.

---

## 2. Architecture — shared core, two engines

```
                         ┌───────────────────────────────┐
                         │     MemberRegistryV4           │  identity, reputation,
                         │  (was MemberAccountManager)    │  global blacklist, engine auth
                         └───────────────────────────────┘
                              ▲                        ▲
                ┌─────────────┘                        └──────────────┐
        ┌────────────────┐                                    ┌────────────────┐
        │ CircleEngineV4 │  Program A (social, VRF rotation)  │ AuctionEngineV4│ Program B (low-bid)
        └────────────────┘                                    └────────────────┘
                │   │                                                │   │
                ▼   ▼                                                ▼   ▼
        ┌─────────────────────────────────────────────────────────────────────┐
        │   VaultV4 (was EscrowV3): per-cycle contributions + pull-payment      │
        │   `withdrawable[]` ledger. Multi-engine. NO collateral ledger.        │
        │   Keys: funds[engine][potId][cycleId];  withdrawable[user] (global)   │
        └─────────────────────────────────────────────────────────────────────┘
                                        │  (only the Vault calls the integrator)
                                        ▼
                         ┌───────────────────────────────┐
                         │   CompoundIntegratorV4         │  single global Compound III position,
                         │   ERC4626 internal accounting   │  virtual-shares offset, revert-on-zero
                         │   (H-05 / [I])                  │  totalAssets = snapshotted, donation-immune
                         └───────────────────────────────┘

        LotteryEngineV4 (Chainlink VRF v2.5) ── shared; BOTH engines allowlisted as requesters
```

### 2.1 Multi-engine authorization & ID namespacing

- **`VaultV4`** replaces V3's single `address auctionEngine` + `onlyAuctionEngine` with
  `mapping(address => bool) public isEngine` + `onlyEngine`. Each engine keeps its **own**
  `potCounter`/`cycleCounter`; the Vault namespaces every per-cycle mapping by `msg.sender` (the
  calling engine) so two engines can never collide on IDs:
  ```solidity
  mapping(address => mapping(uint256 => mapping(uint256 => CycleFunds))) private funds; // engine→pot→cycle
  mapping(address => uint256) public withdrawable;                                      // GLOBAL per-user pull ledger
  ```
  There is **no `collateral` mapping** — the no-collateral decision removes it entirely.
- **`MemberRegistryV4`** keeps `authorizedCallers` — add both engines + the Vault. Reputation &
  blacklist are **global** across both programs (a defaulter in B is barred from A too).
- **`CompoundIntegratorV4`** is called **only by the Vault** (never by engines). The Vault forwards a
  collision-free key `cycleKey = keccak256(abi.encode(engine, potId, cycleId))`; the integrator is a
  **single global ERC4626-style position** and the Vault holds the per-cycle *share* ledger. This
  removes V3's duplicated per-cycle bookkeeping and fixes H-05/[I] in one audited place.

### 2.2 Why one shared core — and its honest blast-radius note

One Compound position (capital-efficient yield, no fragmentation), one identity/blacklist source of
truth, and the highest-risk math (share accounting) is audited **once**. Isolation between engines is
preserved by namespacing + the `onlyEngine` boundary.

**Disclosed trade-off:** a single shared Compound position means a share-accounting bug has a
*protocol-wide* blast radius. We mitigate this by (a) adopting OZ ERC4626 virtual-shares verbatim
rather than hand-rolling, (b) a dedicated invariant/fuzz suite for conservation + share-price
monotonicity (§8 #6/#7), and (c) phasing the rollout (§10) so the core ships and bakes under
Program A before Program B's auction load is added.

---

## 3. Finding-by-finding remediation

Legend: **CE**=CircleEngineV4, **AE**=AuctionEngineV4, **VA**=VaultV4, **CI**=CompoundIntegratorV4,
**LE**=LotteryEngineV4, **MR**=MemberRegistryV4. "A/B" notes which program a fix applies to.


| ID                           | Severity | Status                       | Where          | How                                                                                                                                                                                                                                                          |
| ---------------------------- | -------- | ---------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **C-01**                     | Critical | **Mitigated (disclosed)**    | CE, AE, VA, MR | Invite-only Merkle gate (frozen at `startPot`) + payment-gated eligibility + reputation slash + global blacklist + creator roster re-issue. **No collateral by product decision.** Pre-win default fully contained; post-win default disclosed & socially recoverable (§1.3). |
| **C-02**                     | Critical | **Fixed**                    | CE, AE, LE     | `MIN_AMOUNT_PER_CYCLE`; VRF requested **only** when `cycle.totalCollected == amountPerCycle × paidMembers` for the funded set **and** `eligible.length ≥ 2`; last-eligible deterministic fast-path (no VRF). Invite-gate makes throwaway pots cost real vetted wallets. §4.4. |
| **H-01**                     | High     | **Fixed**                    | CE, AE         | `mapping(uint256 potId => mapping(address => bool)) hasWonInPot`, set in one `_recordWinner` helper; `placeBid` (B) reverts `AlreadyWonThisPot`; VRF eligible-set (A&B) excludes winners.                                                                    |
| **H-02**                     | High     | **Fixed**                    | CE, AE, LE     | `_eligibleMembers(potId, cycleId)` = paid-this-cycle ∧ ¬won ∧ ¬defaulted; that filtered array is what's passed to `LE.requestRandomWinner`. Belt-and-suspenders `!hasWonInPot[winner]` assert in the VRF callback.                                          |
| **H-03**                     | High     | **Fixed**                    | AE, VA         | Bid ceiling changes from `amountPerCycle × members.length` (hopeful) to **`cycle.totalCollected`** (actual). Re-assert `winningBid ≤ totalCollected` at `completeCycle`. A short cycle (post-default) just pays a smaller pot via pull — never bricks, never over-pays. |
| **H-04**                     | High     | **Fixed**                    | VA             | **Pull over push.** `completeCycle`/`cancelStuckVRFCycle` **credit** `withdrawable[recipient] += amount` instead of `safeTransfer` per recipient. `claim()` does the single transfer. One USDC-blacklisted member can't revert finalization.                |
| **H-05**                     | High     | **Fixed**                    | CI             | Delete `if (shares == 0) shares = amount;`; **revert `ZeroShares()`**. Adopt OZ ERC4626 **virtual-shares / decimal offset** so the first-depositor/inflation path is unreachable.                                                                            |
| **M-01**                     | Med      | **Fixed (B) / N/A (A)**      | AE             | Bids **monotonically non-increasing & non-withdrawable**: a re-bid must be *strictly lower*. Track `lowestBid`/`lowestBidder` incrementally. Program A has no bidding.                                                                                       |
| **M-02**                     | Med      | **Fixed (B) / N/A (A)**      | AE, MR         | Reputation for bidding granted **once per (member, cycle)** on first bid only (`hasBidThisCycle` + `firstBid` arg to `MR.updateBidInfo`).                                                                                                                    |
| **M-03**                     | Med      | **Fixed (B) / N/A (A)**      | AE             | `MIN_BID_STEP_BPS` (default 200 = 2%): a new lowest must beat the standing lowest by ≥ the step.                                                                                                                                                             |
| **M-04**                     | Med      | **Fixed (gated lockout)**    | MR, CE, AE     | Reputation has teeth as a **post-default lockout**: `markAsDefaulter` slashes rep **and** sets `isBlacklisted`; `isBlacklisted` hard-blocks `joinPot`/`createPot`. **Honest note:** fresh wallets start at `INITIAL_REPUTATION` (≥ any join threshold), so the reputation *floor* only bites after a slash — the invite gate, not the floor, is what stops uninvited sybils. Documented for auditors. |
| **M-05**                     | Med      | **Fixed**                    | CE, AE         | `memberCount` single param; `createPot` enforces `memberCount == cycleCount == expectedMembers`; `startPot` requires `members.length == expectedMembers`. Range membership removed.                                                                          |
| **M-06**                     | Med      | **Fixed**                    | CE, AE         | `payForCycle` adds `if (block.timestamp >= paymentDeadline) revert PaymentWindowClosed();` where `paymentDeadline = cycle.startTime + paymentWindow` and `paymentWindow < biddingDeadline < cycleDuration`. After it, the cycle settles with whatever was paid. |
| **L-01**                     | Low      | **Fixed**                    | CE, AE         | `MAX_JOINED_POTS` cap; the invite-gate already prevents mass uninvited joins.                                                                                                                                                                               |
| **L-02**                     | Low      | **Fixed**                    | CE, AE, MR     | `JOIN_LEAVE_COOLDOWN`; repeated pre-start leaves slash reputation; creator can re-issue a root excluding a griefer (roster mutable **only before `startPot`**).                                                                                              |
| **L-03**                     | Low      | **Fixed**                    | VA, CI         | Remove `emergencyWithdrawAll` / broad `emergencyWithdrawUSDC`. Replace with a **timelocked, surplus-only rescue** (`balanceOf − Σ tracked obligations`) that can never touch member principal. `rescueTokens` (non-USDC) stays.                              |
| **[I]** CEI                  | Info     | **Fixed**                    | VA, CI         | All state writes **before** external calls in `depositFromMember` / `supplyForKey`.                                                                                                                                                                         |
| **[I]** raw balance          | Info     | **Fixed**                    | CI             | `totalAssets()` returns a **snapshotted internal figure** (`internalPrincipal` + interest realized at controlled `accrue()` points), not live `COMET.balanceOf`. Combined with the virtual offset, direct-donation share-price manipulation is dead. See §2.1 / §7.3 for the accrual contract. |
| **[I]** participant mismatch | Info     | **Fixed**                    | AE, CE, LE     | `MAX_MEMBERS == LE.MAX_PARTICIPANTS` (single shared constant, 100). Dead `TooManyParticipants` branch becomes live.                                                                                                                                         |


---

## 4. Shared mechanisms (used by both engines)

### 4.1 Invite gate (Merkle) — closes C-01 sybil, L-01, L-02

- `createPot(..., bytes32 merkleRoot, uint256 expectedMembers, ...)`. Leaves =
  `keccak256(bytes.concat(keccak256(abi.encode(memberAddress))))` (OZ double-hash leaf convention),
  built with [`@openzeppelin/merkle-tree`](https://github.com/OpenZeppelin/merkle-tree). A proof is
  bound to `msg.sender`'s own address, so proofs are non-transferable (no front-running another
  member's slot).
- `joinPot(potId, bytes32[] calldata proof)` requires `MerkleProof.verify(proof, root, leaf)` **and**
  `!MR.isBlacklisted(msg.sender)`.
- **Roster mutability:** the creator may update `merkleRoot` **only while the pot is `Open`** (before
  `startPot`), to drop a pre-start griefer (L-02). Once `startPot` succeeds, **the root and roster are
  frozen for the pot's life** — no member can be added or removed. (Auditor-critical: prevents a
  creator from swapping members mid-pot.)
- The invited set is the **fixed roster**; `expectedMembers == cycleCount`. The pot can't start until
  `members.length == expectedMembers` (enforces M-05 + invariant #1).
- `MAX_JOINED_POTS` cap + `JOIN_LEAVE_COOLDOWN` as defense-in-depth (L-01/L-02).

> **Disclosed trust assumption:** the creator is the trust anchor. A malicious creator can curate a
> roster of addresses they control. This is inherent to a permissioned, no-collateral ROSCA and is
> stated to auditors and surfaced in the UI (roster + creator reputation are visible before joining).

### 4.2 Default handling without collateral — closes C-01 default path, H-03

There is no bond to debit. Default handling is therefore **exclusion + redistribution + deterrence**,
never recovery:

- **`payForCycle` before `paymentDeadline`** is the sole way to fund a member's slot for a cycle.
- **`settleCycle(potId, cycleId)`** (permissionless, after `paymentDeadline`): for each member who did
  **not** pay, set `defaulted[potId][member] = true`, call `MR.markAsDefaulter` (reputation slash +
  global blacklist). It debits nothing — there is nothing to debit.
- **Eligibility:** the winner draw/auction for a cycle is restricted to members who **paid that cycle**
  and are `¬hasWonInPot ∧ ¬defaulted`. A non-payer can therefore **never** receive a payout (closes the
  C-01 "lowball and vanish" payout path for the *current* cycle).
- **A cycle pays out exactly what it collected** (`totalCollected`, possibly < `amountPerCycle × N`),
  via pull. It can never brick (H-04) and can never over-pay (H-03).
- **Graceful early completion:** if a cycle has **no eligible winner** (every remaining non-winner has
  defaulted), the pot transitions to `Completed`; any funds held for not-yet-finalized cycles are
  credited back pro-rata to compliant members via `withdrawable`. Conservation (§8 #6) holds throughout.

> The post-win default shortfall (§1.3) is **not** repaired on-chain. It is borne by later members and
> resolved off-chain within the trusted group. This is the explicit cost of the no-collateral model.

### 4.3 Pull payments — closes H-04

`VaultV4.withdrawable[user]` (global) + `claim()` / `claimFor(address)` keeper helper. Finalization
**credits** internally; `claim()` is the only `safeTransfer`.

**Auditor-critical correction vs. the prior draft:** the global blacklist gates **joining new pots
only**. It **never** blocks `claim()` of funds already credited to a user's `withdrawable[]`. A
member's already-earned funds are always withdrawable by them. (We removed the old
`emergencyWithdraw` *and* refuse to introduce an owner power that can freeze user balances — see L-03.)

### 4.4 VRF economic gate — closes C-02 (both programs use VRF)

`LE.requestRandomWinner` is called by an engine **only** when:

1. The cycle is **funded** — `cycle.totalCollected == amountPerCycle × paidMembers` for the paid set
   (post-`settleCycle`), and `cycle.totalCollected ≥ MIN_AMOUNT_PER_CYCLE`; **and**
2. `eligible.length ≥ 2` (the paid, not-yet-won, non-defaulted set). If `eligible.length == 1`, assign
   directly — **no VRF**.

`MIN_AMOUNT_PER_CYCLE` (1e6 = 1 USDC) blocks dust pots. Engines stay allowlisted on LE
(`setAuthorizedRequester`). Result: triggering a paid VRF call **requires** locking real, invited,
funded capital — V3's throwaway-pot LINK drain is gone.

---

## 5. Program A — `CircleEngineV4` (social, no bidding)

Lifecycle: `createPot(merkleRoot, memberCount, amountPerCycle, cycleDuration, frequency)` →
members `joinPot(proof)` → `startPot` (roster full, root frozen) → per cycle: `startCycle` → members
`payForCycle` (before deadline) → `settleCycle` (flag non-payers) → `drawWinner` → `completeCycle`
(pay winner full pot via `withdrawable`, split interest to members) → repeat N times.

- **No `placeBid`.** Winner each cycle = **VRF random among `_eligibleMembers` (paid, not-yet-won)**.
- **VRF cost option (locked default):** **one VRF call at `startPot`** produces a seed that
  deterministically fixes the *winning order* over a Fisher–Yates shuffle of the roster; each cycle's
  winner is read from that order, skipping any member who defaulted (their turn is forfeited and the
  pot completes among the remaining compliant members). This costs **1 VRF call per pot** instead of
  N−1, and removes the per-cycle VRF-spam surface for Program A entirely.
  - *Disclosed trade-off:* a start-of-pot shuffle reveals each member's eventual slot in advance,
    marginally raising strategic-default incentive vs. per-cycle draws. For a *trusted* social circle
    this is acceptable and the cost saving is large. A `perCycleVRF` boolean is kept (default off) for
    creators who prefer hidden future winners and accept N−1 VRF calls.
- **Payout** = full pot (`amountPerCycle × paidMembers`), no discount. **Interest** (Compound yield on
  the cycle's deposits) split among all members (§9.2) via `withdrawable`.
- **Findings N/A here:** M-01/M-02/M-03 (no bidding). **Active:** C-01, C-02, H-01, H-02, H-04, H-05,
  M-04, M-05, M-06, L-01, L-02, L-03, all [I].

## 6. Program B — `AuctionEngineV4` (low-bid market)

Same skeleton as A, plus the discount auction (this is V3's `AuctionEngineV3` hardened):

- **`placeBid(cycleId, amount)`:** requires registered, member, **paid this cycle**, **not defaulted**,
  before the bidding deadline (M-06), **`!hasWonInPot`** (H-01), `amount` in
  `[lowestBid·(1−step), totalCollected)` (H-03 + M-03), **strictly lower than own previous bid** (M-01).
  First bid → `firstBid=true` to MR (M-02). `lowestBid`/`lowestBidder` updated incrementally (kills
  V3's O(n) loop).
- **`declareWinner`:** if any bids → `lowestBidder` is already known (no loop). If **no bids** → VRF
  among `_eligibleMembers`, gated by §4.4. VRF winner takes the **full pot** (no discount).
- **`completeCycle`:** pay winner `winningBid` (always full liquidity to `withdrawable`), assert
  `winningBid ≤ totalCollected` (H-03), harvest the remainder (discount + interest), split pro-rata to
  **non-winners** via `withdrawable` (C-01 distribution, now pull).
- **Findings active:** all of them.

---

## 7. Concrete state & signature changes

### 7.1 MemberRegistryV4 (was MemberAccountManagerV3)

```solidity
mapping(address => bool) public isBlacklisted;                 // (M-04/L-02) global, gates joins only
// INITIAL_REPUTATION stays 100; thresholds below act as a post-slash lockout, not a pre-screen (see M-04 note)
uint256 public constant MIN_REPUTATION_TO_JOIN   = 50;
uint256 public constant MIN_REPUTATION_TO_CREATE = 75;

// updateBidInfo gains `bool firstBid`; awards REPUTATION_BID only when firstBid==true            (M-02)
function updateBidInfo(address u, uint256 potId, uint256 cycleId, uint256 bid, bool didBid, bool firstBid) external;
// markAsDefaulter slashes reputation AND sets isBlacklisted[u]=true                              (M-04)
function markAsDefaulter(address u, uint256 potId, uint256 cycleId) external; // authorized engines only
// blacklist clearing is governance-only and gates joins; it NEVER touches withdrawable balances
function setBlacklist(address u, bool v) external onlyGovernance;             // (§9.3)
// authorizedCallers already exists → add CircleEngine, AuctionEngine, Vault
```

### 7.2 VaultV4 (was EscrowV3)

```solidity
mapping(address => bool) public isEngine;                      // multi-engine auth (§2.1)
modifier onlyEngine() { if (!isEngine[msg.sender]) revert UnauthorizedCaller(); _; }

mapping(address => mapping(uint256 => mapping(uint256 => CycleFunds))) private funds;   // engine→pot→cycle
mapping(address => uint256) public withdrawable;              // (H-04) GLOBAL pull ledger
// NO collateral mapping — removed under the no-collateral product decision.

function depositForCycle(uint256 potId, uint256 cycleId, address member, uint256 amount) external onlyEngine; // payForCycle
function creditWithdrawable(address to, uint256 amount) external onlyEngine;                                  // replaces push
function claim() external nonReentrant;                                                                       // single safeTransfer
function claimFor(address user) external nonReentrant;                                                        // keeper helper; credits ONLY, gated by neither blacklist
// releaseFundsToWinner / distributeRemainderTo → credit withdrawable instead of safeTransfer (H-04)
// depositForCycle: state writes BEFORE external calls ([I] CEI)
// emergencyWithdraw* removed → timelocked surplus-only rescue (L-03)
function rescueSurplus(address to) external onlyGovernance;   // moves only balanceOf − Σtracked obligations, after RESCUE_TIMELOCK
```

### 7.3 CompoundIntegratorV4 (was CompoundIntegratorV3)

```solidity
// ERC4626-style internal accounting. Single global Comet position keyed by cycleKey.
uint256 public internalPrincipal;                            // ([I]) internal denominator basis
uint256 public totalShares;                                  // sum of all cycleKey shares
uint256 private constant DECIMALS_OFFSET = 3;                // (H-05) OZ virtual-shares EXPONENT → 10**3 virtual shares/assets

// Accrual contract (resolves the prior draft's totalAssets inconsistency):
//   accrue() reads COMET.balanceOf ONCE, sets realizedAssets = max(internalPrincipal, balanceOf),
//   and is called at the START of every supplyForKey / withdrawForKey before any share math.
//   Between accrue() points the figure is frozen, so a direct COMET.supplyTo donation cannot move
//   share price mid-operation; the donation is only ever recognized at the next controlled accrue().
function accrue() public;                                    // realize balanceOf − internalPrincipal into realizedAssets
function totalAssets() public view returns (uint256);        // returns realizedAssets (snapshot), NOT live balanceOf
function convertToShares(uint256 a) public view returns (uint256); // (a·(totalShares+10**OFFSET))/(totalAssets+1)
function convertToAssets(uint256 s) public view returns (uint256);

// supplyForKey/withdrawForKey keyed by bytes32 cycleKey = keccak256(engine,potId,cycleId) (§2.1)
// supply path: REVERT ZeroShares() instead of 1:1 fallback (H-05); state before external (CEI)
// onlyAuthorized = Vault only
```

### 7.4 LotteryEngineV4

```solidity
uint256 public constant MAX_PARTICIPANTS = 100;              // == engines' MAX_MEMBERS  ([I])
// requestRandomWinner receives the pre-filtered ELIGIBLE (paid, non-winner, non-defaulted) set (H-02)
// both CircleEngineV4 and AuctionEngineV4 set as authorizedRequesters
// Program A default path uses ONE request at startPot (seed → shuffle); per-cycle requests are opt-in
```

### 7.5 Engine constants (shared)

```solidity
uint256 public constant MIN_AMOUNT_PER_CYCLE = 1e6;   // 1 USDC (C-02)
uint256 public constant MAX_MEMBERS          = 100;   // == LE.MAX_PARTICIPANTS ([I])
uint256 public constant MAX_JOINED_POTS      = 50;    // (L-01)
uint256 public constant JOIN_LEAVE_COOLDOWN  = 1 days;// (L-02)
uint256 public constant MIN_BID_STEP_BPS     = 200;   // 2% (M-03, AE only)
// NO CollateralPolicy enum, NO collateralMultiplier — removed.
// Pot struct adds:   bytes32 merkleRoot; bool rootFrozen; uint256 expectedMembers; bool perCycleVRF; (CE)
// Cycle struct adds: uint256 lowestBid; address lowestBidder; bool settled; mapping(address=>bool) hasBidThisCycle; (AE)
// New: mapping(uint256=>mapping(address=>bool)) public hasWonInPot;
//      mapping(uint256=>mapping(address=>bool)) public defaulted;
//      mapping(uint256=>mapping(address=>uint256)) lastJoinLeave;
```

---

## 8. Invariants to assert (tests + formal review)

1. `expectedMembers == cycleCount` and `members.length == expectedMembers` before `startPot`; root
   frozen at `startPot` and never changes after. (M-05 / §4.1)
2. After `settleCycle`: `totalCollected == amountPerCycle × paidMembers`, where
   `paidMembers == N − defaultersThisCycle`; and `winningBid ≤ totalCollected` holds. (H-03/C-01)
3. `Σ hasWonInPot[potId] over the pot's life ≤ cycleCount`; **no address wins twice**; only
   `paid ∧ ¬defaulted` members are ever eligible. (H-01/H-02)
4. `winningBid ≤ totalCollected` always. (H-03)
5. **No payout to a non-payer:** for every cycle, `winner` paid that cycle. (C-01)
6. **Conservation:** `Σ withdrawable + Σ live-cycle deposits == Vault USDC + Compound value`, where
   *Compound value ≥ principal* (interest is an inflow, never an outflow). No default or external call
   can create or destroy funds. (H-04/H-05)
7. `convertToShares(x) == 0 ⇒ revert`; price-per-share strictly non-decreasing across `accrue()`
   points; immune to direct `COMET.supplyTo` donation between accruals. (H-05/[I])
8. **No brick:** no external call and no single blacklisted/defaulting address can leave a cycle
   un-finalizable; `completeCycle` always reaches `Completed` or the pot gracefully early-completes
   with pro-rata refunds. (H-04 / §4.2)
9. VRF requested only when the cycle is funded **and** `eligible.length ≥ 2`; `eligible.length == 1`
   assigns directly; Program A default path issues exactly **one** VRF request per pot. (C-02/H-02)
10. **Namespacing:** `funds[engineA][p][c]` and `funds[engineB][p][c]` are independent; no engine can
    read/write another's ledger. (architecture)
11. **Blacklist scope:** `isBlacklisted[u]` blocks `joinPot`/`createPot` but never blocks
    `u`'s `claim()`/`claimFor(u)`. (§4.3)

---

## 9. Resolved product decisions

1. **Collateral.** *Removed.* No bonds, no `collateralMultiplier`, no `CollateralPolicy`. (2026-06-27)
2. **Interest-split audience.** A: split among all members. B: among the cycle's non-winners (V3
   behavior). (Confirm at coding step 5.)
3. **Blacklist clearing.** Governance-only (`setBlacklist`, behind the 2/3 multisig + timelock).
   Gates joins only; auto-expiry deliberately *not* implemented so a default is durable. (Confirm
   punitiveness with stakeholder.)
4. **Keeper model — decided.** `settleCycle`/`drawWinner`/`completeCycle`/`claimFor` are **permissionless
   and publicly callable**, paying a small fixed bounty (capped, taken from the cycle's interest
   remainder) to the caller of the state-advancing call, with a protocol keeper as backstop. This
   removes any single-keeper liveness dependency. (Bounty size to finalize at step 5.)
5. **VRF budget for Program A — decided.** Default = **one VRF shuffle at `startPot`** (1 call/pot).
   `perCycleVRF` opt-in for creators who want hidden future winners (N−1 calls/pot). Size the LINK
   subscription for the 1-call default. (§5)

---

## 10. Implementation order (PR sequencing — each step independently compilable + testable)

> **Phased rollout (professional recommendation):** ship **the shared core + Program A first** to
> mainnet under its own audit, let it bake, then add **Program B** in a second audited release. This
> minimizes the surface of the first re-audit and de-risks the shared Compound position before auction
> load is introduced.

**Release 1 — core + Program A**
1. **CI hardening** (H-05, [I]): ERC4626 internal assets + virtual offset + `accrue()` snapshot
   contract + revert-on-zero + `cycleKey` API. *No engine-facing behavior change yet.*
2. **VA**: multi-engine auth, namespaced `funds`, `withdrawable` + `claim`/`claimFor`, credit-not-push
   (H-04), CEI ([I]), remove emergency sweeps → surplus-only timelocked rescue (L-03). **No collateral.**
3. **MR**: `firstBid` arg (M-02), `isBlacklisted` + `markAsDefaulter` hook + join/create gates (M-04),
   blacklist gates joins only (never claims).
4. **LE**: eligible-set input, `MAX_PARTICIPANTS = 100` ([I]); allowlist CircleEngine; start-of-pot
   shuffle support.
5. **CircleEngineV4** (Program A): Merkle gate + frozen roster (C-01/M-05/§4.1), payment-gated
   eligibility + `settleCycle` flagging (C-01/§4.2), VRF shuffle at start + economic gate + last-eligible
   fast path (C-02/H-01/H-02), payment deadline (M-06), cooldown/caps (L-01/L-02), pull finalize +
   graceful early-completion (H-04/§4.2).
6. **DeployV4 (R1) + wiring**: deploy core + CircleEngine, `addEngine`/`addAuthorizedCaller`/
   `setAuthorizedRequester`, `setCometRewards`, transfer `owner()`/governance to a 2/3 multisig + timelock.

**Release 2 — Program B**
7. **AuctionEngineV4** (Program B): all of step 5 **plus** the hardened auction — monotonic lower-only
   bids (M-01), min-step (M-03), once-per-cycle bid reputation (M-02), `hasWonInPot` bid gate (H-01),
   `totalCollected` bid ceiling (H-03), full-liquidity payout. Allowlist on VA + LE; re-audit delta only.

**Cross-cutting**
8. **Front-end / off-chain**: OZ `@openzeppelin/merkle-tree` roster builder + proof endpoint, roster +
   creator-reputation display before join, a public-callable keeper bot for
   `settleCycle`/`drawWinner`/`completeCycle`/`claimFor`, and the residual-risk disclosure surfaced in-app.

---

## 11. Testing plan (Foundry)

- **Per-finding regression tests** (reproduce the V3 attack, assert it reverts/fails on V4), tagged by
  program: `test_C01_inviteGate_blocksUninvited`, `test_C01_nonPayer_neverWins`,
  `test_C01_postWinDefault_conservationHolds_noBrick`, `test_C02_vrfOnlyWhenFunded_reverts`,
  `test_H01_doubleWin_reverts`, `test_H02_lotteryExcludesWinnersAndDefaulters`, `test_H03_overBid_reverts`,
  `test_H04_blacklistedWinner_doesNotBrick`, `test_H05_zeroShares_reverts`, `test_M01_raiseBid_reverts`,
  `test_M02_repeatBid_noRep`, `test_M03_minStep`, `test_M05_fixedRoster`, `test_M06_payAfterDeadline_reverts`,
  `test_L03_noEmergencySweep`.
- **Blacklist-scope tests**: `test_blacklist_blocksJoin_butAllowsClaim` (invariant #11) — a blacklisted
  user can still `claim()` already-credited funds.
- **Roster-freeze tests**: root mutable before `startPot`, immutable after (§4.1); proof non-transferable.
- **Default tests (no collateral)**: pre-win default contained; post-win default → smaller pot, pull,
  reputation slash + blacklist, conservation intact; graceful early-completion with pro-rata refunds.
- **Two-program isolation tests**: same potId in both engines never cross-contaminates Vault/CI state
  (invariant #10); a blacklist from B blocks join in A.
- **Invariant/fuzz (StdInvariant)** for §8: conservation of funds (#6), no-double-win / no-payout-to-non-payer
  (#3/#5), share-price monotonicity & donation-immunity across `accrue()` (#7), no-brick (#8).
- **Fork tests** vs Base USDC + Comet: real CI interest math; `accrue()` snapshot vs live balance;
  a real USDC-blacklist scenario for H-04 (known blacklisted address or a USDC mock reverting on transfer).
- **VRF tests**: start-of-pot shuffle determinism + defaulter-skip; `perCycleVRF` opt-in path;
  `cancelStuckVRFCycle` liveness.
- Gas-snapshot `joinPot` (Merkle verify), `settleCycle` (≤100-member loop + `markAsDefaulter` calls),
  `placeBid` (incremental lowest), `completeCycle` (pull credits), and the VRF paths.
- **Port + extend** the V3 suites to V4 as the baseline.

---

## 12. Re-audit handoff checklist

- [ ] V3 sources unchanged; V4 added under `smart-contracts/v4/src/`.
- [ ] This plan + a **finding → commit/test** mapping table attached.
- [ ] **Explicit residual-risk statement (§1.3):** invite-only, trusted-roster, **no collateral by
      design**. Pre-win default is fully contained on-chain; post-win default is *disclosed* credit risk
      borne by later members and resolved off-chain — never bricks the protocol, never violates
      conservation. No on-chain recovery, by deliberate product choice.
- [ ] **Disclosed trust anchor:** the creator curates the roster; this is inherent to a permissioned
      ROSCA and surfaced in the UI.
- [ ] **Disclosed blast-radius note (§2.2):** single shared Compound position; mitigated by OZ
      virtual-shares + conservation/monotonicity invariants + phased rollout.
- [ ] All §8 invariants covered by passing tests; coverage report attached.
- [ ] Merkle root generation script in repo, reproducible; roster-freeze semantics documented.
- [ ] Two-program architecture diagram + the namespacing argument (invariant #10).
- [ ] Runbook for trusted roles: `owner()`/governance holder per contract (target: 2/3 multisig +
      timelock), VRF subscription owner, and the public-callable keeper bounty parameters.
