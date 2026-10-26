'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check } from 'lucide-react';
import { parseEventLogs, parseUnits } from 'viem';
import { useChainPotAccount } from '@/lib/aa/account';
import { apiFetch } from '@/lib/aa/api';
import { contractCall, useContractAction } from '@/hooks/useContractAction';
import { auctionContract, circleContract } from '@/hooks/useAuctionEngine';
import { registerMemberCall, useCanCreate, useIsRegistered } from '@/hooks/useMemberRegistry';
import { useMoney } from '@/components/money';
import { formatUsd } from '@/lib/currency';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import EngineSelector from './engine-selector';
import { buildInviteTree, normalizeAddresses, publishInvite, saveInvite } from '@/lib/invite';
import {
  MAX_MEMBERS, MIN_AMOUNT_PER_CYCLE, MIN_BIDDING_PHASE, MIN_MEMBERS, MIN_PAYMENT_WINDOW, formatDuration, potHref, type Engine,
} from '@/lib/pot';

const DAY = 86_400;
const USDC_DECIMALS = 6;
const EMOJI = ['🏠', '👨‍👩‍👧', '💼', '🎉', '🌱', '🕌', '🛕', '⭐'];

/** Frequency presets fill in every timing rule the contract checks, so most people never see them. */
const PRESETS = {
  weekly: { label: 'Weekly', every: 7 * DAY, pay: 2 * DAY, bid: 3 * DAY },
  biweekly: { label: 'Every 2 weeks', every: 14 * DAY, pay: 3 * DAY, bid: 4 * DAY },
  monthly: { label: 'Monthly', every: 30 * DAY, pay: 5 * DAY, bid: 6 * DAY },
  custom: { label: 'Custom', every: 0, pay: 0, bid: 0 },
} as const;
type PresetKey = keyof typeof PRESETS;

const STEPS = ['Name', 'Money', 'Receiver', 'Members', 'Review'] as const;

const field =
  'w-full min-h-11 px-4 py-3 rounded-xl border-2 border-cp-line bg-cp-surface text-cp-ink placeholder:text-cp-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent';
const days = (s: string) => {
  const n = Number(s);
  return Number.isFinite(n) && n > 0 ? Math.round(n * DAY) : NaN;
};

