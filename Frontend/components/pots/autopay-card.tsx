'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useChainPotAccount } from '@/lib/aa/account';
import { apiFetch } from '@/lib/aa/api';
import { useConfirm } from '@/components/aa/confirm-sheet';
import { Money } from '@/components/money';
import { useMemberState, usePot } from '@/hooks/useRoscaEngine';
import { PotStatus, formatDateTime, type Engine } from '@/lib/pot';

interface Mandate {
  id: string;
  engine: Engine;
  potId: string;
  status: 'pending' | 'active' | 'revoked';
  sessionKeyAddress: string;
  amountPerCycle: string;
  validUntil: number;
  lastPaidCycle: number | null;
  lastError: string | null;
}

interface GrantResponse {
  mandate: Mandate;
  scope: { engine: Engine; potId: string; amountPerCycle: string; validUntil: number };
}

/**
 * Opt-in autopay for one pot. The member signs an on-chain permission that lets ChainPot pay exactly
 * this pot's installment each round — nothing else — until the pot ends. Off = key destroyed.
 */
export function AutopayCard({ potId, engine, isDarkMode }: { potId: bigint; engine: Engine; isDarkMode: boolean }) {
  const account = useChainPotAccount();
  const confirm = useConfirm();
  const queryClient = useQueryClient();
  const { pot } = usePot(engine, potId);
  const member = useMemberState(engine, potId, pot?.currentCycle ?? 0, account.address);
  const [busy, setBusy] = useState<'on' | 'off' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const available = !!account.grantAutopay && account.isConnected && member.isMember && !member.defaulted && !!pot && pot.status !== PotStatus.Completed;
  const mandates = useQuery({
    queryKey: ['autopay', account.address],
    queryFn: () => apiFetch<Mandate[]>(account, '/api/autopay'),
    enabled: available,
    refetchInterval: 60_000,
  });
  if (!available || !pot) return null;

  const mine = mandates.data?.find((m) => m.engine === engine && m.potId === potId.toString() && m.status === 'active');
  const card = `p-6 rounded-3xl border-3 border-cp-line mb-8 bg-cp-surface text-cp-ink`;
  const muted = 'text-cp-muted';

  const turnOn = async () => {
    setError(null);
    const ok = await confirm({
      steps: [
        { text: `Let ChainPot pay this pot's installment for you each round`, amount: pot.amountPerCycle },
        { text: 'Only this pot, only to the ChainPot Vault, never more than one installment at a time. Enforced by your account itself.' },
        { text: 'Stops automatically when the pot ends. Turn it off anytime.' },
      ],
      sponsored: account.sponsored,
      passkeyProtected: account.passkeyProtected,
    });
    if (!ok) return;
    setBusy('on');
    try {
      const grant = await apiFetch<GrantResponse>(account, '/api/autopay', { method: 'POST', body: JSON.stringify({ engine, potId: potId.toString() }) });
      const serialized = await account.grantAutopay!(
        { engine, potId, amountPerCycle: BigInt(grant.scope.amountPerCycle), validUntil: grant.scope.validUntil },
        grant.mandate.sessionKeyAddress as `0x${string}`,
      );
      await apiFetch(account, `/api/autopay/${grant.mandate.id}/activate`, { method: 'POST', body: JSON.stringify({ serialized }) });
      await queryClient.invalidateQueries({ queryKey: ['autopay'] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const turnOff = async () => {
    if (!mine) return;
    setError(null);
    setBusy('off');
    try {
      await apiFetch(account, `/api/autopay/${mine.id}`, { method: 'DELETE' });
      await queryClient.invalidateQueries({ queryKey: ['autopay'] });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className={card}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold">{mine ? 'Autopay is on ✓' : 'Never miss a payment'}</h2>
          <p className={`text-sm mt-1 ${muted}`}>
            {mine ? (
              <>We pay <Money usdc={BigInt(mine.amountPerCycle)} /> from your balance as soon as each round opens, until {formatDateTime(mine.validUntil)}.
                {mine.lastPaidCycle ? ` Last paid: round ${mine.lastPaidCycle}.` : ''}
                {mine.lastError ? ' The last attempt failed — make sure your balance covers the next payment.' : ''}</>
            ) : (
              <>Turn on autopay and we&apos;ll pay <Money usdc={pot.amountPerCycle} /> each round for you. You stay in control: it can only pay this pot.</>
            )}
          </p>
        </div>
        <button
          onClick={mine ? turnOff : turnOn}
          disabled={!!busy || mandates.isLoading}
          className={`px-6 py-3 rounded-full font-bold whitespace-nowrap disabled:opacity-50 ${mine ? `border-3 ${isDarkMode ? 'border-white/30' : 'border-black'}` : isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
        >
          {busy === 'on' ? 'Turning on…' : busy === 'off' ? 'Turning off…' : mine ? 'Turn off autopay' : 'Turn on autopay'}
        </button>
      </div>
      {error && <p className="mt-3 text-sm font-medium text-cp-danger">{error}</p>}
    </section>
  );
}
