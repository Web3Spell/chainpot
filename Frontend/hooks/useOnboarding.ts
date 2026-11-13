'use client';

import { useCallback, useEffect, useState } from 'react';
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
    const next = Array.from(new Set([...seen, address.toLowerCase()]));
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // private window / blocked storage: the intro just shows again next time, which is harmless.
  }
}

/**
 * Controls the one-time welcome intro. `show` is true for a signed-in person who hasn't dismissed it
 * on this device; `dismiss` records that they have. Device-local on purpose — a missed intro is not
 * worth a server round-trip, and it never gates access to anything.
 */
export function useOnboarding() {
  const account = useChainPotAccount();
  const address = account.isConnected ? account.address : undefined;
  const [seen, setSeen] = useState(true); // assume seen until we can read storage (avoids a flash)

  useEffect(() => {
    setSeen(read(address));
  }, [address]);

  const dismiss = useCallback(() => {
    if (address) write(address);
    setSeen(true);
  }, [address]);

  return { show: !!address && !seen, dismiss };
}
