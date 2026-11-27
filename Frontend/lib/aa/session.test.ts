import { describe, expect, it } from 'vitest';
import { accountAccess, selectSessionWallet } from './session';

const restoredSession = {
  authReady: true,
  authenticated: true,
  walletsReady: true,
  reconnecting: false,
  hasExternalWallet: false,
};

describe('restoring account access', () => {
  it('waits for Privy before offering sign-in', () => {
    const signedOut = { ...restoredSession, authenticated: false };
    expect(accountAccess({ ...signedOut, authReady: false })).toBe('loading');
    expect(accountAccess(signedOut)).toBe('signed-out');
  });

  it('waits for wallet discovery after authentication is restored', () => {
    expect(accountAccess({ ...restoredSession, walletsReady: false })).toBe('loading');
    expect(accountAccess({ ...restoredSession, walletsReady: false, address: '0x123' })).toBe('connected');
  });

  it('offers reconnection when the linked external wallet is disconnected', () => {
    const externalSession = { ...restoredSession, hasExternalWallet: true };
    expect(accountAccess({ ...externalSession, reconnecting: true })).toBe('loading');
    expect(accountAccess(externalSession)).toBe('reconnect');
    expect(accountAccess({ ...externalSession, address: '0x123' })).toBe('connected');
  });

  it('keeps a wallet-less session signed in and allows recovery', () => {
    expect(accountAccess(restoredSession)).toBe('wallet-unavailable');
  });
});

describe('restoring a Privy wallet into wagmi', () => {
  const returningWallet = { address: '0xAbC' };
  const otherWallet = { address: '0xDef' };
  const linked = [{ address: '0xabc', walletClientType: 'rabby_wallet' }];

  it('restores the connected linked wallet without a saved wagmi connection', () => {
    expect(selectSessionWallet([otherWallet, returningWallet], linked)).toBe(returningWallet);
  });

  it('ignores an unrelated injected wallet and does not synthesize a disconnected signer', () => {
    expect(selectSessionWallet([otherWallet], linked, otherWallet.address)).toBeUndefined();
    expect(selectSessionWallet([returningWallet], [])).toBeUndefined();
  });

  it('chooses the primary wallet if the old wagmi address is stale and two wallets are linked', () => {
    const links = [...linked, { address: otherWallet.address }];
    expect(selectSessionWallet([otherWallet, returningWallet], links, '0x123', '0xabc')).toBe(returningWallet);
    expect(selectSessionWallet([otherWallet, returningWallet], links)).toBeUndefined();
  });

  it('keeps the embedded signer selected for sessions that have one', () => {
    const links = [...linked, { address: otherWallet.address, walletClientType: 'privy' }];
    expect(selectSessionWallet([returningWallet, otherWallet], links, returningWallet.address)).toBe(otherWallet);
  });
});
