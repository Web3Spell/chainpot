import { http } from 'wagmi';
import { CHAIN } from './chain';
import { PUBLIC_RPC_URL } from './network';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

/** When set, users sign in with Privy (email/phone/social/passkey) and act through a smart wallet. */
export const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;

// Prefer a dedicated RPC (e.g. CDP Node) in production; the public endpoint is rate limited.
const transports = { [CHAIN.id]: http(PUBLIC_RPC_URL) };

// WalletConnect project ID (https://cloud.reown.com). The fallback is a shared dev ID; set your own in .env.local.
const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || '807833e6518d26bfea04b61e377c1d78';

export { transports };

let rainbowConfig: ReturnType<typeof getDefaultConfig> | undefined;

/**
 * Own-wallet mode (RainbowKit). Created lazily so Privy mode — which builds its own config in
 * providers/PrivyProviders — never starts a second WalletConnect client.
 */
export function getRainbowConfig() {
  return (rainbowConfig ??= getDefaultConfig({ appName: 'ChainPot', projectId, chains: [CHAIN], ssr: true, transports }));
}
