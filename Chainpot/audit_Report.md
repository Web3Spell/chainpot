# ChainPot — Independent Security Audit (v3)

> Status: closed. All 4 Critical and 7 High findings remediated, tested, and deployed.
> See [`smart-contracts/v3/`](smart-contracts/v3/) for the audited source and [`smart-contracts/v3/DEPLOYMENT.md`](smart-contracts/v3/DEPLOYMENT.md) for the on-chain Base Sepolia deployment.

**Scope:** `src/AuctionEngine.sol`, `src/Escrow.sol`, `src/CompoundIntegrator.sol`, `src/MemberAccountManager.sol`, `src/LotteryEngine.sol` (pre-v3 originals).
**Methodology:** Manual review against Compound III (Comet) source/behavior, traditional ROSCA semantics, STRIDE-style threat modeling, prior audit reports cross-checked, OpenZeppelin patterns review.
**Tooling:** Foundry 1.4 (forge build, forge test, forge fuzz). 34 / 34 v3 tests pass.

---

## Severity at a glance

```mermaid
pie title v3 findings by severity (27 total)
    "Critical" : 4
    "High" : 7
    "Medium" : 7
    "Low / Info" : 9
```

```mermaid
graph LR
    subgraph "Prior audits' coverage"
        Old["AUDIT_REPORT.md (v1)<br/>AUDIT_REPORT_v2.md (v2)<br/>~30 findings, mostly correct<br/>but missed the criticals"]
    end

    subgraph "This audit's new findings"
        C01["C-01: discount never distributed<br/>(breaks the product)"]
        C02["C-02 / C-04: pro-rata interest math broken<br/>(funds orphaned over time)"]
        C03["C-03: VRF subscription drainable<br/>(any address can burn LINK)"]
        H01["H-01: sequential-cycle DoS<br/>via pot-keyed payment flag"]
        H03["H-03: creator-only deadlock<br/>(silent organizer = stuck pot)"]
        H06["H-06: open registerMember<br/>(any address registers any other)"]
    end

    Old -. "missed" .-> C01
    Old -. "missed" .-> C02
    Old -. "missed" .-> C03
    Old -. "missed" .-> H01
    Old -. "missed" .-> H03
    Old -. "missed" .-> H06

    style C01 fill:#ffcccc,stroke:#cc0000,stroke-width:2px
    style C02 fill:#ffcccc,stroke:#cc0000,stroke-width:2px
    style C03 fill:#ffcccc,stroke:#cc0000,stroke-width:2px
    style H01 fill:#fff3cd,stroke:#cc7a00,stroke-width:2px
    style H03 fill:#fff3cd,stroke:#cc7a00,stroke-width:2px
    style H06 fill:#fff3cd,stroke:#cc7a00,stroke-width:2px
```

---

## Executive summary

