'use client';

// Privy-only half of the account layer. Imported solely from providers/PrivyProviders (client-only),
// so no Privy code reaches server rendering.

import { useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { getIdentityToken, useMfaEnrollment, usePrivy } from '@privy-io/react-auth';
import { useSmartWallets } from '@privy-io/react-auth/smart-wallets';
import { useGrantAutopay } from './privy-autopay';
import { AccountContext, SPONSORED, encodeCall, useEoaSendCalls, type ChainPotAccount, type ContractCall } from './account';

// ---- Smart-account mode (Privy) ----

export function PrivyAccountBridge({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const { client } = useSmartWallets();
  const { showMfaEnrollmentModal } = useMfaEnrollment();
  // Users who sign in with their own wallet through Privy have no smart wallet; they act as an EOA.
  const { address: externalAddress } = useAccount();
  const eoaSend = useEoaSendCalls();

  const smartAddress = (user?.smartWallet?.address ?? client?.account?.address) as `0x${string}` | undefined;
  const isSmart = !!smartAddress;
  const address = smartAddress ?? externalAddress;
  const grantAutopay = useGrantAutopay(smartAddress);
  const label = user?.email?.address ?? user?.phone?.number ?? user?.google?.email ?? undefined;
  const passkeyProtected = !!user?.mfaMethods?.includes('passkey');

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
      ready,
      isConnected: ready && authenticated && !!address,
      address,
      label,
      sponsored: isSmart && SPONSORED,
      passkeyProtected: isSmart && passkeyProtected,
      login,
      logout: () => void logout(),
      enrollPasskey: isSmart ? showMfaEnrollmentModal : undefined,
      contacts: { email: user?.email?.address, phone: user?.phone?.number },
      getIdentityToken,
      grantAutopay: isSmart ? grantAutopay : undefined,
      sendCalls: isSmart ? smartSend : eoaSend,
    }),
    [isSmart, ready, authenticated, address, label, passkeyProtected, login, logout, showMfaEnrollmentModal, smartSend, eoaSend, user?.email?.address, user?.phone?.number, grantAutopay],
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

