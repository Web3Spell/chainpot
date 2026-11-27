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
