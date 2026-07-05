---
name: chainpot-v4-architecture
description: ChainPot V4 two-program ROSCA architecture and locked product decisions
metadata:
  type: project
---

ChainPot is an invite-only on-chain ROSCA ("chit fund") protocol on Base (Solidity 0.8.24,
OpenZeppelin + Chainlink VRF v2.5, Foundry). A Compound-team audit (`findings.md`: C-01..C-02,
H-01..H-05, M-01..M-06, L-01..L-03, several [I]) was paused on **C-01 "paying is optional"** —
the root cause is that on-chain ROSCAs extend *unsecured credit* to free, anonymous wallets.

The authoritative remediation plan is `smart-contracts/CHAINPOT_V4_PLAN.md` (supersedes the
earlier `smart-contracts/SM_IMPLEMENTATION.md`). Current audited code is `smart-contracts/v3/src/`
(AuctionEngineV3, EscrowV3, CompoundIntegratorV3, LotteryEngineV3, MemberAccountManagerV3) — left
untouched so auditors diff cleanly; V4 goes under `smart-contracts/v4/src/`.

**V4 = two programs on a shared hardened core** (decided 2026-06-21 with the user):
- **Program A "Circle"** (`CircleEngineV4`) — social/friends, no bidding, winner = **VRF random
  each cycle** among not-yet-won members.
- **Program B "Market"** (`AuctionEngineV4`) — businesses/urgent liquidity, low-bid discount
  auction; **liquidity-first**: winner gets FULL payout; security via invite-gate + 1× bond +
  reputation slash + global blacklist + creator roster control (withhold-the-tail
  collateralization kept as opt-in `CollateralPolicy.Tail/Full` dial, default `None`).
- **Shared core**: one MemberRegistryV4 + one VaultV4 (Escrow+collateral, pull `withdrawable[]`) +
  one CompoundIntegratorV4 (single global ERC4626 position, internal accounting + virtual offset) +
  one LotteryEngineV4 (VRF). Both engines authorized; Vault accounting namespaced by engine address
  (`funds[engine][potId][cycleId]`) so IDs never collide.

**Why:** The key insight the old plan missed — there is an irreducible **liquidity ⟷ default-risk
tradeoff**: full winner-collateralization makes default impossible but destroys the early-draw
cash value. C-01 is NOT "structurally impossible"; the invite/Merkle gate (the auditors' own
headline rec) closes the sybil dimension, and the residual is disclosed credit risk priced by the
vetted creator. This must be stated honestly to the auditors, not hidden.

**How to apply:** When implementing, follow the PR sequencing in §10 of the plan (CI → Vault → MR →
LE → CircleEngine → AuctionEngine → deploy → frontend). Program A has NO bidding, so M-01/M-02/M-03
are N/A there. C-02 (VRF spam) now applies to BOTH programs — gate VRF on cycle fully-funded +
eligible.length ≥ 2, with last-cycle deterministic fast-path.
