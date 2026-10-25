import { http } from 'wagmi';
import { baseSepolia } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// WalletConnect project ID (https://cloud.reown.com). The fallback is a shared dev ID; set your own in .env.local.
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || '807833e6518d26bfea04b61e377c1d78';

// Prefer a dedicated RPC (e.g. CDP Node) in production; the public endpoint is rate limited.
const rpcUrl = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL || 'https://base-sepolia-rpc.publicnode.com';

export const config = getDefaultConfig({
  appName: 'ChainPot',
  projectId,
  chains: [baseSepolia],
  ssr: true,
  transports: {
    [baseSepolia.id]: http(rpcUrl),
  },
});
