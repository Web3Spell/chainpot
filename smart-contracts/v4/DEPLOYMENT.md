# ChainPot V4 — Base Sepolia Deployment

**Network:** Base Sepolia (chainId 84532)
**Deployer:** `0x18AF72239dD6a52426e4dd9509C6515Df06477E4`
**Compiler:** Solidity 0.8.24, optimizer 200 runs, via_ir
**Model:** Invite-only ROSCA, trusted roster, **zero collateral** (per `CHAINPOT_V4_PLAN.md`).

## Contract addresses

| Contract | Address |
|---|---|
| MemberRegistryV4 | `0x00e425C915915Ba5b6b196B65E27850E0081b2Ec` |
| LotteryEngineV4 | `0x3574f6a5AB7ce7edD3f8418f3F845F796acBF42b` |
| CompoundIntegratorV4 | `0xCBD0fe917137cccDc99F3d2bcc6129652587EBB4` |
| VaultV4 | `0x0d2e89eCA81bCCC340A5027882F6270B40BacE70` |
| CircleEngineV4 (Program A) | `0xF8F5607A26680514d297FaBcccD89082f7077293` |
| AuctionEngineV4 (Program B) | `0x10D9ED941AECf14a80AF633610202948e1cf5E11` |

## External dependencies

| Dependency | Address |
|---|---|
| USDC (Base Sepolia) | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Compound III Comet (USDC) | `0x571621Ce60Cebb0c1D442B5afb38B1663C6Bf017` |
| Chainlink VRF V2.5 Coordinator | `0x5C210eF41CD1a72de73bF76eC39637bB0d3d7BEE` |
| VRF KeyHash | `0x9e1344a1247c8a1785d0a4681a27152bffdb43666ae5bf7d14d24a5efd44bf71` |
| VRF Subscription ID | `95752933549638834563839661591035044483666769954218493417379908663541208911115` |

## Source verification

All six contracts are **source-verified on Sourcify** for chain 84532 (status `match`):
`https://sourcify.dev/server/v2/contract/84532/<address>` returns 200 for each, and they are
viewable on Basescan (which reads Sourcify). Basescan's own API verification was skipped because no
`BASESCAN_API_KEY` is set in `.env`; add one and re-run `forge verify-contract ... --etherscan-api-key
$BASESCAN_API_KEY --chain base-sepolia` for a native Basescan match.

> Verification note: Sourcify compiles the embedded standard-JSON, which requires the `foundry.toml`
> remappings to be in their **relative** `../lib/...` form (so the source keys and remap targets
> agree). Switch them to relative, verify, then switch back to absolute for local builds. The repo
> ships with absolute remappings (local builds) + a comment in `foundry.toml` documenting the toggle.

## Fork test vs real Compound III

`test/ForkComet.t.sol` exercises the Vault + Integrator against **real Base mainnet USDC + Comet**
(`cUSDCv3 0xb125E6687d4313864e53df431d5425969c15Eb2F`):

```bash
forge test --match-contract ForkCometTest --fork-url https://mainnet.base.org -vv
```

Result: 5,000 USDC supplied → **5,161.18 after a simulated year** (~3.22% real supply APR); exact
supply/accrue/withdraw round-trip, `backing == harvested assets`, pull-ledger conservation, and a
two-depositor 3:1 pro-rata check within 1%. The tests no-op under a non-forked `forge test`.

## Verified on-chain wiring

- `CompoundIntegratorV4.vault` → VaultV4 ✓
- `VaultV4.integrator` → CompoundIntegratorV4 ✓
- `VaultV4.isEngine[CircleEngineV4]` / `[AuctionEngineV4]` → true ✓
- `MemberRegistryV4.authorizedCallers[CircleEngineV4]` / `[AuctionEngineV4]` → true ✓
- `LotteryEngineV4.authorizedRequesters[CircleEngineV4]` / `[AuctionEngineV4]` → true ✓

## Post-deploy required

1. Add `LotteryEngineV4` (`0x3574f6a5AB7ce7edD3f8418f3F845F796acBF42b`) as a consumer on the Chainlink
   VRF subscription `95752933549...911115`.
2. Fund the VRF subscription with LINK (needed for `CircleEngineV4.startPot` shuffle and the
   `AuctionEngineV4` no-bid path).
3. (Optional) `CompoundIntegratorV4.setCometRewards(address)` once a Base Sepolia CometRewards is known.
4. (Production) Transfer `owner()` of each contract to a 2/3 multisig + timelock.

## Finding → remediation → test map

| ID | Remediation | Test |
|---|---|---|
| C-01 | Merkle invite gate + payment-gated eligibility + default→slash/blacklist; no collateral (disclosed) | `test_C01_inviteGate_blocksUninvited`, `test_C01_nonPayerDefaultedAndBlacklisted` |
| C-02 | VRF economic gate: 0→early, 1→direct, ≥2→VRF; `MIN_AMOUNT_PER_CYCLE` | `test_C02_singleEligibleAssignsDirectNoVRF`, `test_C02_twoEligibleUsesVRF` |
| H-01 | `hasWonInPot` blocks re-bid / re-win | `test_H01_winnerCannotBidAgain` |
| H-02 | `_eligibleMembers` excludes winners/defaulters; callback belt-assert | (eligibility path, conservation test) |
| H-03 | bid ceiling = `cycle.totalCollected`; winner credit capped at harvested assets | `test_H03_overBidReverts` |
| H-04 | pull payments; blacklisted recipient cannot brick finalization | `test_H04_blacklistedRecipientDoesNotBrick` |
| H-05 | ERC4626 virtual-offset + revert `ZeroShares` | `test_H05_zeroSharesReverts`, `test_H05_roundTripPreservesValue` |
| M-01 | strictly-lower-only bids; lowest bidder cannot raise | `test_M01_lowestBidderCannotRaise` |
| M-03 | `MIN_BID_STEP_BPS` (2%) | `test_M03_minStepEnforced` |
| M-05 | fixed roster; `memberCount==cycleCount` | `test_M05_createRejectsBadMemberCount`, `test_M05_startRevertsIfRosterIncomplete` |
| M-06 | payment deadline | `test_M06_payAfterDeadlineReverts` |
| L-03 | no emergency sweep; surplus-only timelocked rescue | (VaultV4 `rescueSurplus`) |
| inv #11 | blacklist gates joins, never claims | `test_blacklistGatesJoin_butAllowsClaim` |
| lifecycle | each member wins once; conservation; vault drains | `test_circle_fullPot_eachWinsOnce_conservation` |

**Tests:** 18 / 18 passing (`cd smart-contracts/v4 && forge test`).

## Re-deploy

```bash
cd smart-contracts/v4
set -a && source .env && set +a
forge script script/DeployV4.s.sol:DeployV4 --rpc-url https://sepolia.base.org --broadcast --slow
```
