# ChainPot — Independent Security Audit (v3)

**Scope:** `src/AuctionEngine.sol`, `src/Escrow.sol`, `src/CompoundIntegrator.sol`, `src/MemberAccountManager.sol`, `src/LotteryEngine.sol`
**Methodology:** Manual review against Compound III (Comet) source/behavior, traditional ROSCA semantics, OWASP-style threat modeling, prior audit reports cross-checked, OpenZeppelin patterns review.
**Verdict:** **NOT MAINNET-READY.** Two critical issues independently found in this review break the core ROSCA contract and the Compound accounting; both pre-existing audits missed them.

---

## Executive summary

| ID | Severity | Title | Status |
|---|---|---|---|
| C-01 | **Critical** | Auction discount (winning-bid surplus) is never distributed; principal is permanently trapped | New finding |
| C-02 | **Critical** | Per-cycle interest accounting in `CompoundIntegrator` is mathematically broken; share denominator never decreases, `cycle.withdrawn` not updated | New finding |
| C-03 | **Critical** | `LotteryEngine.requestRandomWinner` has no access control — VRF subscription drainable by anyone | New finding |
| C-04 | **Critical** | `compoundInterest()` corrupts share-accounting by inflating `totalPrincipalSupplied` with phantom principal | New finding |
| H-01 | High | `startCycle` doesn't require previous cycle complete, combined with pot-scoped (not cycle-scoped) `hasPaidForCycle`, can permanently DoS payments | New finding |
| H-02 | High | VRF flow can be permanently stuck (no timeout, no refund path) | Confirmed prior |
| H-03 | High | `closeBidding` / `declareWinner` / `completeCycle` are creator-only; AWOL/malicious creator = locked funds | New finding |
| H-04 | High | `declareWinner` external-calls `LotteryEngine` before state changes and lacks `nonReentrant` (CEI violation) | Confirmed prior |
| H-05 | High | VRF callback path doesn't verify `winner ∈ pot.members` | Confirmed prior |
| H-06 | High | `MemberAccountManager.registerMember(address user)` lets anyone register anyone — silent griefing surface | New finding |
| H-07 | High | Approval-flow risk in `payForCycle`: plain `approve` to escrow, then escrow uses `safeTransferFrom` — works for USDC but fragile if the token changes | Minor |
| M-01 | Medium | `withdrawInterestForPot` does not increment `cycle.withdrawn`; second invocation on same cycle has undefined behavior | New finding |
| M-02 | Medium | COMP rewards never claimed — yield left on the table; user-visible expectation mismatch | New finding |
| M-03 | Medium | `leavePot` doesn't clean up `MemberAccountManager.joinedPots` (stale state) | New finding |
| M-04 | Medium | No pause-duration cap; admin can lock all funds indefinitely | Confirmed prior |
| M-05 | Medium | No timelock / multisig over `setAuctionEngine`, `setCompoundIntegrator`, `setEscrow` — owner key compromise = total loss | Confirmed prior |
| M-06 | Medium | Hardcoded Base Sepolia USDC/Comet addresses in `CompoundIntegrator` constructor; non-portable; no equality check vs `Escrow.USDC` | New finding |
| M-07 | Medium | `previewRandomWinner` exposed as `external` — uses `block.prevrandao`; documented as unsafe but available to integrators | Confirmed prior |
| L-01 | Low | `completeCycle` makes O(N) external calls to escrow inside a loop — gas DoS as N→100 | Confirmed prior |
| L-02 | Low | `MemberAccountManager.getTopMembers` is O(N²) — DoS on large registries | New finding |
| L-03 | Low | `Escrow.withdrawPotInterest` returns 0 silently when no interest, but auction engine doesn't differentiate "no interest" vs "Compound returned dust" | New finding |
| L-04 | Low | `getCurrentSupplyAPY` precision loss: integer-percent truncation | New finding |
| L-05 | Low | Inconsistent error names (`InvalidAmount` thrown for zero-address) | Confirmed prior |
| I-01 | Info | Lots of leftover deployment-address comments in source files (info leak / clutter) | New finding |
| I-02 | Info | No event when pot creator transfers ownership — pot creator can never be replaced | New finding |
| I-03 | Info | `LotteryEngine.previewRandomWinner` uses `block.prevrandao` which on L2s like Base is not real RANDAO | New finding |

