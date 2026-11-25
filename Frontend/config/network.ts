// Dependency-free on purpose: the keeper imports this file (and hooksConf) from outside the Next app,
// so it must not import viem. Chain objects live in config/chain.ts (app) and keeper/src/chain.ts.

// One switch for the whole stack (web app, API routes, keeper — which imports this file).
//   NEXT_PUBLIC_CHAIN=base          → Base mainnet, real USDC
//   NEXT_PUBLIC_CHAIN=base-sepolia  → Base Sepolia testnet (default, so a missing env never hits mainnet)
// Outside Next.js (keeper) `CHAIN` is accepted too.

export type NetworkId = 'base' | 'base-sepolia';

export interface Network {
  id: NetworkId;
  chainId: 8453 | 84532;
  label: string;
  isMainnet: boolean;
  defaultRpc: string;
  explorer: string;
  /** Where to get test USDC; undefined on mainnet. */
  faucet?: string;
  addresses: {
    memberRegistry: string;
    circleEngine: string;
    auctionEngine: string;
    vault: string;
    lottery: string;
    compoundIntegrator: string;
    usdc: string;
  };
  /** First block the indexer needs (all six contracts deployed at or after it). */
  startBlock: number;
}

export const NETWORKS: Record<NetworkId, Network> = {
  // smart-contracts/v4/DEPLOYMENT_MAINNET.md — owned by the 2-of-3 Safe 0x7cc4…6b68.
  base: {
    id: 'base',
    chainId: 8453,
    label: 'Base',
    isMainnet: true,
    defaultRpc: 'https://mainnet.base.org',
    explorer: 'https://basescan.org',
    addresses: {
      memberRegistry: '0xb35737D20D2009cBb8C38DEDf38F9960507734bC',
      circleEngine: '0xE6F857BA235B9a1460322adB75Cb7A76D385568c',
      auctionEngine: '0x0F67D2B6cFa3fA0E143874104A0D803137F48499',
      vault: '0x6d1d2cF9BA316181a4d1BE21C3D785d4dE2FA3E6',
      lottery: '0x78CC6E0AaFb256233d18459AC2E248C3303ceC8C',
      compoundIntegrator: '0x5ea4241d1fd99B83b15826c8A88d01008d233007',
      usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    },
    startBlock: 62_082_159,
  },
  // smart-contracts/v4/DEPLOYMENT.md
  'base-sepolia': {
    id: 'base-sepolia',
    chainId: 84532,
    label: 'Base Sepolia',
    isMainnet: false,
    defaultRpc: 'https://base-sepolia-rpc.publicnode.com',
    explorer: 'https://sepolia.basescan.org',
    faucet: 'https://faucet.circle.com/',
    addresses: {
      memberRegistry: '0x5860dDEE64256Cf77924209b1eEEb4ddf92B3395',
      circleEngine: '0x8EA7cdD4Ae50FC8BF99a76eD182F0665710D81Db',
      auctionEngine: '0x347B063538219961a747192d0656c1b4e382Da2e',
      vault: '0x3D5dd83A9977BBEA876F9380cfd56A6B9E064C95',
      lottery: '0x02C179C8ddD881Ae61C50D06440a849EFCBEf504',
      compoundIntegrator: '0xa530364AfcEFeB70938Ec2D1aDdc1f64410610B6',
      usdc: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    },
    startBlock: 45_989_504,
  },
};

export function resolveNetworkId(value: string | undefined): NetworkId {
  const v = (value ?? '').trim().toLowerCase();
  return v === 'base' || v === 'base-mainnet' || v === 'mainnet' || v === '8453' ? 'base' : 'base-sepolia';
}

// NEXT_PUBLIC_CHAIN must be read literally so Next.js inlines it into the browser bundle.
export const NETWORK: Network = NETWORKS[resolveNetworkId(process.env.NEXT_PUBLIC_CHAIN ?? process.env.CHAIN)];
export const IS_MAINNET = NETWORK.isMainnet;

/** RPC used in the browser. The legacy *_BASE_SEPOLIA_* names only count on testnet. */
export const PUBLIC_RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL ||
  (!IS_MAINNET ? process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL : undefined) ||
  NETWORK.defaultRpc;

/** RPC used by API routes (may be a private, keyed URL). */
export function serverRpcUrl(): string {
  return process.env.RPC_URL || (!IS_MAINNET ? process.env.BASE_SEPOLIA_RPC_URL : undefined) || PUBLIC_RPC_URL;
}

export const explorerTx = (hash: string) => `${NETWORK.explorer}/tx/${hash}`;
export const explorerAddress = (address: string) => `${NETWORK.explorer}/address/${address}`;

// ---- Guarded-launch limits ----
// The contracts allow 2–100 members and any amount ≥ $1. During the mainnet beta the app caps circles
// lower so early mistakes stay small. These are UX guards (enforced in the form and the drafts API),
// not security: the contracts remain the source of truth. Override with env; testnet is uncapped.
const envInt = (v: string | undefined) => (v && /^\d+$/.test(v) ? Number(v) : undefined);
export const BETA_MAX_MEMBERS = envInt(process.env.NEXT_PUBLIC_BETA_MAX_MEMBERS) ?? (IS_MAINNET ? 10 : 100);
/** Max contribution per round in whole US dollars. */
export const BETA_MAX_USD_PER_ROUND = envInt(process.env.NEXT_PUBLIC_BETA_MAX_USD) ?? (IS_MAINNET ? 100 : undefined);