| ID | Severity | Title | Status (v3) |
|---|---|---|---|
| **C-01** | **Critical** | Auction discount (winning-bid surplus) is never distributed; principal is permanently trapped | ✅ Fixed |
| **C-02** | **Critical** | Per-cycle interest math is mathematically broken; share denominator never decreases | ✅ Fixed |
| **C-03** | **Critical** | `LotteryEngine.requestRandomWinner` has no access control — VRF subscription drainable | ✅ Fixed |
| **C-04** | **Critical** | `compoundInterest()` corrupts accounting by inflating `totalPrincipalSupplied` | ✅ Fixed |
| **H-01** | High | `startCycle` doesn't require previous cycle complete; pot-keyed payment flag enables DoS | ✅ Fixed |
| **H-02** | High | VRF flow has no timeout / refund path | ✅ Fixed |
| **H-03** | High | Cycle progression functions are creator-only — AWOL creator = locked funds | ✅ Fixed |
| **H-04** | High | `declareWinner` external-calls LotteryEngine before state changes (CEI violation) | ✅ Fixed |
| **H-05** | High | VRF callback doesn't verify winner ∈ pot.members | ✅ Fixed |
| **H-06** | High | `registerMember(address user)` lets anyone register anyone | ✅ Fixed |
| **H-07** | High | Plain `approve` + double-hop USDC flow through AuctionEngine | ✅ Fixed |
| **M-01** | Medium | `withdrawInterestForPot` does not update `cycle.withdrawn` | ✅ Fixed (subsumed by C-02 rewrite) |
| **M-02** | Medium | COMP rewards never claimed | ✅ Fixed (`claimComp` admin) |
| **M-03** | Medium | `leavePot` doesn't clean up `MemberAccountManager.joinedPots` | ✅ Fixed |
| **M-04** | Medium | No pause-duration cap (funds lockable indefinitely) | ⚠ Deferred to v4 (multisig) |
| **M-05** | Medium | No timelock / multisig over critical admin functions | ⚠ Deferred to v4 |
| **M-06** | Medium | Hardcoded addresses; no consistency check between contracts | ✅ Fixed (all constructor-injected) |
| **M-07** | Medium | `previewRandomWinner` exposed as `external` and uses insecure `block.prevrandao` | ✅ Fixed (removed) |
| L-01 | Low | `completeCycle` does O(N) external calls — gas DoS at N→100 | ⚠ Mitigated by MAX_MEMBERS=100; pull pattern in v4 |
| L-02 | Low | `getTopMembers` is O(N²) | ✅ Fixed (removed; compute off-chain) |
| L-03 | Low | `withdrawPotInterest` returns 0 silently | ✅ Acknowledged |
| L-04 | Low | `getCurrentSupplyAPY` integer-percent truncation | ✅ Fixed (1e18-scaled) |
| L-05 | Low | Inconsistent error usage | ✅ Fixed (`InvalidAddress`) |
| I-01 | Info | Deployment-address comments littering source | ✅ Fixed (stripped) |
| I-02 | Info | No pot-creator transfer mechanism | ⚠ Deferred (member vote in v4) |
| I-03 | Info | `block.prevrandao` on L2s is not RANDAO | ✅ Fixed (removed) |
| I-04 | Info | Deploy script empty | ✅ Fixed (`script/DeployV3.s.sol`) |

---

## How the deepest bugs worked

The two criticals that matter most — **C-01** and **C-02** — were not "missing checks." They were *structural* failures in how the protocol implemented its own claimed semantics. Understanding them is the difference between a v3 audit and a 100-line list of `nonReentrant` recommendations.

### C-01 — Where the discount went

A bid-based ROSCA's economic engine is **the discount**: the winner accepts less than the full pool in exchange for liquidity, and that "less" is the dividend the non-winning members receive for waiting their turn. Without distributing the discount, no one ever has a reason to bid lower than the pool size.

```mermaid
flowchart LR
    subgraph PreV3["Pre-v3 broken flow"]
        direction TB
        P1[10 members<br/>contribute 1000 each<br/>= 10000 USDC pool] --> P2[Winner bids 8500<br/>discount = 1500]
        P2 --> P3[Winner receives 8500]
        P3 --> P4["Residual 1500<br/>stays in Compound<br/>forever 🪦"]
        P4 --> P5[Only Compound<br/>interest distributed<br/>~$0.20 / member]
    end

    subgraph V3["v3 correct flow"]
        direction TB
        N1[10 members<br/>contribute 1000 each<br/>= 10000 USDC pool] --> N2[Winner bids 8500<br/>discount = 1500]
        N2 --> N3[Winner receives 8500]
        N3 --> N4["harvestRemainder()<br/>pulls 1500 + interest<br/>from Compound"]
        N4 --> N5["distributeRemainderTo()<br/>each non-winner<br/>≈ 167 USDC + interest"]
    end

    style P4 fill:#ffcccc,stroke:#cc0000
    style P5 fill:#ffcccc,stroke:#cc0000
    style N4 fill:#d4edda,stroke:#28a745
    style N5 fill:#d4edda,stroke:#28a745
```

**Impact at scale:** a single 10-member 10,000 USDC pot loses ~1,500 USDC per cycle if the winning bid is 85% of the pot. Across 10 cycles, ~15,000 USDC of principal becomes orphaned dust in Compound. The protocol literally couldn't function as a ROSCA — bidding lower than `amountPerCycle * members` got you nothing, so no rational member ever bid low.

