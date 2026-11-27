import type { User } from '@privy-io/react-auth';

export function linkedEvmWallets(user: Pick<User, 'linkedAccounts'> | null) {
  return user?.linkedAccounts
    .filter((account) => account.type === 'wallet')
    .filter((wallet) => wallet.chainType === 'ethereum') ?? [];
}

/** Install only a wallet Privy has discovered and linked to the restored user. */
export function selectSessionWallet<Wallet extends { address: string }>(
  wallets: Wallet[],
  linkedWallets: { address: string; walletClientType?: string }[],
  ...preferredAddresses: (string | undefined)[]
) {
  const belongsToSession = (wallet: Wallet, address: string) =>
    wallet.address.toLowerCase() === address.toLowerCase();
  const embedded = linkedWallets.find((wallet) => wallet.walletClientType === 'privy');
  if (embedded) return wallets.find((wallet) => belongsToSession(wallet, embedded.address));

  const connected = wallets.filter((wallet) =>
    linkedWallets.some((linked) => belongsToSession(wallet, linked.address)),
  );
  for (const address of preferredAddresses) {
    const match = address && connected.find((wallet) => belongsToSession(wallet, address));
    if (match) return match;
  }
  return connected.length === 1 ? connected[0] : undefined;
}

/** Privy can restore authentication before either wallet client is available. */
export function accountAccess({
  authReady, authenticated, address, walletsReady, reconnecting, hasExternalWallet,
}: {
  authReady: boolean;
  authenticated: boolean;
  address?: string;
  walletsReady: boolean;
  reconnecting: boolean;
  hasExternalWallet: boolean;
}) {
  if (!authReady) return 'loading';
  if (!authenticated) return 'signed-out';
  if (address) return 'connected';
  if (!walletsReady || reconnecting) return 'loading';
  return hasExternalWallet ? 'reconnect' : 'wallet-unavailable';
}
