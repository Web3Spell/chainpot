import { createConfig } from "ponder";
import { AuctionEngineV4Abi } from "./abis/AuctionEngineV4";
import { CircleEngineV4Abi } from "./abis/CircleEngineV4";
import { MemberRegistryV4Abi } from "./abis/MemberRegistryV4";
import { VaultV4Abi } from "./abis/VaultV4";

// PONDER_CHAIN=base indexes Base mainnet; anything else (default) indexes Base Sepolia.
// Keep these in sync with Frontend/config/network.ts. Use a separate database (or DATABASE_SCHEMA)
// per network: mainnet pot IDs restart at 1.
const DEPLOYMENTS = {
  // smart-contracts/v4/DEPLOYMENT_MAINNET.md
  base: {
    id: 8453,
    rpc: process.env.PONDER_RPC_URL_8453 ?? "https://mainnet.base.org",
    startBlock: 62_082_159,
    addresses: {
      circleEngine: "0xE6F857BA235B9a1460322adB75Cb7A76D385568c",
      auctionEngine: "0x0F67D2B6cFa3fA0E143874104A0D803137F48499",
      vault: "0x6d1d2cF9BA316181a4d1BE21C3D785d4dE2FA3E6",
      memberRegistry: "0xb35737D20D2009cBb8C38DEDf38F9960507734bC",
    },
  },
  // smart-contracts/v4/DEPLOYMENT.md. publicnode is pruned and sepolia.base.org caps eth_getLogs at
  // 200 blocks; Tenderly's public gateway serves large ranges.
  baseSepolia: {
    id: 84532,
    rpc: process.env.PONDER_RPC_URL_84532 ?? "https://base-sepolia.gateway.tenderly.co",
    startBlock: 45_989_504,
    addresses: {
      circleEngine: "0x8EA7cdD4Ae50FC8BF99a76eD182F0665710D81Db",
      auctionEngine: "0x347B063538219961a747192d0656c1b4e382Da2e",
      vault: "0x3D5dd83A9977BBEA876F9380cfd56A6B9E064C95",
      memberRegistry: "0x5860dDEE64256Cf77924209b1eEEb4ddf92B3395",
    },
  },
} as const;

const CHAIN = process.env.PONDER_CHAIN === "base" ? "base" : "baseSepolia";
const D = DEPLOYMENTS[CHAIN];
const START_BLOCK = D.startBlock;

export const ADDRESSES = D.addresses;

export default createConfig({
  chains: {
    [CHAIN]: {
      id: D.id,
      rpc: D.rpc,
      // Stay under free-tier rate limits; raise both with a paid RPC.
      maxRequestsPerSecond: Number(process.env.PONDER_RPC_MAX_RPS ?? 5),
      ethGetLogsBlockRange: Number(process.env.PONDER_GETLOGS_RANGE ?? 500_000),
    },
  },
  contracts: {
    CircleEngine: { chain: CHAIN, abi: CircleEngineV4Abi, address: ADDRESSES.circleEngine, startBlock: START_BLOCK },
    AuctionEngine: { chain: CHAIN, abi: AuctionEngineV4Abi, address: ADDRESSES.auctionEngine, startBlock: START_BLOCK },
    Vault: { chain: CHAIN, abi: VaultV4Abi, address: ADDRESSES.vault, startBlock: START_BLOCK },
    MemberRegistry: { chain: CHAIN, abi: MemberRegistryV4Abi, address: ADDRESSES.memberRegistry, startBlock: START_BLOCK },
  },
});