---

## CRITICAL findings

### C-01 — The auction discount is never distributed; principal is permanently trapped

**File:** `Escrow.sol`, `AuctionEngine.sol::completeCycle`
**Severity:** Critical (breaks the core ROSCA economic primitive AND traps user funds)

**The ROSCA semantic.** In a bid-based ROSCA (a.k.a. *kuri / chitfund / Bachat gat*), every member contributes `A` per cycle. The pot of `N×A` is awarded to the winning bidder — but the bidder accepts a *discount* `D` and receives only `A_total − D`. The discount `D` is the prize for bidding — and it is paid to the **non-winning members** as a dividend. That pro-rata discount is the entire economic incentive to bid lower than the pot value. Compound interest in this codebase is a *bonus on top*; the discount is the actual core mechanic.

**What the code does instead.** `AuctionEngine.completeCycle`:

```solidity
uint256 potInterest = escrow.withdrawPotInterest(cycle.potId, cycle.cycleId);
escrow.releaseFundsToWinner(cycle.potId, cycle.cycleId, cycle.winner, cycle.winningBid);
// loop distributes only `potInterest` to non-winners
```

Inside `Escrow.releaseFundsToWinner` (`Escrow.sol:201-212`):

```solidity
compoundIntegrator.withdrawUSDCForPot(potId, cycleId, amount);   // amount = winningBid
USDC.safeTransfer(winner, amount);
cycle.principalInCompound -= amount;       // residual principal stays
```

The cycle `principalInCompound` started at `N×A` (sum of `payForCycle` contributions). After paying the winner `winningBid`, the residual `N×A − winningBid` (the discount) **stays in `cycle.principalInCompound` and is never distributed**. There is no path that withdraws this residual or pays it to non-winners. It accrues compound interest indefinitely as orphaned dust.

**Concrete numerical example.** 10-member pot, 1000 USDC/cycle, total 10,000 USDC. Member bids 8500 (i.e., a 1500 discount). Winner gets 8500. The 1500 USDC residual stays in Compound and is never withdrawn. Members who skipped winning to earn the discount get **only Compound interest** — typically a few cents on a 30-day cycle — instead of 1500/9 ≈ 166 USDC each. Over 10 cycles, ~15,000 USDC of principal becomes unrecoverable.

**Why the bidding mechanism is broken without this.** Without discount distribution, no rational member ever bids less than `pot.amountPerCycle`. The lowest-bid auction reduces to "anyone who wants the money first", and `placeBid` is just a flag. That defeats the chit-fund's interest-rate-discovery purpose.

**Recommendation.** Decide policy and implement explicitly:
1. **Standard ROSCA (recommended):** add `Escrow.distributeDiscount(potId, cycleId, address[] nonWinners, uint256 totalDiscount)` that withdraws `(totalCollected − winningBid)` from Compound and splits pro-rata among non-winners; or roll it into `completeCycle` alongside interest distribution.
2. Track explicitly: `uint256 discountPool = cycle.totalDeposited − cycle.winningBid;` and add it to the per-member payout in the existing loop.
3. Add an invariant test: after `completeCycle`, `cycle.principalInCompound == 0`.

---

### C-02 — `CompoundIntegrator` per-cycle interest math is fundamentally broken

**File:** `CompoundIntegrator.sol::getPotCycleInterest`, `withdrawInterestForPot`, `withdrawUSDCForPot`
**Severity:** Critical (incorrect interest allocation, double-withdraw, eventual revert on legitimate operations)

**Bug 1: Share denominator never decreases.**

```solidity
uint256 cycleShare = (cycle.principalDeposited * 1e18) / totalPrincipalSupplied;
uint256 cycleCurrentValue = (currentCompoundBalance * cycleShare) / 1e18;
```

`totalPrincipalSupplied` is incremented in `supplyUSDCForPot` but **never decremented** in `withdrawUSDCForPot` (the global `totalWithdrawn` is incremented instead). So once Cycle 1 has its principal withdrawn for the winner, the denominator still reflects Cycle 1's principal in the share calc.

