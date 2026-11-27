import { describe, expect, it } from 'vitest';
import { accountAccess } from './session';

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
