'use client';

import { createContext, useCallback, useContext, useMemo } from 'react';
import { useAccount, useConfig } from 'wagmi';
import { waitForTransactionReceipt, writeContract } from 'wagmi/actions';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { useDisconnect } from 'wagmi';
import { encodeFunctionData, type Abi, type Hex } from 'viem';

/** One contract call. Batches are sent as a single sponsored user operation in smart-account mode. */
export interface ContractCall {
  address: `0x${string}`;
  abi: Abi | readonly unknown[];
  functionName: string;
  args?: readonly unknown[];
}

export function encodeCall(call: ContractCall): { to: `0x${string}`; data: Hex } {
  return {
    to: call.address,
    data: encodeFunctionData({ abi: call.abi as Abi, functionName: call.functionName, args: call.args ?? [] }),
  };
}

export const SPONSORED = process.env.NEXT_PUBLIC_GAS_SPONSORED !== 'false';

/**
 * The account ChainPot acts as. In smart-account mode this is the Privy smart wallet — the address
 * that is `msg.sender` on-chain, the one that goes into invite lists and holds USDC — NOT the
 * embedded signer that wagmi reports.
 */
export interface ChainPotAccount {
  mode: 'smart' | 'eoa';
  ready: boolean;
  isConnected: boolean;
  access: ReturnType<typeof import('./session').accountAccess>;
  address?: `0x${string}`;
  /** Email or phone the user signed in with (smart mode only). */
  label?: string;
  /** Gas is paid by the paymaster (smart mode with a paymaster configured in the Privy dashboard). */
  sponsored: boolean;
  /** Passkey / Face ID is required to sign (smart mode, once enrolled). */
  passkeyProtected: boolean;
  login: () => void;
  reconnectWallet?: () => void;
  logout: () => void;
  /** Phone / email Privy has verified for this user (smart mode). */
  contacts?: { email?: string; phone?: string };
  /**
   * Sign the autopay permission for one pot (smart mode, Kernel wallets). Returns the serialized
   * permission — limits + owner signature, no private key — for the server to activate.
   */
  grantAutopay?: (scope: import('./autopay').AutopayScope, sessionKeyAddress: `0x${string}`) => Promise<string>;
  /** Privy identity token for authenticating to ChainPot's own API (smart mode). */
  getIdentityToken?: () => Promise<string | null>;
  /** Opens Privy's enrollment flow for passkey (Face ID / fingerprint) protection. Smart mode only. */
  enrollPasskey?: () => void;
  /** Send calls in order. Returns the hash of the transaction that included the last call. */
  sendCalls: (calls: ContractCall[]) => Promise<Hex>;
}

export const AccountContext = createContext<ChainPotAccount | null>(null);

export function useChainPotAccount(): ChainPotAccount {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error('useChainPotAccount must be used inside an account provider');
  return ctx;
}

/** Own-wallet sends: EOAs can't batch, so each call is mined before the next (e.g. approve before pay). */
export function useEoaSendCalls() {
  const config = useConfig();
  return useCallback(
    async (calls: ContractCall[]) => {
      // writeContract keeps the ABI so reverts decode to named errors.
      let hash: Hex | undefined;
      for (const call of calls) {
        hash = await writeContract(config, { address: call.address, abi: call.abi as Abi, functionName: call.functionName, args: call.args ?? [] });
        const receipt = await waitForTransactionReceipt(config, { hash });
        if (receipt.status === 'reverted') throw new Error('The transaction was reverted on-chain.');
      }
      if (!hash) throw new Error('Nothing to send.');
      return hash;
    },
    [config],
  );
}

// ---- Own-wallet mode (RainbowKit / any EOA) ----

export function WalletAccountBridge({ children }: { children: React.ReactNode }) {
  const { address, isConnected, status } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { disconnect } = useDisconnect();
  const sendCalls = useEoaSendCalls();

  const value = useMemo<ChainPotAccount>(
    () => ({
      mode: 'eoa',
      ready: status !== 'reconnecting' && status !== 'connecting',
      isConnected,
      access: isConnected ? 'connected' : status === 'disconnected' ? 'signed-out' : 'loading',
      address,
      sponsored: false,
      passkeyProtected: false,
      login: () => openConnectModal?.(),
      logout: () => disconnect(),
      sendCalls,
    }),
    [status, isConnected, address, openConnectModal, disconnect, sendCalls],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}
