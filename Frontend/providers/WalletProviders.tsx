'use client';

import * as React from 'react';
import { WagmiProvider } from 'wagmi';
import {
  RainbowKitProvider,
  lightTheme,
} from '@rainbow-me/rainbowkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { config } from '@/config/wagmi'; // Adjust path as needed

// Poll reads so the page reflects other members' actions without a manual refresh.
const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchInterval: 15_000, staleTime: 5_000 } },
});

// 2. Define Custom Theme (Optional: For stylish/custom look)
const customTheme = lightTheme({
  accentColor: '#4F46E5', // Indigo color
  accentColorForeground: 'white',
  borderRadius: 'large',
  fontStack: 'system',
  overlayBlur: 'small',
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider 
          theme={customTheme} // Apply the modern, customizable theme
          modalSize="compact" // Use compact size for sleek look
        >
          {children}
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}