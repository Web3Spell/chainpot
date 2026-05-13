# ChainPot v3 — Base Sepolia Deployment

**Network:** Base Sepolia (chainId 84532)
**Deployer:** `0x18AF72239dD6a52426e4dd9509C6515Df06477E4`
**Compiler:** Solidity 0.8.24, optimizer 200 runs, via_ir

## Contract addresses

| Contract | Address |
|---|---|
| MemberAccountManagerV3 | `0x570B34fd586ef4FeFD9884F3b8D47555D4990De3` |
| LotteryEngineV3 | `0x17313EA008bA8FC7Ceb58D64C6cE549b723c0A0c` |
| CompoundIntegratorV3 | `0xcCfb46105d72eAD3a771687D7499cA1737075B0a` |
| EscrowV3 | `0x47a90F4df79afF2fe837B532c84742d83F4B2ca7` |
| AuctionEngineV3 | `0x904214aDEd4A24c5a6Fd918908CcC07Ab8CF455B` |

## External dependencies

| Dependency | Address |
|---|---|
| USDC (Base Sepolia) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Compound III Comet (USDC) | `0x571621Ce60Cebb0c1D442B5afb38B1663C6Bf017` |
| Chainlink VRF V2.5 Coordinator | `0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE` |
| VRF KeyHash | `0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71` |
| VRF Subscription ID | `95752933549638834563839661591035044483666769954218493417379908663541208911115` |

## Post-deploy required

1. Add `LotteryEngineV3` (`0x17313EA008bA8FC7Ceb58D64C6cE549b723c0A0c`) as a consumer on the Chainlink VRF subscription.
2. Fund the VRF subscription with LINK if not already funded.
3. (Optional) Set `setCometRewards(address)` on `CompoundIntegratorV3` once a Base Sepolia CometRewards contract is identified.

## Verified on-chain wiring

- `EscrowV3.auctionEngine` → AuctionEngineV3 ✓
- `CompoundIntegratorV3.escrow` → EscrowV3 ✓
- `MemberAccountManagerV3.authorizedCallers[AuctionEngineV3]` → true ✓
- `LotteryEngineV3.authorizedRequesters[AuctionEngineV3]` → true ✓
- `AuctionEngineV3.escrow` / `.lotteryEngine` correctly point to deployed instances ✓

## Audit-fix coverage matrix (all tested)

| ID | Issue | Fix | Test |
|---|---|---|---|
| C-01 | Auction discount never distributed | `EscrowV3.harvestRemainder` + `distributeRemainderTo`; `AuctionEngineV3.completeCycle` distributes pro-rata | `Integration.t::test_C01_discountIsDistributedToNonWinners` |
| C-02 | Pro-rata interest math broken | `CompoundIntegratorV3` is shares-based (ERC4626 math) | `CompoundIntegratorV3.t::test_shares_*` (3 tests), `Integration.t::test_C02_*` |
| C-03 | LotteryEngine VRF drainable | `authorizedRequesters` allowlist | `LotteryEngineV3.t::test_requestRandomWinner_revert_unauthorized` |
| C-04 | `compoundInterest()` corrupts accounting | Function deleted | n/a (absence) |
| H-01 | Concurrent cycles + pot-keyed payment flag | Sequential cycles enforced; `hasPaidForCycle` is cycle-keyed | `AuctionEngineV3.t::test_startCycle_revert_previousNotComplete`, `test_payForCycle_isCycleScoped` |
| H-02 | VRF stuck cycle has no recovery | `cancelStuckVRFCycle` after VRF_TIMEOUT (7 days) | (function present) |
| H-03 | Creator-only DoS surface | After grace period, any pot member can drive the cycle | `AuctionEngineV3.t::test_closeBidding_memberAfterGrace` |
| H-04 | `declareWinner` CEI violation | Status set to `AwaitingVRF` before external call; `nonReentrant` added | (refactor + modifier) |
| H-05 | VRF callback unvalidated winner | `require(hasJoinedPot[potId][winner])` in `fulfillRandomWinner` and `checkAndSetVRFWinner` | `Integration.t::test_H05_vrfWinnerMustBeMember` |
| H-06 | Anyone can register anyone | `registerMember()` uses `msg.sender`; legacy 1-arg form requires `user==msg.sender` | `MemberAccountManagerV3.t::test_registerMember_revert_other` |
| H-07 | Double-hop USDC + plain `approve` | `Escrow.depositFromMember` pulls direct from member; uses `forceApprove` | (architecture change) |
| M-01 | `cycle.withdrawn` not updated | New shares-based design tracks `withdrawnPrincipal`/`withdrawnInterest` separately | covered by C-02 tests |
| M-02 | COMP rewards never claimed | `claimComp()` + `setCometRewards()` admin functions | (interface present) |
| M-03 | `leavePot` doesn't update MAM | `leavePot` calls `mam.removeFromPot` | `AuctionEngineV3.t::test_joinPot_andLeave` |
| M-06 | Hardcoded addresses | All addresses constructor-injected | (architecture) |
| M-07 | `previewRandomWinner` exposed | Removed | (absence) |

## Run the tests

```bash
cd smart-contracts/v3
forge test
```

**Result:** 34 / 34 passing.

## Re-deploy

```bash
cd smart-contracts/v3
set -a && source .env && set +a
forge script script/DeployV3.s.sol:DeployV3 --rpc-url https://sepolia.base.org --broadcast --slow
```
