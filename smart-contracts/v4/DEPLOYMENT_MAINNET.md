# ChainPot V4 — Base mainnet deployment

**Network:** Base (chainId 8453) · **Deployed:** 25 Nov 2026, blocks 62,082,159 – 62,082,190
**Source:** audited code (`smart-contracts/v4/src` identical to commit `1672be8`), unmodified `script/DeployV4.s.sol`
**Compiler:** Solidity 0.8.24, optimizer 200 runs, via_ir
**Deployer:** `0xb4ebf635B5ba9c6238b6329AD8aDC21dEC696C0C` (single-use; owns nothing after the handover)
**Cost:** 0.0000779 ETH for 14 transactions (L2 fee 0.0000774 + L1 data fee 0.0000006)

## Contracts

| Contract | Address | Deploy tx |
|---|---|---|
| MemberRegistryV4 | `0xb35737D20D2009cBb8C38DEDf38F9960507734bC` | `0x14e87e7de4bf78722b2af2947001e12f47cedc2e36a3dac59ae9b6a206686571` |
| VRFProviderV4 | `0x78CC6E0AaFb256233d18459AC2E248C3303ceC8C` | `0x48c88e65bb78b635784617315e7edbf54e3167b49316f02468d166238e49089a` |
| CompoundIntegratorV4 | `0x5ea4241d1fd99B83b15826c8A88d01008d233007` | `0xbd32cc50e5fa20f0422b3c354dbd129f898d8d9312982a826c6f59f3b67ebed9` |
| VaultV4 | `0x6d1d2cF9BA316181a4d1BE21C3D785d4dE2FA3E6` | `0xccb7aead6467f1259e988e7f3bdc35fb995743da165e54d35360c714182e4766` |
| CircleEngineV4 | `0xE6F857BA235B9a1460322adB75Cb7A76D385568c` | `0x09f43a967d42a1542525018028bdbeef8f85b0e538b00aabb0a42d1905bd0a22` |
| AuctionEngineV4 | `0x0F67D2B6cFa3fA0E143874104A0D803137F48499` | `0x15cb7bf8a11409da1156d23b02e282718dd18824923ffc7ef9d5fc8aba5c29d7` |

Indexer `START_BLOCK` for mainnet: **62082159**.

## Dependencies

| | Address |
|---|---|
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Compound III cUSDCv3 | `0xb125E6687d4313864e53df431d5425969c15Eb2F` |
| Chainlink VRF v2.5 coordinator | `0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634` |
| VRF key hash (2 gwei lane) | `0x00b81b5a830cb0a4009fbd8904de511e28631e62ce5ad231373d3cdad373ccab` |
| VRF subscription | `100306411118676076108123111759480455216400448433251835096864213055916970221410` |
| Treasury / owner Safe (2-of-3) | `0x7cc4C4833A53A2e66C21647A23F814Fd8ecB6b68` |

## Verified on-chain after deploy

- `CompoundIntegratorV4.vault` = VaultV4; `VaultV4.integrator` = CompoundIntegratorV4
- `VaultV4.treasury` = Safe; `engineSetupLocked` = true; `isEngine` true for both engines
- `MemberRegistryV4.authorizedCallers` and `VRFProviderV4.authorizedRequesters` true for both engines
- `VRFProviderV4.subscriptionId` / `keyHash` as above; VRFProviderV4 added as subscription consumer
  (tx `0x90e3903aecb3bd89fc08aedb768131bb057c28a52cf9296cc88955e3bf8938fc`)

## Ownership

Transferred from the deployer on 25 Nov 2026:

| Contract | Owner | Tx |
|---|---|---|
| MemberRegistryV4 | Safe | `0x34676a01cb3580bf5ceda4527800a74434e25aa52e3c8879059bdc6bb406c396` |
| CompoundIntegratorV4 | Safe | `0x731f0ba208782a74f73a4f77800f65918d29f49eded4f27e5069781c190564ce` |
| VaultV4 | Safe | `0x18b7cadc5343784399a1a9aae166c56f1b54ac16d11ba435dd09a18d11a1d115` |
| CircleEngineV4 | Safe | `0x7052b61fd9789e3eac4ebe89791db3984098923964f2f6acddc52de10a7b7cd4` |
| AuctionEngineV4 | Safe | `0xac54c9bbd7bd879f325bbb99b9e8ad177cb54a84a852fa9d5fca756c03145e4c` |
| VRFProviderV4 | deployer → **Safe must call `acceptOwnership()`** (pending owner = Safe) | `0xc851b48431e315538285a1ab4998a83f5ac9a9fd282283b38bc9ff7ee67eb39b` |
| VRF subscription | deployer → **Safe must call `acceptSubscriptionOwnerTransfer`** | `0xbe48580f520b3820103000607cf634651c97a44e5f4dd3fa3c45cbf49120a6a3` |

### Safe batch to finish the handover (Transaction Builder, value 0)

| # | To | Data |
|---|---|---|
| 1 | `0x78CC6E0AaFb256233d18459AC2E248C3303ceC8C` (VRFProviderV4) | `0x79ba5097` (`acceptOwnership()`) |
| 2 | `0xd5D517aBE5cF79B7e95eC98dB0f0277788aFF634` (VRF coordinator) | `0xb2a7cac5ddc36ab2bf6c2f930893159952f06fc4212d2da0ab5d2d2dab01584490ce1f62` (`acceptSubscriptionOwnerTransfer(<sub id>)`) |