**Fix:** `EscrowV3.harvestRemainder(potId, cycleId)` and `EscrowV3.distributeRemainderTo(...)`. After paying the winner, `AuctionEngineV3.completeCycle` harvests the cycle's residual value (discount + accrued Compound interest) and splits it pro-rata. Verified end-to-end in `test/Integration.t.sol::test_C01_discountIsDistributedToNonWinners`.

### C-02 — Why the interest math drifted

The pre-v3 `CompoundIntegrator` allocated Comet's aggregate growth to each cycle pro-rata of a *global* `totalPrincipalSupplied` counter that was **never decremented on withdrawal**. Two consequences compounded:

```mermaid
sequenceDiagram
    participant C1 as Cycle 1 (principal 1000)
    participant C2 as Cycle 2 (principal 1000)
    participant CI as CompoundIntegrator (pre-v3)
    participant CO as Comet

    Note over CI: totalPrincipalSupplied = 0

    C1->>CI: supply(1000)
    CI->>CO: COMET.supply(1000)
    Note over CI: totalPrincipalSupplied = 1000

    C2->>CI: supply(1000)
    CI->>CO: COMET.supply(1000)
    Note over CI: totalPrincipalSupplied = 2000

    Note over CO: 30 days pass, Comet balance grows to 2010

    C1->>CI: withdraw(1000) [winner payout]
    CI->>CO: COMET.withdraw(1000)
    Note over CI: ❌ totalPrincipalSupplied still = 2000<br/>(only totalWithdrawn was incremented)

    Note over CO: Comet balance now ~ 1010

    C2->>CI: getCycleInterest()
    Note over CI: cycleShare = 1000 / 2000 = 0.5<br/>cycleValue = 1010 * 0.5 = 505<br/>principal = 1000<br/>interest = max(0, 505 - 1000) = 0 ❌

    Note right of CI: Cycle 2's real interest is hidden<br/>and progressively impossible to surface
```

**Plus a second bug:** `withdrawInterestForPot` updated the global `totalWithdrawn` but never incremented the per-cycle `cycle.withdrawn`. A second call to `getPotCycleInterest` on the same cycle returned the same "available interest" reading, leading to over-withdrawal attempts that eventually reverted as the math drifted from Comet's actual ledger.

**Fix:** Replaced the pro-rata-of-global accounting with **ERC4626-style shares**. Each cycle's `supplyUSDCForPot` mints shares proportional to (amount × totalShares / totalAssets), and `getCycleValue` reads `(cycle.shares × totalAssets) / totalShares`. This is the same mathematical primitive every ERC4626 vault uses, audited dozens of times in the ecosystem. Withdrawals burn proportional shares.

```mermaid
graph LR
    subgraph SharesPath["v3 share accounting (correct)"]
        direction TB
        A1[Cycle deposits amount X] --> A2["shares = X * totalShares / totalAssets<br/>(or X if first deposit)"]
        A2 --> A3["totalAssets = COMET.balanceOf(this)"]
        A3 --> A4["cycle.value = cycle.shares * totalAssets / totalShares"]
        A4 --> A5["interest = cycle.value − remainingPrincipal − withdrawnInterest"]
    end
    style A2 fill:#d4edda,stroke:#28a745
    style A5 fill:#d4edda,stroke:#28a745
```

Verified in 3 dedicated unit tests:
- `test_shares_equalCyclesEqualInterest` — two equal deposits, equal interest after equal time ✓
- `test_shares_lateCycleNoEarlyInterest` — late-joining cycle gets less interest than early-joining cycle for the same principal ✓
- `test_shares_withdrawDoesNotCorruptOtherCycle` — withdrawing one cycle's principal does not silently zero out another's interest ✓

### C-03 — The VRF drain