export function CreatePotForm({}: { isDarkMode: boolean }) {
  const router = useRouter();
  const account = useChainPotAccount();
  const money = useMoney();
  const { data: isRegistered, isLoading: regLoading } = useIsRegistered(account.address);
  const { data: canCreate } = useCanCreate(account.address);
  const create = useContractAction();

  const [step, setStep] = useState(0);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState(EMOJI[0]);
  const [amount, setAmount] = useState('');
  const [preset, setPreset] = useState<PresetKey>('monthly');
  const [custom, setCustom] = useState({ every: '30', pay: '5', bid: '6' });
  const [engine, setEngine] = useState<Engine>('circle');
  const [includeMe, setIncludeMe] = useState(true);
  const [addresses, setAddresses] = useState('');
  const [submitted, setSubmitted] = useState<{ engine: Engine; addresses: `0x${string}`[]; name: string; emoji: string } | null>(null);

  const roster = useMemo(() => {
    const entries = addresses.split(/[\s,;]+/);
    if (includeMe && account.address) entries.unshift(account.address);
    return normalizeAddresses(entries);
  }, [addresses, includeMe, account.address]);

  const schedule = preset === 'custom' ? { every: days(custom.every), pay: days(custom.pay), bid: days(custom.bid) } : PRESETS[preset];
  const amountUnits = useMemo(() => {
    try {
      return amount ? parseUnits(amount, USDC_DECIMALS) : BigInt(0);
    } catch {
      return BigInt(-1);
    }
  }, [amount]);
  const n = roster.valid.length;

  // Per-step validation, mirroring the contract's createPot checks.
  const errors: Record<number, string | undefined> = {
    0: name.trim().length < 1 ? 'Give your circle a name' : undefined,
    1: amountUnits < BigInt(0) ? 'Enter a valid amount'
      : amountUnits < MIN_AMOUNT_PER_CYCLE ? 'Minimum is $1 per round'
      : !(schedule.every > 0) ? 'Choose how often'
      : !(schedule.pay >= MIN_PAYMENT_WINDOW) ? 'Members need at least 1 day to pay'
      : schedule.pay >= schedule.every ? 'Time to pay must be shorter than the round'
      : undefined,
    2: engine === 'auction' && !(schedule.bid >= schedule.pay + MIN_BIDDING_PHASE) ? 'Bidding must close at least 1 hour after payments close — adjust the schedule'
      : engine === 'auction' && schedule.bid >= schedule.every ? 'Bidding must close before the round ends — adjust the schedule'
      : undefined,
    3: roster.invalid.length ? `Not valid addresses: ${roster.invalid.slice(0, 2).join(', ')}${roster.invalid.length > 2 ? '…' : ''}`
      : n < MIN_MEMBERS ? `A circle needs at least ${MIN_MEMBERS} members` : n > MAX_MEMBERS ? `At most ${MAX_MEMBERS} members` : undefined,
    4: isRegistered === true && canCreate === false ? 'Your account can’t create circles right now' : undefined,
  };
  const firstInvalid = [0, 1, 2, 3].find((i) => errors[i]);

  useEffect(() => {
    if (!create.isConfirmed || !create.receipt || !submitted) return;
    const abi = submitted.engine === 'circle' ? circleContract.abi : auctionContract.abi;
    const [created] = parseEventLogs({ abi, eventName: 'PotCreated', logs: create.receipt.logs });
    if (!created) return;
    const potId = created.args.potId;
    saveInvite(submitted.addresses);
    void (async () => {
      // Best effort: neither may block opening the new circle.
      await Promise.allSettled([
        publishInvite(submitted.engine, potId, submitted.addresses),
        account.getIdentityToken
          ? apiFetch(account, '/api/pots/meta', { method: 'PUT', body: JSON.stringify({ engine: submitted.engine, potId: potId.toString(), name: submitted.name, emoji: submitted.emoji }) })
          : Promise.resolve(),
      ]);
      router.push(`${potHref(submitted.engine, potId)}&created=1#invite`);
    })();
  }, [create.isConfirmed, create.receipt, submitted, router, account]);

  const submit = () => {
    if (create.isBusy || firstInvalid !== undefined || errors[4]) return;
    const list = roster.valid;
    const root = buildInviteTree(list).root as `0x${string}`;
    const args = [root, BigInt(list.length), amountUnits, BigInt(schedule.every), BigInt(schedule.pay)] as const;
    const createCall = engine === 'circle'
      ? contractCall({ ...circleContract, functionName: 'createPot', args })
      : contractCall({ ...auctionContract, functionName: 'createPot', args: [...args, BigInt(schedule.bid)] });
    setSubmitted({ engine, addresses: list, name: name.trim(), emoji });
    create.writeBatch(isRegistered === false ? [registerMemberCall(), createCall] : [createCall]);
  };

  const perRound = amountUnits > BigInt(0) && n >= MIN_MEMBERS ? amountUnits * BigInt(n) : undefined;
  // The review is a commitment, so show the exact dollar amount next to any local estimate.
  const exact = (v: bigint) => (money(v) === formatUsd(v) ? formatUsd(v) : `${money(v)} (${formatUsd(v)})`);
  const cadence = preset === 'custom' ? `every ${formatDuration(schedule.every || 0)}` : PRESETS[preset].label.toLowerCase();
  const summary = perRound !== undefined
    ? `${n} people each put in ${exact(amountUnits)} ${cadence}. Each round one person receives ${exact(perRound)}${engine === 'auction' ? ' (or less, if they bid to get it early)' : ''}. After ${n} rounds, everyone has received once.`
    : null;

  return (
    <div className="max-w-2xl mx-auto text-cp-ink">
      <h1 className="text-4xl md:text-5xl font-black mb-2">Start a circle</h1>
      <p className="text-cp-muted mb-6">Save together with people you trust. Takes about a minute.</p>

      <ol className="flex gap-2 mb-6" aria-label="Steps">
        {STEPS.map((label, i) => (
          <li key={label} className="flex-1">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              aria-current={i === step ? 'step' : undefined}
              aria-label={`Step ${i + 1}: ${label}`}
              className="w-full min-h-11 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent rounded-lg"
            >
              <span className={`block h-1.5 rounded-full ${i <= step ? 'bg-cp-ink' : 'bg-cp-line-soft'}`} />
              <span className={`hidden sm:block text-xs font-bold mt-1 ${i === step ? 'text-cp-ink' : 'text-cp-muted'}`}>{label}</span>
            </button>
          </li>
        ))}
      </ol>

      <Card className="p-6 sm:p-8">
        {step === 0 && (
          <div className="space-y-5">
            <div>
              <label htmlFor="circle-name" className="block text-lg font-bold mb-2">What should we call it?</label>
              <input id="circle-name" className={field} value={name} maxLength={40} autoComplete="off" placeholder="Family savings, Office circle…" onChange={(e) => setName(e.target.value)} />
              <p className="text-xs text-cp-muted mt-2">Members see this name.{account.mode === 'eoa' ? ' (Names are saved when you sign in with phone or email.)' : ''}</p>
            </div>
            <fieldset>
              <legend className="text-sm font-bold mb-2">Pick an icon</legend>
              <div className="flex flex-wrap gap-2">
                {EMOJI.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => setEmoji(e)}
                    aria-pressed={emoji === e}
                    aria-label={`Icon ${e}`}
                    className={`h-12 w-12 text-2xl rounded-2xl border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent ${emoji === e ? 'border-cp-ink bg-cp-accent-soft' : 'border-cp-line-soft'}`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <label htmlFor="amount" className="block text-lg font-bold mb-2">How much does each person put in per round?</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-cp-muted" aria-hidden="true">$</span>
                <input id="amount" className={`${field} pl-8`} inputMode="decimal" autoComplete="off" placeholder="50" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} aria-describedby="amount-hint" />
              </div>
              <p id="amount-hint" className="text-xs text-cp-muted mt-2">
                US dollars (USDC){amountUnits > BigInt(0) ? ` · ${money(amountUnits)}` : ''} · minimum $1
              </p>
            </div>
            <fieldset>
              <legend className="text-lg font-bold mb-2">How often?</legend>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(PRESETS) as PresetKey[]).map((k) => (
                  <label key={k} className={`min-h-11 px-4 py-3 rounded-2xl border-2 cursor-pointer font-bold focus-within:ring-2 focus-within:ring-cp-accent ${preset === k ? 'border-cp-ink bg-cp-accent-soft' : 'border-cp-line-soft'}`}>
                    <input type="radio" name="preset" value={k} checked={preset === k} onChange={() => setPreset(k)} className="sr-only" />
                    {PRESETS[k].label}
                    {k !== 'custom' && <span className="block text-xs font-normal text-cp-muted">{formatDuration(PRESETS[k].pay)} to pay each round</span>}
                  </label>
                ))}
              </div>
            </fieldset>
            {preset === 'custom' && (
              <div className="grid sm:grid-cols-3 gap-3">
                {([['every', 'Round length (days)'], ['pay', 'Days to pay'], ['bid', 'Bidding closes on day']] as const).map(([k, label]) => (
                  <div key={k}>
                    <label htmlFor={`custom-${k}`} className="block text-xs font-bold mb-1">{label}</label>
                    <input id={`custom-${k}`} className={field} inputMode="decimal" value={custom[k]} onChange={(e) => setCustom({ ...custom, [k]: e.target.value })} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-lg font-bold mb-1">How is each round&apos;s receiver chosen?</h2>
            <p className="text-sm text-cp-muted mb-4">You can&apos;t change this later.</p>
            <EngineSelector selected={engine} onSelect={setEngine} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold mb-1">Who&apos;s in?</h2>
              <p className="text-sm text-cp-muted">Only these accounts can join. The circle starts once everyone has joined.</p>
            </div>
            <label className="flex items-center gap-3 min-h-11 font-bold cursor-pointer">
              <input type="checkbox" checked={includeMe} onChange={(e) => setIncludeMe(e.target.checked)} className="h-5 w-5" />
              Include me
            </label>
            <div>
              <label htmlFor="members" className="block text-sm font-bold mb-2">Members&apos; ChainPot account addresses</label>
              <textarea id="members" rows={5} className={field} value={addresses} placeholder={'0x123…\n0x456…'} onChange={(e) => setAddresses(e.target.value)} aria-describedby="members-hint" />
              <p id="members-hint" className="text-xs text-cp-muted mt-2">
                One per line. Friends find theirs under their name → “Copy account address”. Inviting by phone number is coming soon.
              </p>
            </div>
            <p className="text-sm font-bold" aria-live="polite">
              {n} member{n === 1 ? '' : 's'}
              {roster.duplicates.length > 0 && <span className="font-normal text-cp-muted"> · {roster.duplicates.length} duplicate{roster.duplicates.length === 1 ? '' : 's'} removed</span>}
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-2xl font-black"><span aria-hidden="true">{emoji}</span> {name.trim()}</h2>
            {summary && <p className="text-lg">{summary}</p>}
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-2xl bg-cp-surface-muted"><dt className="text-cp-muted">Each round</dt><dd className="font-bold">{exact(amountUnits)} × {n}</dd></div>
              <div className="p-3 rounded-2xl bg-cp-surface-muted"><dt className="text-cp-muted">Time to pay</dt><dd className="font-bold">{formatDuration(schedule.pay || 0)}</dd></div>
              <div className="p-3 rounded-2xl bg-cp-surface-muted"><dt className="text-cp-muted">Receiver</dt><dd className="font-bold">{engine === 'circle' ? 'Fair draw' : 'Lowest bid'}</dd></div>
              <div className="p-3 rounded-2xl bg-cp-surface-muted"><dt className="text-cp-muted">Interest</dt><dd className="font-bold">Shared by members</dd></div>
            </dl>
            <p className="text-xs text-cp-muted">Money waiting to be paid out earns interest in Compound; 20% of that interest funds ChainPot&apos;s safety fund.</p>
          </div>
        )}

        {(errors[step] || (step === 4 && firstInvalid !== undefined)) && (
          <p role="alert" className="mt-4 text-sm font-bold text-cp-danger">{errors[step] ?? `Fix “${STEPS[firstInvalid!]}” first.`}</p>
        )}
        {create.errorMessage && <p role="alert" className="mt-4 text-sm font-bold text-cp-danger">{create.errorMessage}</p>}

        <div className="flex items-center justify-between gap-3 mt-8">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={create.isBusy}>
              <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Back
            </Button>
          ) : <span />}
          {step < STEPS.length - 1 ? (
            <Button onClick={() => !errors[step] && setStep(step + 1)} disabled={!!errors[step]}>Continue</Button>
          ) : !account.isConnected ? (
            <Button size="lg" onClick={account.login}>Sign in to create</Button>
          ) : (
            <Button size="lg" onClick={submit} disabled={regLoading || create.isBusy || create.isConfirmed || firstInvalid !== undefined || !!errors[4]}>
              {create.isPending ? 'Confirming…' : create.isConfirming ? 'Creating…' : create.isConfirmed ? <><Check className="h-5 w-5" aria-hidden="true" /> Opening…</> : 'Create circle'}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
