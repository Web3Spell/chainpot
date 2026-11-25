'use client';

import * as React from 'react';
import { WagmiProvider } from 'wagmi';
import { RainbowKitProvider, lightTheme } from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import dynamic from 'next/dynamic';

import { getRainbowConfig, PRIVY_APP_ID } from '@/config/wagmi';
import { WalletAccountBridge } from '@/lib/aa/account';
import { ConfirmProvider } from '@/components/aa/confirm-sheet';
import { CurrencyProvider } from '@/providers/currency-provider';
import { CountryPicker } from '@/components/country-picker';
import { TermsGate } from '@/components/legal/terms-gate';

// Privy (and the WalletConnect stack it bundles) is browser-only: rendering it on the server pulls in
// Node-only logging deps. The app is client-rendered behind it, with a neutral loading shell.
const PrivyProviders = dynamic(() => import('./PrivyProviders'), {
  ssr: false,
  loading: () => <div className="min-h-screen bg-black" aria-busy="true" />,
});

// Poll reads so the page reflects other members' actions without a manual refresh.
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchInterval: 15_000, staleTime: 5_000 } },
});

const rainbowTheme = lightTheme({
  accentColor: '#4F46E5',
  accentColorForeground: 'white',
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small',
});

/** App-level UI that needs the account + query client. */
function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CurrencyProvider>
      <ConfirmProvider>
        {children}
        <CountryPicker />
        <TermsGate />
      </ConfirmProvider>
    </CurrencyProvider>
  );
}

export function Providers({ children }: { children: React.ReactNode }) {
  if (PRIVY_APP_ID) {
    return (
      <PrivyProviders appId={PRIVY_APP_ID} queryClient={queryClient}>
        <AppShell>{children}</AppShell>
      </PrivyProviders>
    );
  }

  return (
    <WagmiProvider config={getRainbowConfig()}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider theme={rainbowTheme} modalSize="compact">
          <WalletAccountBridge>
            <AppShell>{children}</AppShell>
          </WalletAccountBridge>
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
