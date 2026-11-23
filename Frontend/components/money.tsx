'use client';

import { useCurrency } from '@/providers/currency-provider';
import { formatLocal, formatUsd } from '@/lib/currency';

/**
 * An on-chain USDC amount. Shows the user's local currency as an estimate with the exact dollar
 * amount beside it, e.g. "≈ ₹4,180 ($50.00)"; just "$50.00" for USD users or while rates load.
 */
export function Money({ usdc, className }: { usdc: bigint; className?: string }) {
  const { currency, rate } = useCurrency();
  const usd = formatUsd(usdc);
  const local = formatLocal(usdc, currency, rate);
  return (
    <span className={className} title={local ? 'Converted at today’s rate. Amounts on ChainPot are fixed in US dollars (USDC).' : undefined}>
      {local ? <>≈ {local} <span className="opacity-70">({usd})</span></> : usd}
    </span>
  );
}

/** String form of <Money> for sentences: "≈ ₹4,180" (local) or "$50.00" (USD users). */
export function useMoney() {
  const { currency, rate } = useCurrency();
  return (usdc: bigint) => {
    const local = formatLocal(usdc, currency, rate);
    return local ? `≈ ${local}` : formatUsd(usdc);
  };
}
