import { createConfig, http } from 'wagmi';

import { mainnet, polygon, optimism, arbitrum, base } from 'wagmi/chains';

import { getDefaultConfig } from '@rainbow-me/rainbowkit';



// 1. Get your WalletConnect Project ID (Required for WalletConnect connections)

const projectId = process.env.NEXT_PUBLIC_WC_PROJECT_ID || "807833e6518d26bfea04b61e377c1d78" ;

if (!projectId) {

  throw new Error('NEXT_PUBLIC_WC_PROJECT_ID is not set in environment variables');

}



// 2. Configure the chains you want to support

const chains = [mainnet, polygon, optimism, arbitrum, base] as const;



// 3. Create the wagmi config using RainbowKit's default settings

export const config = getDefaultConfig({

  appName: 'My Next.js DApp', // Your DApp's name

  projectId: projectId,

  chains: chains,

  ssr: true, // Important for Next.js SSR/App Router

  transports: chains.reduce((acc, chain) => {

    acc[chain.id] = http();

    return acc;

  }, {} as any),

});