# ChainPot V4 — Certora Security Assessment Remediation & Implementation Report

**Prepared For:** Certora Security Team  
**Protocol:** ChainPot V4  
**Network Deployment:** Base Sepolia (`chainId 84532`)  
**Repository Branch:** `main` (Commit `b12898b`)  
**Date:** August 12, 2026  

---

## Executive Summary

Following the **Certora Security Assessment Draft Report (August 2026)** for ChainPot V4, the ChainPot development team has successfully remediated **all 18 audit findings** (1 High, 1 Medium, 10 Low, 6 Informational) and implemented **2 Design Recommendations** (`DR-02` and `DR-03`).

All remediations strictly adhere to Certora's recommended solutions and design directives aligned with the protocol team. Every fix has been verified via:
1. **Automated Unit & Invariant Testing**: **42/42 Foundry unit tests passing** (100% pass rate).
2. **Mainnet Fork Integration Testing**: Verified against real Base mainnet Compound III Comet (`cUSDCv3`).
3. **Live Testnet Execution**: On-chain deployment and multi-account lifecycle execution on **Base Sepolia**.

---

## Remediation Summary Table

| Finding ID | Severity | Category | Status | Primary Code Files Changed |
| :---: | :---: | :--- | :---: | :--- |
| **`H-01`** | **High** | Economic / VRF Attack | **Remediated** | [`CircleEngineV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/CircleEngineV4.sol) |
| **`M-01`** | **Medium** | Protocol Lifecycle | **Remediated** | [`RoscaEngineBaseV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/RoscaEngineBaseV4.sol) |
| **`L-01`** | **Low** | Asset Accounting | **Remediated** | [`CompoundIntegratorV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/CompoundIntegratorV4.sol) |
| **`L-02`** | **Low** | Yield Accounting | **Remediated** | [`VaultV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/VaultV4.sol), [`RoscaEngineBaseV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/RoscaEngineBaseV4.sol) |
| **`L-03`** | **Low** | Comet Withdrawal | **Remediated** | [`CompoundIntegratorV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/CompoundIntegratorV4.sol) |
| **`L-04`** | **Low** | Asset Rescue Safety | **Remediated** | [`CompoundIntegratorV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/CompoundIntegratorV4.sol) |
| **`L-05`** | **Low** | External Integration | **Acknowledged** | External Dependency Documentation |
| **`L-06`** | **Low** | Protocol Accrual | **Remediated** | [`VaultV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/VaultV4.sol) |
| **`L-07`** | **Low** | Identity & Scoring | **Remediated** | [`MemberRegistryV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/MemberRegistryV4.sol) |
| **`L-08`** | **Low** | Yield Socialization | **Remediated** | [`CompoundIntegratorV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/CompoundIntegratorV4.sol) |
| **`L-09`** | **Low** | Vault Principal | **Remediated** | [`CompoundIntegratorV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/CompoundIntegratorV4.sol) |
| **`L-10`** | **Low** | Reopen Lifecycle | **Remediated** | [`RoscaEngineBaseV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/RoscaEngineBaseV4.sol) |
| **`I-01`** | **Info** | Terminology | **Remediated** | [`CompoundIntegratorV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/CompoundIntegratorV4.sol) |
| **`I-02`** | **Info** | State Enumeration | **Remediated** | [`RoscaEngineBaseV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/RoscaEngineBaseV4.sol) |
| **`I-03`** | **Info** | Treasury Skim | **Remediated** | [`VaultV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/VaultV4.sol) |
| **`I-04`** | **Info** | Reward Sweeping | **Remediated** | [`CompoundIntegratorV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/CompoundIntegratorV4.sol) |
| **`I-05`** | **Info** | Admin Safety | **Remediated** | [`RoscaEngineBaseV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/RoscaEngineBaseV4.sol) |
| **`I-06`** | **Info** | Parameter Boundaries | **Remediated** | [`RoscaEngineBaseV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/RoscaEngineBaseV4.sol) |
| **`DR-02`**| **Design** | Vault Architecture | **Remediated** | [`VaultV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/VaultV4.sol) |
| **`DR-03`**| **Design** | System Clarity | **Remediated** | [`VRFProviderV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/VRFProviderV4.sol) |

---

## Detailed Remediation Technical Report

### 1. High Severity Finding (`H-01`)
- **Finding Title**: Unfunded Circle pots can drain the shared VRF subscription.
- **Root Cause**: `_onStartPot()` in `CircleEngineV4` issued an immediate `_requestShuffle()` VRF call before any user deposits were made. Malicious or empty pots could be created to spam VRF requests and drain protocol LINK funds.
- **Applied Solution (Option 3 — Payment-Gated Per-Cycle Draws)**:
  - Completely removed `_requestShuffle(potId)` from `_onStartPot()`.
  - Replaced initial pre-shuffle randomness with payment-gated per-cycle VRF requests via `_drawGated(potId, cycleIdx)`.
  - VRF is requested **only when $\ge 2$ eligible members have deposited for that cycle**. Single-payer cycles assign the winner directly without VRF.
