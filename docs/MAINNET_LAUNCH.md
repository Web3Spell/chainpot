# ChainPot — Base mainnet launch runbook

_Simulated 25 Nov 2026 against a fork of Base mainnet (chain 8453), using the unmodified
`smart-contracts/v4/script/DeployV4.s.sol` and the audited sources (`v4/src` identical to `1672be8`)._

## 1. What it costs (measured, not estimated)

Every launch transaction was executed on a mainnet fork and priced with live Base fees
(L2 gas 0.006 gwei; L1 data fee from the `GasPriceOracle` predeploy; ETH = $1,642.87 via Chainlink).

| Step | Txs | Gas used |
|---|---:|---:|
| Deploy 6 contracts (Registry, VRFProvider, Integrator, Vault, CircleEngine, AuctionEngine) | 6 | 12,401,018 |
| Wiring (setVault, 2× setEngine, lockEngineSetup, 2× setAuthorizedCaller, 2× setAuthorizedRequester) | 8 | 387,753 |
| VRF subscription: create, setVRFConfig, addConsumer, fund 1 LINK | 4 | 315,332 |
| Ownership → Safe (5× transferOwnership, VRFProvider transfer + Safe accept, sub transfer + Safe accept) | 9 | 303,280 |
| **Total** | **27** | **13,407,383** |

| Base gas price | Total ETH | ≈ USD |
|---|---:|---:|
| 0.006 gwei (today) | 0.000081 | $0.13 |
| 0.05 gwei (busy) | 0.00067 | $1.10 |
| 0.5 gwei (rare spike) | 0.0067 | $11 |

The L1 data fee was 0.0000004 ETH in total, so it can be ignored.

### Wallet funding

