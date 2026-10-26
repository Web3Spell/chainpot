'use client';

import { Money } from '@/components/money';
import { formatDuration } from '@/lib/pot';
import type { Draft } from '@/hooks/useDrafts';

/** "5 people each put in ≈ ₹4,200 ($50.00) every 30d. Each round one person receives …" */
export function DraftTerms({ d }: { d: Draft }) {
  const amount = BigInt(d.amountPerCycle);
  return (
    <p className="text-lg">
      {d.memberCount} people each put in <Money usdc={amount} /> every {formatDuration(d.cycleDuration)}. Each round one person receives{' '}
      <Money usdc={amount * BigInt(d.memberCount)} />
      {d.engine === 'auction' ? ' — or less, if they bid to get it early' : ', picked by a fair draw'}. Members have {formatDuration(d.paymentWindow)} to pay each round.
    </p>
  );
}