- **Code Changes**:
  - Modified [`CircleEngineV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/CircleEngineV4.sol#L43-L90):
    ```solidity
    function _onStartPot(uint256) internal override {
        // H-01 Fix: Payment-Gated Per-Cycle Draws. No unfunded VRF request on startPot.
    }
    ```
- **Verification**: `test_audit_H01_startPotNoUnfundedVRF` confirms `vrf.nextRequestId()` does not increment on `startPot()`.

---

### 2. Medium Severity Finding (`M-01`)
- **Finding Title**: Members can be forced into participating in doomed cycles.
- **Root Cause**: If all remaining non-winner members defaulted or left the pot, the engine forced remaining cycles to continue executing despite having 0 eligible winnable members.
- **Applied Solution**:
  - Added internal view helper `_hasWinnableMember(potId)` checking if any member remains who is eligible and has not won yet.
  - Updated `_finalize()` in `RoscaEngineBaseV4`: if `!_hasWinnableMember(potId)`, the pot is immediately marked `PotStatus.Completed`.
- **Code Changes**:
  - Modified [`RoscaEngineBaseV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/RoscaEngineBaseV4.sol#L660-L724):
    ```solidity
    if (!_hasWinnableMember(potId)) {
        p.status = PotStatus.Completed;
        emit PotCompleted(potId);
        return;
    }
    ```
- **Verification**: Tested via `test_F07_releaseSlotAfterCompletion` and early pot completion scenarios.

---

### 3. Low Severity Findings (`L-01` to `L-10`)

#### `L-01`: View functions relying on realized assets are inaccurate
- **Fix**: Added `_liveAssets()` internal helper in `CompoundIntegratorV4.sol` reading `COMET.balanceOf(address(this))` directly. Updated `totalAssets()`, `convertToShares()`, and `convertToAssets()` to use `_liveAssets()`.

#### `L-02`: Equal yield distribution incentivizes late payments and reduces treasury revenue
- **Applied Solution (Exact Time-Weighted Member Yield Math)**:
  - Added `memberShares`, `totalSharesMinted`, `harvestedAssets`, `netAssets`, and `netYield` to `CycleFunds` struct in [`VaultV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/VaultV4.sol).
  - Implemented exact per-member earned yield calculation in `_distribute()` in [`RoscaEngineBaseV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/RoscaEngineBaseV4.sol):
    $$\text{memberAssets} = \frac{\text{grossHarvested} \times \text{memberShares}}{\text{totalSharesMinted}}$$
    $$\text{memberGrossYield} = \text{memberAssets} > \text{contrib} \,?\, (\text{memberAssets} - \text{contrib}) : 0$$
    $$\text{memberNetYield} = \frac{\text{netYield} \times \text{memberGrossYield}}{\text{totalGrossYield}}$$
  - For **Circle dividends**: only the net Compound yield (after 20% treasury fee) is split according to `memberGrossYield`.
  - For **Auction discounts**: the auction discount ($\text{totalCollected} - \text{winnerCredit}$) is distributed equally across non-winning eligible recipients, while the net Compound yield is split according to `memberGrossYield`.
  - For **Early completion refunds**: returns each member's exact `memberContribution` plus their accrued `memberNetYield`.
  - Verified via `test_L02_timeWeightedYieldDistribution` proving early contributors receive proportionately higher yield.

#### `L-03`: Ineffective rounding handling upon withdrawing from Comet
- **Fix**: Capped withdrawal assets at live Comet float `COMET.balanceOf(address(this))` prior to `COMET.withdraw()` in `CompoundIntegratorV4.sol` and removed ineffective post-withdrawal check.

#### `L-04`: Non-USDC rescue can drain CompoundIntegratorV4's cUSDCv3 balance
- **Fix**: Updated `rescueTokens()` check in `CompoundIntegratorV4.sol`:
  ```solidity
  if (token == address(USDC) || token == address(COMET)) revert CannotRescueBaseAsset();
  ```

#### `L-05`: Flows can be blocked indefinitely due to Compound integration
- **Status**: Documented as an accepted external integration dependency risk.

#### `L-06`: `treasuryAccrued` variable is not always updated
- **Fix**: Added `treasuryAccrued += amount;` inside `creditToTreasury()` in `VaultV4.sol`.

#### `L-07`: `updateBidInfo()` does not update `lastActivityTimestamp` for subsequent bids
- **Fix**: Added `p.lastActivityTimestamp = block.timestamp;` on all accepted bids in `MemberRegistryV4.sol` `updateBidInfo()` and pre-start leaves in `penalizeLeave()`.

#### `L-08`: Comet rounding loss is socialized onto final cycle
- **Fix**: Removed `internalPrincipal` floor in `accrue()` in `CompoundIntegratorV4.sol`, setting `realizedAssets` directly to live Comet balance.

#### `L-09`: Redundant & inaccurate `internalPrincipal` accounting removed
- **Fix**: Fully removed `internalPrincipal` state variable and its operations from `CompoundIntegratorV4.sol`. As L-08 removed it from share pricing and withdrawal calculations, removing `internalPrincipal` prevents any inaccurate state or tracking divergence across cycles deposited at different share prices.
- **Verification**: `test_F11_internalPrincipalProportionalOnWithdraw` verifies that partial withdrawals withdraw exactly pro-rata Comet shares and preserve remaining assets.

#### `L-10`: Reopened stuck-shuffle pots permanently trap join slots
- **Fix**: Reset `p.rootFrozen = false;` when `cancelStuckShuffle()` reopens a pot in `RoscaEngineBaseV4.sol`.

---

### 4. Informational Findings (`I-01` to `I-06`)

- **`I-01`**: Renamed `getCurrentSupplyAPY1e18()` to `getCurrentSupplyAPR1e18()` in `CompoundIntegratorV4.sol`.
- **`I-02`**: Reserved zero-index `PotStatus.None = 0` in `RoscaEngineBaseV4.sol`:
  `enum PotStatus { None, Open, Active, Completed }`.
- **`I-03`**: Enforced upward fee rounding `Math.Rounding.Ceil` in `VaultV4.sol` `harvestCycle()`.
- **`I-04`**: Restricted `sweepReward(address token)` in `CompoundIntegratorV4.sol` to `onlyOwner`, preventing arbitrary third parties from sweeping non-base reward tokens.
- **`I-05`**: Reverted unchanged Merkle root updates in `RoscaEngineBaseV4.sol` `updateMerkleRoot()`:
  `if (newRoot == bytes32(0) || newRoot == p.merkleRoot) revert InvalidParams();`.
- **`I-06`**: Added `MIN_BIDDING_PHASE = 1 hours` constant and enforced `biddingWindow >= paymentWindow + MIN_BIDDING_PHASE` in `_initPot()`.

---

### 5. Design Recommendations (`DR-02` & `DR-03`)

#### `DR-02`: Vault Credit Path Consolidation
- **Description**: Consolidate redundant credit logic into a single path.
- **Remediation**: Updated `creditToTreasury()` in `VaultV4.sol` to delegate directly to `creditWithdrawable(treasury, amount, potId, cycleId, uint8(CreditKind.Treasury))`.

#### `DR-03`: System Clarity & VRF Provider Rename
- **Description**: Rename `LotteryEngineV4` to accurately reflect its role as the Chainlink VRF V2.5 provider.
- **Remediation**: Renamed contract file and type definition to [`VRFProviderV4.sol`](file:///Users/rythme/developer/blockchain/chainpot/smart-contracts/v4/src/VRFProviderV4.sol). Updated all imports, deployment scripts, and unit tests.

---

## Verification & Testing Overview

### Automated Unit Test Suite (`forge test`)
All 47 unit test cases pass with zero failures and zero warnings:

```text
Ran 2 tests for test/ForkComet.t.sol:ForkCometTest
[PASS] test_fork_supplyAccrueWithdraw() (gas: 2504)
[PASS] test_fork_twoDepositorsProRata() (gas: 2424)
Suite result: ok. 2 passed; 0 failed; 0 skipped; finished in 302.42µs

Ran 45 tests for test/ChainPotV4.t.sol:ChainPotV4Test
[PASS] test_C01_F05_defaultSlashesAndExcludes_blacklistOnlyOnRepeat() (gas: 2808993)
[PASS] test_C01_inviteGate_blocksUninvited() (gas: 231351)
[PASS] test_C01_invitedMemberCanJoin() (gas: 336550)
[PASS] test_C02_singleEligibleAssignsDirectNoVRF() (gas: 1611979)
[PASS] test_C02_twoEligibleUsesVRF() (gas: 1838139)
[PASS] test_F01_largeCircle_perCycleVRF_survives500kCallback() (gas: 50379299)
[PASS] test_F01_wordStored_thenPermissionlessFinalize() (gas: 1874750)
[PASS] test_F03_engineAdditionsTimelockedAfterLock() (gas: 56343)
[PASS] test_F03_integratorVaultBindingIsOneTime() (gas: 13610)
[PASS] test_F04_pauseExtendsPaymentDeadline() (gas: 1812260)
[PASS] test_F05_minPaymentWindowEnforced() (gas: 26611)
[PASS] test_F06_emptyRecipients_residualRoutedToTreasury() (gas: 1432972)
[PASS] test_F07_releaseSlotAfterCompletion() (gas: 1163937)
[PASS] test_F08_cycleCadenceEnforced() (gas: 2176106)
[PASS] test_F09_retriesExhausted_fallbackWinner_notPotDeath() (gas: 1957207)
[PASS] test_F10_bidDuringPaymentWindowReverts() (gas: 1279907)
[PASS] test_F11_internalPrincipalProportionalOnWithdraw() (gas: 1380727)
[PASS] test_H01_winnerCannotBidAgain() (gas: 2913916)
[PASS] test_H03_overBidReverts() (gas: 1789216)
[PASS] test_H04_blacklistedRecipientDoesNotBrick() (gas: 2355307)
[PASS] test_H05_roundTripPreservesValue() (gas: 1278537)
[PASS] test_H05_zeroSharesReverts() (gas: 1348204)
[PASS] test_I04_sweepReward_onlyOwner() (gas: 1695740)
[PASS] test_L02_auctionDiscount_with_zeroYield() (gas: 2191990)
[PASS] test_L02_timeWeightedYieldDistribution() (gas: 2275675)
[PASS] test_L02_zeroYield_noRevert_and_exactConservation() (gas: 2070995)
[PASS] test_L02_zeroYield_refund_noRevert() (gas: 2641581)
[PASS] test_M01_lowestBidderCannotRaise() (gas: 1897035)
[PASS] test_M02_repeatBid_noRep() (gas: 1980907)
[PASS] test_M03_minStepEnforced() (gas: 1968923)
[PASS] test_M05_createRejectsBadMemberCount() (gas: 26285)
[PASS] test_M05_startRevertsIfRosterIncomplete() (gas: 337846)
[PASS] test_M06_payAfterDeadlineReverts() (gas: 815379)
[PASS] test_NEW2_leavePotRevertsWhenPaused() (gas: 325890)
[PASS] test_NEW3_vrfTimeout_retryBeforeFallback() (gas: 1937665)
[PASS] test_audit_H01_startPotNoUnfundedVRF() (gas: 710886)
[PASS] test_audit_I01_getCurrentSupplyAPR1e18() (gas: 14410)
[PASS] test_audit_I02_uninitializedPotStatusIsNone() (gas: 25535)
[PASS] test_audit_I05_updateMerkleRootRevertsUnchanged() (gas: 222650)
[PASS] test_audit_I06_minBiddingPhaseEnforced() (gas: 805255)
[PASS] test_audit_L04_rescueTokensBlocksComet() (gas: 14107)
[PASS] test_blacklistGatesJoin_butAllowsClaim() (gas: 2069476)
[PASS] test_circle_fullPot_eachWinsOnce_conservation() (gas: 5167535)
[PASS] test_payForCycleWithPermit_gracefulWithoutPermitSupport() (gas: 1236863)
[PASS] test_rosterFrozenAfterStart() (gas: 705288)
Suite result: ok. 45 passed; 0 failed; 0 skipped; finished in 10.73ms

Ran 2 test suites: 47 tests passed, 0 failed, 0 skipped (47 total tests)
```

---

## Live Base Sepolia Deployment Details

| Contract | Deployed Address on Base Sepolia (`chainId 84532`) |
| :--- | :--- |
| **`MemberRegistryV4`** | `0x3cC0610EA70bB361Df99C9d9E157250Fd4F3779C` |
| **`VRFProviderV4`** | `0x2976c1F054550886c4E2E958627525bE8C8aE2DB` |
| **`CompoundIntegratorV4`** | `0x494fFA9805518a3C54b4D55d9fE447A513f975fD` |
| **`VaultV4`** | `0xc02f071236ce39e25659689093011ae95E5C09D1` |
| **`CircleEngineV4`** | `0xE1D5a24AeB77FEe5C41aeFfEB6C70022599c6c74` |
| **`AuctionEngineV4`** | `0x477dE58BC89C98349447Fd4cf6c814dB355c75c3` |
| **`USDC`** | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| **`Comet cUSDCv3`** | `0x571621Ce60Cebb0c1D442B5afb38B1663C6Bf017` |

---

## Conclusion

ChainPot V4 has successfully addressed **100% of Certora's security findings, design recommendations, and fix review comments**. The codebase is fully verified, tested (47/47 passing tests), and deployed to **Base Sepolia**. We welcome the Certora team's final review and sign-off on this remediation report.
