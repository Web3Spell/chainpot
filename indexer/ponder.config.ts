import { createConfig } from "ponder";
import { AuctionEngineV4Abi } from "./abis/AuctionEngineV4";
import { CircleEngineV4Abi } from "./abis/CircleEngineV4";
import { MemberRegistryV4Abi } from "./abis/MemberRegistryV4";
import { VaultV4Abi } from "./abis/VaultV4";

// V4 Base Sepolia deployment (smart-contracts/v4/DEPLOYMENT.md). All six contracts were deployed in
// blocks 45989504–45989524, so one start block covers them.
const START_BLOCK = 45_989_504;

export const ADDRESSES = {
  circleEngine: "0x8EA7cdD4Ae50FC8BF99a76eD182F0665710D81Db",
  auctionEngine: "0x347B063538219961a747192d0656c1b4e382Da2e",
  vault: "0x3D5dd83A9977BBEA876F9380cfd56A6B9E064C95",
  memberRegistry: "0x5860dDEE64256Cf77924209b1eEEb4ddf92B3395",
} as const;

export default createConfig({
  chains: {
    baseSepolia: {
      id: 84532,
      // Needs full log history back to START_BLOCK. publicnode is pruned and sepolia.base.org caps
      // eth_getLogs at 200 blocks; Tenderly's public gateway serves large ranges. Use a dedicated RPC
      // (e.g. CDP Node) in production.
      rpc: process.env.PONDER_RPC_URL_84532 ?? "https://base-sepolia.gateway.tenderly.co",
      // Stay under free-tier rate limits; raise both with a paid RPC.
      maxRequestsPerSecond: Number(process.env.PONDER_RPC_MAX_RPS ?? 5),
      ethGetLogsBlockRange: Number(process.env.PONDER_GETLOGS_RANGE ?? 500_000),
    },
  },
  contracts: {
    CircleEngine: { chain: "baseSepolia", abi: CircleEngineV4Abi, address: ADDRESSES.circleEngine, startBlock: START_BLOCK },
    AuctionEngine: { chain: "baseSepolia", abi: AuctionEngineV4Abi, address: ADDRESSES.auctionEngine, startBlock: START_BLOCK },
    Vault: { chain: "baseSepolia", abi: VaultV4Abi, address: ADDRESSES.vault, startBlock: START_BLOCK },
    MemberRegistry: { chain: "baseSepolia", abi: MemberRegistryV4Abi, address: ADDRESSES.memberRegistry, startBlock: START_BLOCK },
  },
});
