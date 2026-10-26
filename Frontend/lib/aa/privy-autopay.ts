'use client';

// Browser half of the autopay grant (Privy mode only). The member's embedded signer — the sudo owner
// of their Kernel smart wallet — signs the permission that lets ChainPot's session key pay this pot.
// With passkey MFA enrolled, this signature asks for Face ID / fingerprint.

import { useCallback } from 'react';
import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { useWallets } from '@privy-io/react-auth';
import { serializePermissionAccount } from '@zerodev/permissions';
import { toEmptyECDSASigner } from '@zerodev/permissions/signers';
import { transports } from '@/config/wagmi';
import { ownerAccountWithAutopay, type AutopayScope } from './autopay';

const publicClient = createPublicClient({ chain: baseSepolia, transport: transports[baseSepolia.id] ?? http() });

export function useGrantAutopay(smartWallet?: `0x${string}`) {
  const { wallets } = useWallets();
  return useCallback(
    async (scope: AutopayScope, sessionKeyAddress: `0x${string}`) => {
      const embedded = wallets.find((w) => w.walletClientType === 'privy');
      if (!embedded || !smartWallet) throw new Error('Autopay needs a ChainPot account signed in with phone, email or passkey.');
      const owner = createWalletClient({
        account: embedded.address as `0x${string}`,
        chain: baseSepolia,
        transport: custom(await embedded.getEthereumProvider()),
      });
      // Only the session key's address is needed here; its private key stays on the server.
      const account = await ownerAccountWithAutopay(publicClient as never, owner, toEmptyECDSASigner(sessionKeyAddress), scope);
      if (account.address.toLowerCase() !== smartWallet.toLowerCase()) {
        throw new Error("Your wallet type doesn't support autopay yet (it isn't a Kernel smart account).");
      }
      return serializePermissionAccount(account);
    },
    [wallets, smartWallet],
  );
}