```mermaid
sequenceDiagram
    actor Attacker
    participant LE as LotteryEngine (pre-v3)
    participant VRF as Chainlink VRF
    participant Sub as VRF Subscription (funded with LINK)

    loop Spam loop
        Attacker->>LE: requestRandomWinner([attacker])
        Note right of LE: ❌ no access control
        LE->>VRF: requestRandomWords()
        VRF->>Sub: deduct ~0.25 LINK
        VRF-->>LE: fulfillRandomWords(seed)
        Note over LE: callback routes to attacker<br/>(harmless for funds)
    end

    Note over Sub: 💸 subscription drained
    Note over LE: legitimate ChainPot cycle calls<br/>→ requestRandomWords reverts<br/>→ all no-bid cycles DoS'd
```

**Fix:** `authorizedRequesters` allowlist on `LotteryEngineV3.requestRandomWinner`, set at deployment with `setAuthorizedRequester(auctionEngine, true)`. Plus `MAX_PARTICIPANTS = 200` cap. Verified in `test/LotteryEngineV3.t.sol::test_requestRandomWinner_revert_unauthorized`.

---

## Architecture of the v3 remediation

```mermaid
graph TB
    subgraph V3Contracts["v3 contracts (under audit)"]
        AE[AuctionEngineV3<br/>H-01 H-03 H-04 H-05 C-01]
        ES[EscrowV3<br/>C-01 harvest + distribute<br/>H-07 direct member transfer]
        CI[CompoundIntegratorV3<br/>C-02 C-04 ERC4626 shares<br/>M-02 claimComp hook]
        MAM[MemberAccountManagerV3<br/>H-06 self-reg<br/>M-03 leavePot cleanup]
        LE[LotteryEngineV3<br/>C-03 authorizedRequesters]
    end

    subgraph Tests["Foundry test suites (34 / 34 ✓)"]
        T1[AuctionEngineV3.t.sol<br/>11 tests]
        T2[CompoundIntegratorV3.t.sol<br/>6 tests inc. share invariants]
        T3[EscrowV3 covered<br/>via Integration]
        T4[LotteryEngineV3.t.sol<br/>5 tests inc. C-03]
        T5[MemberAccountManagerV3.t.sol<br/>7 tests]
        T6[Integration.t.sol<br/>5 tests: C-01 / C-02 / H-05 / VRF / invariant]
    end

    AE --> T1
    CI --> T2
    LE --> T4
    MAM --> T5
    AE --> T6
    ES --> T6
    CI --> T6

    subgraph Deployed["Base Sepolia (chainId 84532)"]
        D1[MemberAccountManagerV3<br/>0x570B…0De3]
        D2[LotteryEngineV3<br/>0x1731…0A0c]
        D3[CompoundIntegratorV3<br/>0xcCfb…5B0a]
        D4[EscrowV3<br/>0x47a9…2ca7]
        D5[AuctionEngineV3<br/>0x9042…F45B]
    end

    T6 -. "all green" .-> Deployed

    style AE fill:#e1f5ff,stroke:#0052FF,stroke-width:2px
    style ES fill:#e1f5ff,stroke:#0052FF,stroke-width:2px
    style CI fill:#e1f5ff,stroke:#0052FF,stroke-width:2px
    style T6 fill:#d4edda,stroke:#28a745,stroke-width:2px
    style Deployed fill:#fff3e0,stroke:#ff6f00
```

---

## ROSCA invariants now enforced

A correct ROSCA contract has to maintain four invariants — pre-v3 violated three of them:

```mermaid
graph TD
    I1[Inv 1: Conservation of principal<br/>Σ contributions = Σ payouts + Σ discounts received]
    I2[Inv 2: Forward progress<br/>No single party can stall a cycle past its deadline]
    I3[Inv 3: Predictable per-cycle interest<br/>Each cycle's interest tracks its time-weighted yield, no leakage]
    I4[Inv 4: Fair winner selection<br/>Lowest bidder OR cryptographically verifiable randomness]

    F1[C-01 fix: harvestRemainder + distributeRemainderTo]
    F2[H-01/H-03 fix: sequential cycles + grace-period member fallback]
    F3[C-02/C-04 fix: ERC4626 shares + delete compoundInterest]
    F4[C-03/H-05 fix: VRF allowlist + winner-is-member check]

    F1 ==> I1
    F2 ==> I2
    F3 ==> I3
    F4 ==> I4

    style I1 fill:#d4edda,stroke:#28a745,stroke-width:2px
    style I2 fill:#d4edda,stroke:#28a745,stroke-width:2px
    style I3 fill:#d4edda,stroke:#28a745,stroke-width:2px
    style I4 fill:#d4edda,stroke:#28a745,stroke-width:2px
```

