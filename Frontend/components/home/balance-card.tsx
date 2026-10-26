'use client';

import { useState } from 'react';
import { Copy, Wallet } from 'lucide-react';
import { useChainPotAccount } from '@/lib/aa/account';
import { useClaim, useWithdrawable } from '@/hooks/useVault';
import { useUSDCBalance } from '@/hooks/useUsdc';
import { Money } from '@/components/money';
import { Card, Skeleton } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

/** What the member has: spendable balance + money waiting in ChainPot, with one way in and one way out. */
export function BalanceCard() {
  const account = useChainPotAccount();
  const { data: wallet, isLoading } = useUSDCBalance(account.address);
  const { data: waitingRaw } = useWithdrawable(account.address);
  const waiting = (waitingRaw as bigint | undefined) ?? BigInt(0);
  const claim = useClaim();
  const [copied, setCopied] = useState(false);
  if (!account.isConnected) return null;

  const copy = async () => {
    if (!account.address) return;
    try {
      await navigator.clipboard.writeText(account.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('Your ChainPot account address', account.address);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 text-sm font-bold text-cp-muted">
        <Wallet className="h-4 w-4" aria-hidden="true" /> Your money
      </div>
      {isLoading ? (
        <Skeleton className="h-12 mt-3 w-48" />
      ) : (
        <p className="text-4xl font-black mt-2" aria-live="polite">
          <Money usdc={wallet ?? BigInt(0)} />
        </p>
      )}
      <p className="text-sm text-cp-muted mt-1">Available to pay into your circles</p>

      {waiting > BigInt(0) && (
        <div className="mt-4 p-4 rounded-2xl bg-cp-success-soft flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-sm font-bold text-cp-success">
            <Money usdc={waiting} /> from your circles is ready
          </p>
          <Button onClick={claim.claim} disabled={claim.isBusy}>
            {claim.isPending ? 'Confirming…' : claim.isConfirming ? 'Moving…' : 'Move to my balance'}
          </Button>
        </div>
      )}
      {claim.errorMessage && <p className="text-sm text-cp-danger mt-2">{claim.errorMessage}</p>}

      <div className="mt-5 flex flex-wrap gap-3">
        <Button variant="secondary" onClick={copy}>
          <Copy className="h-4 w-4" aria-hidden="true" />
          {copied ? 'Address copied' : 'Add money (copy my address)'}
        </Button>
        <a href="https://faucet.circle.com/" target="_blank" rel="noreferrer" className="inline-flex items-center min-h-11 px-2 text-sm font-bold underline underline-offset-4 text-cp-accent">
          Get test USDC
        </a>
      </div>
    </Card>
  );
}
