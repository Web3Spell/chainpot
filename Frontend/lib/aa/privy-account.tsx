'use client';

// Privy-only half of the account layer. Imported solely from providers/PrivyProviders (client-only),
// so no Privy code reaches server rendering.

import { useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { getIdentityToken, useConnectWallet, useMfaEnrollment, usePrivy, useUser, useWallets } from '@privy-io/react-auth';
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets';
import { useGrantAutopay } from './privy-autopay';
import { clearIdentityToken, sharedIdentityToken } from './identity-token';
import { AccountContext, SPONSORED, encodeCall, useEoaSendCalls, type ChainPotAccount, type ContractCall } from './account';
import { accountAccess, linkedEvmWallets } from './session';

// ---- Smart-account mode (Privy) ----

export function PrivyAccountBridge({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { ready: walletsReady } = useWallets();
  const { connectWallet } = useConnectWallet();
  const { client } = useSmartWallets();
  const { showMfaEnrollmentModal } = useMfaEnrollment();
  // Users who sign in with their own wallet through Privy have no smart wallet; they act as an EOA.
  const { address: wagmiAddress, status } = useAccount();
  const eoaSend = useEoaSendCalls();

  const linkedExternalWallets = linkedEvmWallets(user).filter((wallet) => wallet.walletClientType !== 'privy');
  const externalAddress = status === 'connected' && linkedExternalWallets.some(
    (wallet) => wallet.address.toLowerCase() === wagmiAddress?.toLowerCase(),
  ) ? wagmiAddress : undefined;
  const smartAddress = (authenticated ? user?.smartWallet?.address ?? client?.account?.address : undefined) as `0x${string}` | undefined;
  const isSmart = !!smartAddress;
  const address = authenticated ? smartAddress ?? externalAddress : undefined;
  const access = accountAccess({
    authReady: ready, authenticated, address, walletsReady,
    reconnecting: status === 'connecting' || status === 'reconnecting',
    hasExternalWallet: linkedExternalWallets.length > 0,
  });
  const signIn = useCallback(() => {
    if (access === 'signed-out') login();
  }, [access, login]);
  const reconnectWallet = useCallback(() => {
    if (access === 'reconnect') {
      connectWallet({ walletChainType: 'ethereum-only', description: 'Connect the wallet you previously used to sign in to ChainPot.' });
    }
  }, [access, connectWallet]);
  const grantAutopay = useGrantAutopay(smartAddress);
  const label = user?.email?.address ?? user?.phone?.number ?? user?.google?.email ?? undefined;
  const passkeyProtected = !!user?.mfaMethods?.includes('passkey');
  // One shared token per user instead of one Privy call per API request (see identity-token.ts).
  const userId = user?.id;
  // Keyed by wallet too: a new account's first token can predate its smart wallet (see identity-token.ts).
  const { refreshUser } = useUser();
  const identityToken = useCallback(
    () => (userId ? sharedIdentityToken(getIdentityToken, userId, Date.now, { wallet: smartAddress, refresh: refreshUser }) : Promise.resolve(null)),
    [userId, smartAddress, refreshUser],
  );
  const signOut = useCallback(() => {
    clearIdentityToken();
    void logout();
  }, [logout]);

  const smartSend = useCallback(
    async (calls: ContractCall[]) => {
      if (!client) throw new Error('Your account is still being set up. Try again in a moment.');
      // Our own confirmation sheet already showed a plain-language summary, so Privy's wallet UI is off.
      return client.sendTransaction(
        { calls: calls.map((c) => ({ ...encodeCall(c), value: BigInt(0) })) },
        { uiOptions: { showWalletUIs: false } },
      );
    },
    [client],
  );

  const value = useMemo<ChainPotAccount>(
    () => ({
      mode: isSmart ? 'smart' : 'eoa',
      ready: access !== 'loading',
      isConnected: access === 'connected',
      access,
      address,
      label,
      sponsored: isSmart && SPONSORED,
      passkeyProtected: isSmart && passkeyProtected,
      login: signIn,
      reconnectWallet: access === 'reconnect' ? reconnectWallet : undefined,
      logout: signOut,
      enrollPasskey: isSmart ? showMfaEnrollmentModal : undefined,
      contacts: { email: user?.email?.address, phone: user?.phone?.number },
      getIdentityToken: identityToken,
      grantAutopay: isSmart ? grantAutopay : undefined,
      sendCalls: isSmart ? smartSend : eoaSend,
    }),
    [isSmart, access, address, label, passkeyProtected, signIn, reconnectWallet, signOut, showMfaEnrollmentModal, smartSend, eoaSend, user?.email?.address, user?.phone?.number, grantAutopay, identityToken],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