Walk-through: two cycles, each deposit 1,000 USDC. `totalPrincipalSupplied = 2000`. After Cycle 1's winner is paid (withdraw 800 + interest), `currentCompoundBalance ≈ 1200 + ε`. Cycle 2's share = `1000/2000 = 0.5`. Cycle 2's "current value" = `1200 × 0.5 = 600`. `getPotCycleInterest(cycle2)` returns `0` (because 600 < 1000) — its actual interest is hidden. Worse, after a few cycles the denominator is double, triple, ten-times the real total — Cycle N's share is rounded down to 0 → no interest distributable to non-winners forever.

**Bug 2: `cycle.withdrawn` is never updated for interest withdrawals.**

`withdrawInterestForPot` (line 226–238) does:
```solidity
COMET.withdraw(USDC_ADDRESS, interestAmount);
USDC.safeTransfer(msg.sender, interestAmount);
totalWithdrawn += interestAmount;
// cycle.withdrawn is NOT updated
```

Compare to `withdrawUSDCForPot` which *does* update `cycle.withdrawn += amount`. The omission means a second call to `getPotCycleInterest(potId, cycleId)` will return a non-zero value derived from `cycleCurrentValue − cycle.principalDeposited − cycle.withdrawn` where `cycle.withdrawn` is still zero — leading to over-counting and an attempted re-withdrawal that may revert or, worse, pull funds from another cycle.

**Bug 3: `releaseFundsToWinner` reduces the pot's principal in Compound but the integrator's `cycle.principalDeposited` is unchanged.** That means subsequent share computations for *this* cycle still treat the pre-payout principal as deposited, while `currentCompoundBalance` is lower — `cycleCurrentValue < cycle.principalDeposited` and `getPotCycleInterest` silently returns 0 forever for that cycle.

**Combined impact.** The contract believes it has interest it doesn't have, distributes wrong amounts, and over time can revert on legitimate withdrawals (`InsufficientUSDCBalance`) because the pro-rata view diverges from Compound's actual ledger. Funds get progressively orphaned in Comet.

**Recommendation.** Replace the pro-rata-of-global-balance design with **per-cycle index accounting**, the same idea Comet itself uses:

