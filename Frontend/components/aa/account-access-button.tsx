'use client';

import type { ComponentProps, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useChainPotAccount } from '@/lib/aa/account';

export function AccountAccessButton({ children = 'Sign in', ...props }: ComponentProps<typeof Button> & { children?: ReactNode }) {
  const account = useChainPotAccount();
  switch (account.access) {
    case 'loading':
      return <Button {...props} disabled aria-busy="true">Restoring account…</Button>;
    case 'reconnect':
      return <Button {...props} onClick={account.reconnectWallet}>Reconnect wallet</Button>;
    case 'wallet-unavailable':
      return (
        <div className="flex flex-wrap items-center gap-2">
          <span role="status" className="text-sm text-cp-muted">Your ChainPot account couldn’t load. Try signing out and back in.</span>
          <Button {...props} onClick={account.logout}>Sign out</Button>
        </div>
      );
    case 'signed-out':
      return <Button {...props} onClick={account.login}>{children}</Button>;
    case 'connected':
      return null;
  }
}
