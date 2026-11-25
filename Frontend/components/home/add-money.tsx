'use client';

import { useMemo, useState } from 'react';
import { IS_MAINNET as APP_ON_MAINNET } from '@/config/network';
import { createPortal } from 'react-dom';
import { Copy } from 'lucide-react';
import { useChainPotAccount } from '@/lib/aa/account';
import { useCurrency } from '@/providers/currency-provider';
import { buildOnrampUrl, fiatForOnramp } from '@/lib/onramp';
import { Button } from '@/components/ui/button';
import { clashDisplaySemibold } from '@/app/ui/fonts';

// Buying real USDC only makes sense when the app itself runs on mainnet.
const IS_MAINNET = APP_ON_MAINNET && (process.env.NEXT_PUBLIC_ONRAMP_NETWORK ?? 'base') === 'base';

/** Local amounts matching roughly $10 / $25 / $50, so presets feel native in any currency. */
function presets(rate: number | undefined): number[] {
  const usd = [10, 25, 50];
  if (!rate) return usd;
  return usd.map((u) => {
    const local = u * rate;
    const step = local >= 1000 ? 500 : local >= 100 ? 50 : 5;
    return Math.max(step, Math.round(local / step) * step);
  });
}

/**
 * Buy USDC with local money (card / bank / UPI) via the hosted on-ramp. The destination is the
 * member's own ChainPot account, locked. Funds settle on mainnet only.
 */
export function AddMoneySheet({ onClose }: { onClose: () => void }) {
  const account = useChainPotAccount();
  const { currency, rate } = useCurrency();
  const fiat = fiatForOnramp(currency);
  const options = useMemo(() => presets(rate), [rate]);
  const [amount, setAmount] = useState<number>(options[1]); // default ~$25 equiv
  const [copied, setCopied] = useState(false);

  const usdEstimate = rate && fiat !== 'USD' ? amount / rate : amount;
  const symbol = (() => {
    try {
      return (0).toLocaleString(undefined, { style: 'currency', currency: fiat }).replace(/[\d.,\s]/g, '');
    } catch {
      return '';
    }
  })();

  const start = () => {
    const url = buildOnrampUrl({
      address: account.address!,
      fiatCurrency: currency,
      fiatAmount: amount,
      redirectUrl: typeof window !== 'undefined' ? `${window.location.origin}/dashboard?funded=1` : undefined,
    });
    if (url) {
      window.open(url, '_blank', 'noopener,noreferrer');
      onClose();
    }
  };

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

  return createPortal(
    <div
      className="fixed inset-0 z-[95] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="addmoney-title"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="w-full md:max-w-md bg-cp-surface text-cp-ink rounded-t-3xl md:rounded-3xl border-3 border-cp-line p-6 md:p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 id="addmoney-title" className={`text-2xl ${clashDisplaySemibold.className}`}>Add money</h2>
          <button
            type="button"
            onClick={onClose}
            className="h-11 px-3 -mr-2 text-sm font-bold text-cp-muted hover:bg-cp-line-soft rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent"
          >
            Close
          </button>
        </div>

        <p className="text-sm text-cp-muted mb-5">
          Pay with card, bank or UPI. The money lands in your ChainPot account as USDC, usually within a few minutes.
        </p>

        <label htmlFor="addmoney-amount" className="block text-sm font-bold mb-2">
          How much? <span className="text-cp-muted font-medium">({fiat})</span>
        </label>
        <div className="flex items-center gap-2 rounded-2xl border-3 border-cp-line px-4 py-3 mb-3">
          <span className="text-lg font-bold text-cp-muted">{symbol || fiat}</span>
          <input
            id="addmoney-amount"
            type="number"
            inputMode="decimal"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value)))}
            className="w-full bg-transparent text-2xl font-black outline-none"
          />
        </div>

        <div className="flex gap-2 mb-4" role="group" aria-label="Quick amounts">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setAmount(o)}
              aria-pressed={amount === o}
              className={`flex-1 min-h-11 rounded-full text-sm font-bold border-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent ${
                amount === o ? 'bg-cp-ink text-cp-ink-inverse border-cp-ink' : 'border-cp-line text-cp-ink hover:bg-cp-line-soft'
              }`}
            >
              {symbol}{o.toLocaleString()}
            </button>
          ))}
        </div>

        <p className="text-sm text-cp-muted mb-5" aria-live="polite">
          You&apos;ll receive about <span className="font-bold text-cp-ink">${usdEstimate.toFixed(2)}</span> in USDC.
          {fiat === 'USD' ? '' : ' Final amount depends on the live rate and fees.'}
        </p>

        {!IS_MAINNET && (
          <p className="text-xs text-cp-warn bg-cp-warn-soft rounded-xl px-3 py-2 mb-4">
            Test network: buying real money is disabled. Use <a className="underline" href="https://faucet.circle.com/" target="_blank" rel="noreferrer">test USDC</a> instead.
          </p>
        )}

        <Button size="lg" className="w-full" onClick={start} disabled={!IS_MAINNET || amount <= 0}>
          Continue to payment
        </Button>
        <button
          type="button"
          onClick={copy}
          className="w-full mt-3 min-h-11 inline-flex items-center justify-center gap-2 text-sm font-bold text-cp-muted hover:text-cp-ink rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent"
        >
          <Copy className="h-4 w-4" aria-hidden="true" /> {copied ? 'Address copied ✓' : 'Or copy my account address'}
        </button>
        <p className="text-[11px] text-cp-muted mt-3 text-center">Payments handled by Transak. ID check may be required.</p>
      </div>
    </div>,
    document.body,
  );
}
