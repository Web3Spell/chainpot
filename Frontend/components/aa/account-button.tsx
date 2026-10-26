'use client';

import { useEffect, useRef, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { PRIVY_APP_ID } from '@/config/wagmi';
import { useChainPotAccount } from '@/lib/aa/account';
import { shortAddress } from '@/lib/pot';

/**
 * Sign-in control. With Privy it's "Sign in" → phone/email/Google/Apple/passkey, and a small menu
 * once signed in (no wallet jargon). Without Privy it's RainbowKit's wallet button.
 */
export function AccountButton({ isDarkMode, compact }: { isDarkMode?: boolean; compact?: boolean }) {
  // RainbowKit's button only exists inside RainbowKitProvider, i.e. when Privy isn't configured.
  if (!PRIVY_APP_ID) return <ConnectButton accountStatus={compact ? 'avatar' : 'full'} chainStatus="icon" showBalance={false} />;
  return <PrivyAccountButton isDarkMode={isDarkMode} />;
}

function PrivyAccountButton({ isDarkMode }: { isDarkMode?: boolean }) {
  const account = useChainPotAccount();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const solid = isDarkMode ? 'bg-white text-black' : 'bg-black text-white';
  if (!account.ready) return <span className={`px-5 py-2 rounded-full text-sm font-bold opacity-50 ${solid}`}>…</span>;
  if (!account.isConnected) {
    return (
      <button onClick={account.login} className={`px-5 py-2 rounded-full text-sm font-bold ${solid}`}>
        Sign in
      </button>
    );
  }

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
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 ${solid}`} aria-haspopup="menu" aria-expanded={open}>
        <span className="w-2 h-2 rounded-full bg-green-500" />
        {account.label ?? shortAddress(account.address)}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 mt-2 w-72 rounded-2xl bg-white text-black shadow-2xl border border-black/10 p-2 z-50">
          <div className="px-3 py-2 text-xs text-gray-500">
            {account.mode === 'smart' ? 'Your ChainPot account' : 'Connected wallet'}
            <div className="font-mono text-black text-[11px] break-all mt-1">{account.address}</div>
          </div>
          <button role="menuitem" onClick={copy} className="w-full text-left px-3 py-2 rounded-xl hover:bg-black/5 text-sm font-medium">
            {copied ? 'Copied ✓' : 'Copy account address (to receive USDC)'}
          </button>
          {account.enrollPasskey && (
            <button role="menuitem" onClick={() => { setOpen(false); account.enrollPasskey?.(); }} className="w-full text-left px-3 py-2 rounded-xl hover:bg-black/5 text-sm font-medium">
              {account.passkeyProtected ? '✓ Protected with Face ID / passkey' : 'Protect payments with Face ID / passkey'}
            </button>
          )}
          <button role="menuitem" onClick={() => { setOpen(false); account.logout(); }} className="w-full text-left px-3 py-2 rounded-xl hover:bg-black/5 text-sm font-medium text-red-600">
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