| Wallet | Fund with | Why |
|---|---|---|
| Deployer (fresh EOA) | **0.003 ETH** on Base | Covers the full deploy up to ~0.2 gwei; leftover can be swept to the Safe |
| Keeper (fresh EOA) | **0.002 ETH** on Base | startCycle/settle/draw/finalize/claimFor. Roughly 0.5M gas per round ≈ 0.000003 ETH, so 0.002 ETH lasts hundreds of rounds |
| Each Safe signer | **0.0005 ETH** on Base | Gas to execute Safe transactions (accept ownership, accept subscription, pause if ever needed) |
| VRF subscription | **1 LINK** on Base | Testnet measured ~0.0005 LINK per draw, so 1 LINK covers on the order of a thousand draws |
| CDP paymaster | CDP credits / card | Sponsors every user action (≈ $0.001–0.01 each at today's gas) |

Total cash needed: about 0.006 ETH (~$10) and 1 LINK (~$15–25).

## 2. Verified mainnet addresses (checked on-chain)

| Dependency | Address | Check |
|---|---|---|
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | `symbol()` = USDC, 6 decimals |
| Compound III cUSDCv3 | `0xb125E6687d4313864e53df431d5425969c15Eb2F` | `baseToken()` = USDC |
| Chainlink VRF v2.5 Coordinator | `0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634` | `LINK()` = LINK below |
| LINK | `0x88Fb150BDc53A65fe94Dea0c9BA0a6dAf8C6e196` | `symbol()` = LINK |
| VRF key hash (2 gwei lane, use this) | `0x00b81b5a830cb0a4009fbd8904de511e28631e62ce5ad231373d3cdad373ccab` | `s_provingKeys` → registered, max 2 gwei |
| VRF key hash (30 gwei lane) | `0xdc2f87677b01473c763cb0aee938ed3341512f6057324a584e5944e786144d70` | registered, max 30 gwei |

## 3. Step by step

### A. Wallets (you)
1. **Safe (2-of-3)** at app.safe.global → network **Base** → owners: your hardware wallet, a second
   device wallet you control, and one trusted person (co-founder/advisor). Threshold 2. Note the Safe address.
2. **Fresh deployer EOA**, never used on testnet, never shared. Send it 0.003 ETH on Base.
3. **Fresh keeper EOA**. Send it 0.002 ETH on Base.
4. Buy **1 LINK** and withdraw it **on the Base network** to the deployer (or bridge it).

### B. Chainlink VRF (deployer, at vrf.chain.link → Base)
5. Create a subscription and note the **subscription ID**.
6. Fund it with 1 LINK.

### C. Deploy (deployer)
7. In `smart-contracts/v4/.env` (never commit it), set the mainnet values. The script's variable names
   say `BASE_SEPOLIA`, but they are just addresses:
   ```
   PRIVATE_KEY=<fresh deployer key>
   USDC_BASE_SEPOLIA=0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
   COMET_USDC_BASE_SEPOLIA=0xb125E6687d4313864e53df431d5425969c15Eb2F
   VRF_COORDINATOR_BASE_SEPOLIA=0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634
   VRF_KEYHASH_BASE_SEPOLIA=0x00b81b5a830cb0a4009fbd8904de511e28631e62ce5ad231373d3cdad373ccab
   VRF_SUBSCRIPTION_ID=<from step 5>
   TREASURY=<Safe address>   # REQUIRED: otherwise the 20% interest share goes to the deployer
   ```
8. Dry run first (no `--broadcast`), then deploy from the audited commit:
   ```
   git checkout 1672be8 -- smart-contracts/v4/src   # or confirm: git diff 1672be8 -- smart-contracts/v4/src is empty
   forge script script/DeployV4.s.sol:DeployV4 --rpc-url https://mainnet.base.org            # simulate
   forge script script/DeployV4.s.sol:DeployV4 --rpc-url https://mainnet.base.org --broadcast --slow
   ```
9. On vrf.chain.link, **Add consumer** = the new `VRFProviderV4` address.
10. Verify sources (Sourcify or Basescan, see `v4/DEPLOYMENT.md`), with chain id 8453.

### D. Hand control to the Safe
11. From the deployer, call `transferOwnership(<Safe>)` on MemberRegistryV4, CompoundIntegratorV4,
    VaultV4, CircleEngineV4, AuctionEngineV4 (one-step) and VRFProviderV4 (two-step).
12. In the Safe: call `acceptOwnership()` on **VRFProviderV4** (Transaction Builder).
13. On vrf.chain.link, transfer the subscription to the Safe, then accept it from the Safe.
14. Check: `cast call <each> "owner()(address)"` returns the Safe for all six. Sweep leftover deployer ETH to the Safe.

### E. Infrastructure (you, in dashboards)
15. **CDP portal** → Paymaster → **Base mainnet**: copy the mainnet bundler/paymaster RPC URL.
    Set a per-user spend limit (e.g. $0.50/day) and a global monthly cap (e.g. $50) for the beta.
    If you use the contract allowlist, include USDC (`approve`, `permit`), CircleEngine, AuctionEngine,
    VaultV4 (`claim`), MemberRegistryV4 and the Kernel factory/validator calls used to deploy accounts and
    install autopay session keys. Otherwise first-time users can't create their account.
    Apply for Base gas credits.
16. **Privy dashboard** → Smart wallets → add **Base (8453)** with the CDP mainnet bundler + paymaster
    URLs (Kernel, same as testnet). Allowed origins: `https://chainpot.fun` **and**
    `https://www.chainpot.fun`. Terms/Privacy URLs are already set in code.
17. **Transak**: switch to a production API key and set `NEXT_PUBLIC_TRANSAK_ENV=PRODUCTION`
    (KYB approval needed). The code already targets the `base` network.
18. **RPC**: use a paid Base mainnet RPC (CDP node or Alchemy) for the app, keeper and indexer, not the public endpoint.

### F. Code (Claude)
19. Add one network switch (`NEXT_PUBLIC_CHAIN=base | base-sepolia`) that sets chain, contract
    addresses, USDC, explorer and RPC in one place. Files currently hard-wired to Base Sepolia:
    `config/wagmi.ts`, `config/hooksConf.ts`, `providers/PrivyProviders.tsx`, `next.config.ts` (CSP RPC),
    `lib/server/chain.ts`, `lib/server/autopay-send.ts`, `lib/aa/privy-autopay.ts`,
    `components/pots/verify-on-chain.tsx`, `components/dashboard/my-activities.tsx`, `app/about/page.tsx`
    (contract links and "Base Sepolia" label), `keeper/src/chain.ts`, `keeper/src/index.ts`,
    `indexer/ponder.config.ts` (chain 8453, new addresses, `START_BLOCK` = deploy block).
20. **Beta limits** (in the app, during the guarded launch): for example a maximum of $100 per round and
    10 members per circle. The contracts allow more, so these are UX guards, not security.
21. Change the "testnet" copy in the FAQ, About page, Terms §4 and Risk Disclosure.
22. **Separate data**: pot IDs restart at 1 on mainnet, so testnet rows in `pot_meta`, `circle_drafts`
    and `autopay` would attach to the wrong mainnet circles. Use a new Supabase project for mainnet
    (re-run migrations 0001–0007) and keep testnet running on its own URL (e.g. testnet.chainpot.fun).

### G. Before announcing
23. Run one real circle on mainnet with 2–3 team wallets at 1 USDC: create → join → start → pay →
    draw (real VRF) → claim. Check the keeper, reminders and the indexer.
24. Then open to the first community circles.
