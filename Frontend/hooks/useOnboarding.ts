'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useChainPotAccount } from '@/lib/aa/account';

const KEY = 'chainpot:onboarded';

/** Has this person seen the welcome intro on this device? Stored per account address. */
function read(address?: string): boolean {
  if (!address) return true; // not signed in → nothing to show
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    return (JSON.parse(raw) as string[]).includes(address.toLowerCase());
  } catch {
    return false;
  }
}

function write(address: string) {
  try {
    const raw = localStorage.getItem(KEY);
    const seen = raw ? (JSON.parse(raw) as string[]) : [];
    localStorage.setItem(KEY, JSON.stringify(Array.from(new Set([...seen, address.toLowerCase()]))));
    // Same-tab listeners don't get the native 'storage' event, so nudge them.
    window.dispatchEvent(new Event('chainpot:onboarded-change'));
  } catch {
    // private window / blocked storage: the intro just shows again next time, which is harmless.
  }
}

function subscribe(cb: () => void) {
  window.addEventListener('storage', cb);
  window.addEventListener('chainpot:onboarded-change', cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener('chainpot:onboarded-change', cb);
  };
}

/**
 * Controls the one-time welcome intro. `show` is true for a signed-in person who hasn't dismissed it
 * on this device; `dismiss` records that they have. Device-local on purpose — a missed intro is not
 * worth a server round-trip, and it never gates access to anything.
 */
export function useOnboarding() {
  const account = useChainPotAccount();
  const address = account.isConnected ? account.address : undefined;

  // useSyncExternalStore keeps SSR safe (server snapshot = "seen", so nothing flashes) and re-reads
  // whenever storage changes. The snapshot is a primitive boolean, so React compares it by value.
  const seen = useSyncExternalStore(
    subscribe,
    () => read(address),
    () => true,
  );

  const dismiss = useCallback(() => {
    if (address) write(address);
  }, [address]);

  return { show: !!address && !seen, dismiss };
}