1. On `supplyUSDCForPot`, snapshot `cycle.startIndex = COMET.balanceOf(address(this)) - cycle.principalDeposited` *(or directly, snapshot Comet's `baseSupplyIndex`)*.
2. On any read, `cycle.accruedInterest = (cycle.principalDeposited * (currentIndex - cycle.startIndex)) / 1e18`.
3. Decrement `totalPrincipalSupplied -= amount` in `withdrawUSDCForPot`; mirror `cycle.principalDeposited -= amount`.
4. Increment `cycle.withdrawn += interestAmount` in `withdrawInterestForPot`.
5. Add invariant test: `Σ_cycle (principalDeposited − withdrawn) ≤ COMET.balanceOf(address(this))`.

The cleanest implementation is to track each cycle's principal independently in Comet by using sub-account isolation (not natively supported by Comet — so the index-snapshot approach is the right one).

---

### C-03 — `LotteryEngine.requestRandomWinner` has no access control: VRF subscription drainable

**File:** `LotteryEngine.sol:88-114`
**Severity:** Critical (LINK/native gas drain, denial-of-service of all randomness)

```solidity
function requestRandomWinner(address[] memory participants) external returns (uint256 requestId) {
    if (participants.length == 0) revert NoParticipants();
    requestId = s_vrfCoordinator.requestRandomWords(...);   // <-- charges LotteryEngine's subscription
```

No `onlyOwner`, no `onlyAuctionEngine`, no allowlist. Any external account can:

1. Spam `requestRandomWinner([attacker])` with arbitrary participant lists.
2. Drain the LINK/native funds in the LotteryEngine's VRF subscription (each request consumes hundreds of thousands of gas worth of LINK on V2.5).
3. When real ChainPot cycles try to declare winners, the subscription is empty → request reverts → cycles permanently stuck (compounding C-02 / H-02).

The fact that callbacks are routed to `msg.sender` (so the attacker can't fake winners *into* AuctionEngine — `onlyLotteryEngine` modifier on `fulfillRandomWinner` blocks that) prevents *direct* fund theft, but drainage and DoS are trivially achievable.

**Recommendation.** Add allowlist + access control:

```solidity
mapping(address => bool) public authorizedRequesters;

function requestRandomWinner(address[] memory participants) external returns (uint256 requestId) {
    require(authorizedRequesters[msg.sender], "Not authorized");
    if (participants.length == 0) revert NoParticipants();
    if (participants.length > MAX_PARTICIPANTS) revert TooMany();
    ...
}

function setAuthorizedRequester(address requester, bool ok) external onlyOwner { ... }
```

Then call `setAuthorizedRequester(auctionEngine, true)` at deployment.

---

### C-04 — `compoundInterest()` corrupts the accounting

**File:** `CompoundIntegrator.sol:247-257`
**Severity:** Critical (will silently break C-02 even if you fix it)

```solidity
function compoundInterest() external onlyAuthorized whenNotPaused {
    uint256 currentBalance = COMET.balanceOf(address(this));
    uint256 netInterest = currentBalance > totalPrincipalSupplied
        ? currentBalance - totalPrincipalSupplied : 0;
    if (netInterest > 0) {
        totalPrincipalSupplied += netInterest;     // <-- inflates denominator
    }
    lastUpdateTime = block.timestamp;
}
```

This adds the *protocol-wide* net interest to `totalPrincipalSupplied` without attributing it to any cycle. Subsequent share computations now reflect "principal" that includes phantom interest, but the per-cycle `principalDeposited` values do not — so cycle shares immediately under-allocate.

Comet already auto-compounds (interest is in `balanceOf` via the supply index). This function does nothing useful and actively harms the accounting.

**Recommendation.** Delete the function. If it must exist, restrict to `onlyOwner`, no-op the state change, and document it as a metrics-only function.

---

## HIGH findings

### H-01 — `startCycle` doesn't require previous cycle complete; `hasPaidForCycle` is keyed on pot, not cycle

**File:** `AuctionEngine.sol::startCycle` (no check), `payForCycle` (line 326)

`startCycle` only checks `pot.completedCycles < pot.cycleCount` — not that the previous cycle's status is `Completed`. A creator may inadvertently or maliciously call `startCycle` twice. Then both cycles are in `CycleStatus.Active`. `hasPaidForCycle[potId][member]` is set globally per pot/member, so a member who paid Cycle A is `revert AlreadyPaidForCycle()` for Cycle B. Cycle B can never complete (`completeCycle` requires `block.timestamp >= cycle.endTime`, plus winner declared). Cycle A can complete, which `hasPaidForCycle` resets — but if Cycle B's `endTime` already passed, you have an undefined ordering.

**Fix:** In `startCycle`, require:
```solidity
if (pot.cycleIds.length > 0) {
    uint256 lastCycleId = pot.cycleIds[pot.cycleIds.length - 1];
    if (auctionCycles[lastCycleId].status != CycleStatus.Completed)
        revert PreviousCycleNotComplete();
}
```
Also key `hasPaidForCycle` by `(cycleId, member)` for clarity, even though the reset works for the sequential case.

### H-02 — VRF flow has no timeout / refund path

If the VRF coordinator is decommissioned, the subscription unfunded, the keyHash deprecated, or the callback gas is exceeded (200,000 — see prior finding), `cycle.status == AwaitingVRF` permanently. There is no admin override to cancel the cycle and refund deposits.

**Fix:** Add `function cancelStuckCycle(uint256 cycleId)` callable by the owner *or* by any pot member after a long timeout (e.g., 7 days post-`endTime`). On cancel, refund `cycle.totalDeposited` proportionally back to all members from Compound and mark the cycle aborted. Decrement `pot.completedCycles` accounting consistently.

### H-03 — `closeBidding` / `declareWinner` / `completeCycle` are creator-only

These three are bottlenecked on `onlyPotCreator`. If the creator goes silent, loses keys, or maliciously withholds, the cycle hangs and *all member deposits stay locked in Compound forever* (see also H-02). For a system that's supposed to remove middlemen, the creator is now a single point of failure.

**Fix:** After the natural deadline, allow **any** pot member (or any caller) to call these functions. Specifically:
- `closeBidding`: open to anyone after `cycle.endTime - pot.bidDepositDeadline` passes.
- `declareWinner`: open to anyone after some grace period (e.g., 1 hour after closeBidding).
- `completeCycle`: open to anyone after `cycle.endTime`.

This makes the creator's role advisory rather than blocking.

### H-04 — `declareWinner` violates CEI and lacks `nonReentrant`

```solidity
function declareWinner(uint256 cycleId) external onlyPotCreator(...) ... whenNotPaused returns (address) {
    ...
    uint256 requestId = lotteryEngine.requestRandomWinner(pot.members);  // external call
    cycle.vrfRequestId = uint64(requestId);                              // state change AFTER
    requestIdToCycle[requestId] = cycleId;
    cycle.status = CycleStatus.AwaitingVRF;
}
```

Adding `nonReentrant` is cheap defense-in-depth. More importantly, set `cycle.status = AwaitingVRF` *before* calling `lotteryEngine.requestRandomWinner`. If the VRF callback is synchronous in any future fork (or the lottery engine is replaced), you don't want a reentry seeing `BiddingClosed`.

### H-05 — VRF callback doesn't validate winner ∈ members

`fulfillRandomWinner(requestId, winner)` is `onlyLotteryEngine`, so a third party can't inject. But if `LotteryEngine` is upgraded/replaced or has a bug, a non-member could be set as winner — `markAsWinner` would still succeed (the member-manager check is `pot.potId == 0` — see also H-06). Then `releaseFundsToWinner` would transfer USDC to a non-member.

```solidity
require(hasJoinedPot[cycle.potId][winner], "Not a pot member");
```
in both `fulfillRandomWinner` and `checkAndSetVRFWinner`. O(1) check via the existing mapping.

### H-06 — `MemberAccountManager.registerMember(address user)` has no caller check

```solidity
function registerMember(address user) external {
    if (user == address(0)) revert InvalidAddress();
    if (memberProfiles[user].registered) revert AlreadyRegistered(user);
    ...
}
```

Anyone can register *anyone*. Direct exploit is limited (the registered party still controls the address), but:
- Frontrun griefing: a third party can register a target with `INITIAL_REPUTATION = 100` before they would have themselves. Not very harmful here.
- More importantly, suggests confused intent: should it be `msg.sender`? If the goal is self-registration, lock to `user == msg.sender`. If the goal is admin-managed, lock to `onlyOwner` / `onlyAuthorized`.

**Fix:** `require(msg.sender == user, "Self-registration only");` (recommended for permissionless ROSCA).

### H-07 — `payForCycle` uses plain `approve` then escrow uses `safeTransferFrom`

```solidity
USDC.safeTransferFrom(msg.sender, address(this), amount);
USDC.approve(address(escrow), amount);             // plain, not forceApprove
escrow.depositUSDC(...);
```

USDC on Base is fine with non-zero-to-non-zero approvals, so no immediate risk. But (a) you're funneling each user's USDC through `AuctionEngine` for no reason — direct `escrow.depositFrom(member, amount)` is cheaper and safer; (b) if the underlying `USDC` ever upgrades to a token that requires reset-to-zero, this breaks.

**Fix:** Either use `forceApprove` (OZ) or refactor `Escrow.depositUSDC` to take USDC directly via `safeTransferFrom(member, …)` from the member, with `AuctionEngine` only signaling. Saves a hop and an SLOAD.

---

## MEDIUM findings

### M-01 — `cycle.withdrawn` not updated for interest withdrawals

See C-02 Bug 2. Filed separately because even after fixing C-02 with a different design, this specific accumulator bug should be tested.

### M-02 — COMP rewards never claimed

Compound III pays COMP-style rewards through a separate `CometRewards` contract via `claim(comet, src, shouldAccrue)`. The README markets "yield generation" as the platform's sustainability mechanism. The contract claims supply interest only — COMP rewards are forfeited. On Base Sepolia this is academic (no rewards), but on production Base it's real money.

**Fix:** Add an admin `claimComp()` calling `ICometRewards(rewards).claim(address(COMET), address(this), true)` and a strategy decision (auto-distribute pro-rata vs. swap to USDC vs. burn). Doc the choice.

### M-03 — `leavePot` doesn't update `MemberAccountManager`

`AuctionEngine.leavePot` removes the pot from `userPots[msg.sender]` and updates `hasJoinedPot`, but never calls `memberManager.*` — so `joinedPots` set retains the orphaned pot, reputation isn't decremented, and `getMemberProfile` returns stale data forever.

**Fix:** Either call a new `memberManager.removeFromPot(user, potId)`, or accept that MAM is "history" — but document that `joinedPots` is not authoritative.

### M-04 — Indefinite pause possible

Already in prior audit. Confirmed unfixed. With C-03 + this, a compromised owner can pause-and-walk-away, locking all funds.

**Fix:** `MAX_PAUSE = 30 days`; auto-unpause via timestamp check, or governance unpause.

### M-05 — No timelock / multisig on critical admin

`setAuctionEngine`, `setCompoundIntegrator`, `setEscrow`, `addAuthorizedCaller` are all single-tx, single-key operations. A 1-key compromise drains everything (re-route escrow → attacker's contract, drain Compound).

**Fix:** Either OZ `TimelockController` with 48h delay, or transfer ownership to a Gnosis Safe (2-of-3 minimum) prior to any production deploy. This is non-negotiable for a fund-custodying protocol.

### M-06 — Hardcoded Base Sepolia addresses; no consistency check

`CompoundIntegrator` constructor:
```solidity
address public constant COMET_USDC = 0x571621Ce60Cebb0c1D442B5afb38B1663C6Bf017;
address public constant USDC_ADDRESS = 0x036CbD53842c5426634e7929541eC2318f3dCF7e;
```

But `Escrow.USDC` is constructor-passed. Nothing validates `Escrow.USDC == CompoundIntegrator.USDC_ADDRESS`. A misconfigured deployment would silently transfer wrong tokens.

**Fix:** Take `_comet, _usdc` as constructor args; in `Escrow.constructor`, `require(IERC20Metadata(_compoundIntegrator).usdc() == _usdc)`. Add a `chainId` guard if you want defense-in-depth.

### M-07 — `previewRandomWinner` is publicly callable

Already in prior audit. Mitigated by being `view`, but readable on-chain randomness is a foot-gun for any integrator copying the code. On L2s like Base, `block.prevrandao` returns the **L1 prevrandao** (or 0 in some cases), which is not even correctly-distributed randomness for L2 users.

**Fix:** Make `internal`, or remove and put a `// for off-chain testing only` JS helper instead.

---

## LOW / Informational

- **L-01** `completeCycle` does up to N external calls to escrow inside a loop. Use a pull-pattern: record entitlements and let users `claim()`. Reduces gas and makes single-failed-recipient not block all.
- **L-02** `MemberAccountManager.getTopMembers` is O(N²); fine for ~100 members, blows up beyond.
- **L-03** `withdrawPotInterest` returns 0 silently when no interest; auction loop just emits no `InterestDistributed`. OK, but log a "no interest" event for observability.
- **L-04** `getCurrentSupplyAPY` returns integer percent (truncates 5.7% APY to 5). Use 1e18-scaled basis points or 1e6.
- **L-05** Inconsistent error usage: `InvalidAmount()` thrown for zero-address conditions in `AuctionEngine` constructor (lines 151–153).
- **I-01** Lots of `// deployed address: 0x...` comments littering source files — info leak / clutter; strip before final deployment.
- **I-02** No "transfer pot creator" / "elect new creator" logic. With H-03 making creator a single point of failure, design a creator-replacement vote.
- **I-03** `LotteryEngine` `s_vrfCoordinator` is set at construction, not updatable. If Chainlink rotates coordinators (rare but happens on testnets), redeploy is the only option. Consider an `updateCoordinator(addr)` with timelock.
- **I-04** Deploy script `script/DeployScript.s.sol` is empty — there's no reproducible deploy path; deployments documented only in trailing comments.

---

## Compound III integration assessment

**Verdict: structurally wrong.** The integration uses Comet correctly at the call level (`supply` / `withdraw` semantics, `balanceOf` returning present-value-in-underlying) but the **pro-rata-of-global-balance** accounting layered on top is not how Comet's per-supplier interest works.

Comet maintains a `baseSupplyIndex` that increases monotonically over time. A supplier's "presentValue" = `principal × (currentIndex / startIndex)`. The contract should track per-cycle `(principalAtSupply, supplyIndexAtSupply)`. The current design tries to allocate Comet's aggregate growth proportionally based on stale global principal — see C-02 for full breakdown.

Confirmations of correct behavior:
- `supply` and `withdraw` do auto-accrue (`accrueInternal`); explicit `accrueAccount` calls are not needed for `balanceOf` accuracy.
- `COMET.balanceOf(address(this))` returns the *aggregate* present-value supply across **all** cycles, not per-cycle — your accounting has to slice it up. The current slicing is broken (C-02).
- `baseMinForRewards` does not gate supply size — Comet allows arbitrarily small supplies, but reward accrual only kicks in past a threshold. With Compound III on Base, you'll want sufficient principal for COMP rewards to register.
- COMP rewards must be claimed via `CometRewards.claim(comet, src, true)` (M-02).

---

## ROSCA-specific assessment

A "good ROSCA" smart contract has to satisfy four invariants this contract violates today:

1. **Conservation of principal:** `Σ_member contributions == Σ_member receipts + Σ_member discounts received`. Violated by **C-01** (discount disappears).
2. **Forward progress:** No single party can stall a cycle past its deadline. Violated by **H-03** (creator-only) and **H-02** (VRF stuck).
3. **Predictable interest distribution:** Each cycle's interest = its principal × time-weighted yield, with no leakage to/from other cycles. Violated by **C-02 / C-04**.
4. **Fair winner selection:** Bid-based with secure random fallback. Mostly OK after the VRF fixes, but **C-03** (drainable VRF), **H-05** (unverified winner), and **M-07** (insecure preview) are open holes.

The reputation system is well-scoped (deposits, bids, wins increment a score) but doesn't penalize **defaults** — the contract has no concept of a member who fails to `payForCycle` after pre-committing. In a real ROSCA this is the dominant credit risk and the entire economics rest on enforcing it (typically via collateral or social slashing). Currently a member can join, never pay, never bid, and never lose anything.

**Recommended ROSCA hardening:**
- Require a **collateral deposit** at `joinPot` equal to `amountPerCycle` — slashed and added to the cycle pot if the member doesn't pay before bidding deadline.
- Track defaults in `MemberProfile` and decrement reputation by a large constant (e.g., −50).
- Enforce a minimum reputation floor on `joinPot` for any pot whose creator opts in.

---

## Recommended remediation priority

**Block release until done:**
1. Fix C-01 — distribute the auction discount. This is the protocol's reason to exist.
2. Fix C-02 / C-04 — replace pro-rata interest accounting with index-snapshot per cycle; delete `compoundInterest()`.
3. Fix C-03 — add `authorizedRequesters` to `LotteryEngine`.
4. Fix H-01 — enforce sequential cycles; key `hasPaidForCycle` on cycleId.
5. Fix H-02 — VRF timeout + cancel-and-refund path.
6. Fix H-03 — open creator-only functions to anyone after deadlines.
7. Fix H-05 — `require(hasJoinedPot[potId][winner])` in VRF callback.
8. Fix M-05 — multisig/timelock owner *before* mainnet.

**Strongly recommended in parallel:**
- Add the four ROSCA invariants as Foundry invariant tests (an `EscrowInvariantsTest.t.sol` exists — extend it).
- Add a fork test against Compound III on Base to validate index-snapshot interest math against ground truth.
- Implement collateral-on-join and default penalties (ROSCA hardening).

**Before audit-by-firm:**
- Strip deployment-address comments.
- Deduplicate USDC address sources; constructor-inject everywhere.
- Add a real `DeployScript.s.sol` so the audit firm can reproduce the topology.

---

**Bottom line.** The contract code is *structurally clean* (good OZ usage, modern Solidity, decent error model). Where it falls down is in the *economic mechanism* and the *Compound accounting* — both of which are the actual product. The two new criticals (C-01 and C-02) are show-stoppers and weren't surfaced in the prior audit reports. Fix the eight items above, add the invariant tests, then an external firm review should be cost-effective.
