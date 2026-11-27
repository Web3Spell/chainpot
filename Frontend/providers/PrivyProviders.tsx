'use client';

import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { CHAIN } from '@/config/chain';
import { PrivyProvider, type PrivyClientConfig } from '@privy-io/react-auth';
import { SmartWalletsProvider } from '@privy-io/react-auth/smart-wallets';
import { WagmiProvider as PrivyWagmiProvider, createConfig } from '@privy-io/wagmi';
import { transports } from '@/config/wagmi';
import { PrivyAccountBridge } from '@/lib/aa/privy-account';
import { linkedEvmWallets, selectSessionWallet } from '@/lib/aa/session';

const config = createConfig({ chains: [CHAIN], transports });
const restoreSessionWallet: NonNullable<React.ComponentProps<typeof PrivyWagmiProvider>['setActiveWalletForWagmi']> = ({ wallets, user }) => {
  const { current, connections } = config.state;
  const activeAddress = current ? connections.get(current)?.accounts[0] : undefined;
  // Privy's default wagmi restore depends on cached connector state. Resolve it from the
  // authenticated user's live wallets so reopened browsers can recover the same signer.
  return selectSessionWallet(wallets, linkedEvmWallets(user), activeAddress, user?.wallet?.address);
};

// Gas sponsorship (paymaster) and the bundler are configured per network in the Privy dashboard;
// see docs/FRONTEND_UX_AA_PLAN.md → "Gas + signing setup".
const privyConfig: PrivyClientConfig = {
  loginMethods: ['sms', 'email', 'google', 'apple', 'passkey', 'wallet'],
  appearance: {
    theme: 'light',
    accentColor: '#4F46E5',
    logo: '/images/logo-black.svg',
    landingHeader: 'Sign in to ChainPot',
    walletChainType: 'ethereum-only',
    showWalletLoginFirst: false,
  },
  intl: { defaultCountry: 'IN' },
  legal: { termsAndConditionsUrl: '/terms', privacyPolicyUrl: '/privacy' },
  // Every phone/email/social login gets an embedded signer that owns a smart wallet.
  embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' }, showWalletUIs: false },
  defaultChain: CHAIN,
  supportedChains: [CHAIN],
};

export default function PrivyProviders({ appId, queryClient, children }: { appId: string; queryClient: QueryClient; children: React.ReactNode }) {
  return (
    <PrivyProvider appId={appId} config={privyConfig}>
      <SmartWalletsProvider>
        <QueryClientProvider client={queryClient}>
          <PrivyWagmiProvider config={config} setActiveWalletForWagmi={restoreSessionWallet}>
            <PrivyAccountBridge>{children}</PrivyAccountBridge>
          </PrivyWagmiProvider>
        </QueryClientProvider>
      </SmartWalletsProvider>
    </PrivyProvider>
  );
}