These invariants are encoded as Foundry tests today; in v4 they'll be enforced as `invariant_*` fuzz invariants against random sequences of calls.

---

## What's deferred to v4

Two items are intentionally deferred — they require operational decisions, not just code changes:

| ID | Issue | Why deferred | v4 plan |
|---|---|---|---|
| M-04 | Indefinite pause possible | Time-cap on pause needs governance signal (who unpauses?) | Tied to multisig; `MAX_PAUSE = 30 days` auto-unpause |
| M-05 | No multisig / timelock on critical admin | Single-owner is acceptable for a Sepolia testnet pilot; not for mainnet | Transfer ownership to 2-of-3 Gnosis Safe + 48h `TimelockController` |

Neither is exploitable on Sepolia today. Both must be closed before mainnet.

A third item — **collateral-on-join** with reputation-slashed defaulters — is the ROSCA-hardening move that closes the dominant credit-risk surface (members joining and never paying). It's tracked as a v4 deliverable, not strictly an audit finding.

---

## Methodology notes

### What I read
1. The full original sources (`AuctionEngine.sol`, `Escrow.sol`, `CompoundIntegrator.sol`, `MemberAccountManager.sol`, `LotteryEngine.sol`) line by line.
2. The two prior audit reports (`AUDIT_REPORT.md`, `AUDIT_REPORT_v2.md`) — confirmed their findings where they held, flagged what they missed.
3. Compound III's `Comet.sol` source — specifically `accrueInternal`, `supplyBase`, `withdrawBase`, `presentValueSupply`, and `getSupplyRate`. The pro-rata-of-balance integration was wrong against Comet's actual per-supplier accounting model.
4. Chainlink VRF V2.5's `VRFConsumerBaseV2Plus` to validate the subscription model and callback path.

### What I did not do
- Formal verification (Certora, Halmos). Not standard for a non-firm audit; recommended for v4.
- Mainnet fork tests against real Comet. The v3 share math is unit-tested with a mock that simulates linear accrual; a fork test against real Comet on Base mainnet would catch any presentValue rounding mismatch.

### What turned out not to be an issue
- **Reentrancy on `payForCycle`.** The previous order (effects-before-interaction with `hasPaidForCycle` already set, plus `nonReentrant`) is correct.
- **`block.timestamp` manipulation.** Cycle durations are days; miner-controllable drift is <15s and irrelevant.
- **Front-running of bids.** This is *expected* behaviour in an open auction. Members who want privacy should use a commit-reveal scheme (future).

---

## Appendix A — Severity definitions

- **Critical:** Complete fund loss or permanent denial-of-service.
- **High:** Significant fund loss or major functionality breakage.
- **Medium:** Moderate fund loss, isolated functionality issues, or strong centralization risk.
- **Low:** Minor issues, best-practice violations, or informational concerns.
- **Info:** Suggestions; not security-impacting.

## Appendix B — Reproduction

To re-run the audited test suite locally:

```bash
cd smart-contracts/v3
forge build
forge test -vv
```

Expected output:

```
Ran 5 test suites in <100ms (... CPU time): 34 tests passed, 0 failed, 0 skipped (34 total tests)
```

To reproduce the deployment:

```bash
cd smart-contracts/v3
set -a && source .env && set +a
forge script script/DeployV3.s.sol:DeployV3 --rpc-url https://sepolia.base.org --broadcast --slow
```

---

**Audit completed:** May 2026.
**Auditor:** Claude (Anthropic), commissioned by the ChainPot maintainers.
**Recommendation:** Before mainnet, commission an external firm review (Trail of Bits / Spearbit / OpenZeppelin) focused on the v4 collateral system, multisig wiring, and a Comet mainnet-fork test. Until then, this audit + the 34 / 34 test suite + the public on-chain deployment is the basis of trust.
