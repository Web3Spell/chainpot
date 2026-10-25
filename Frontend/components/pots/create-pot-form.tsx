'use client';

import { useEffect, useMemo, useState, memo, type ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAccount } from 'wagmi';
import { parseEventLogs, parseUnits } from 'viem';
import { useContractAction } from '@/hooks/useContractAction';
import { auctionContract, circleContract } from '@/hooks/useAuctionEngine';
import { useCanCreate, useIsRegistered, useRegisterMember } from '@/hooks/useMemberRegistry';
import EngineSelector from './engine-selector';
import { buildInviteTree, normalizeAddresses, saveInvite } from '@/lib/invite';
import {
  MAX_MEMBERS,
  MIN_AMOUNT_PER_CYCLE,
  MIN_BIDDING_PHASE,
  MIN_MEMBERS,
  MIN_PAYMENT_WINDOW,
  formatDuration,
  potHref,
  type Engine,
} from '@/lib/pot';

interface CreatePotFormProps {
  isDarkMode: boolean;
}

interface FormData {
  amountPerCycle: string;
  cycleDuration: string;
  paymentWindow: string;
  biddingWindow: string;
  memberAddresses: string;
}

type Errors = Partial<Record<keyof FormData, string>>;

interface FormInputProps {
  label: string;
  hint?: string;
  name: keyof FormData;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  error?: string;
  isDarkMode: boolean;
}

const FormInput = memo(({ label, hint, name, type = 'text', placeholder, value, onChange, error, isDarkMode }: FormInputProps) => {
  const cls = `px-4 py-3 rounded-lg border-2 transition-colors duration-300 ${
    error ? (isDarkMode ? 'border-red-500/50 bg-red-500/10' : 'border-red-500 bg-red-50')
          : (isDarkMode ? ' text-white bg-white/5' : 'bg-white border-black text-black hover:bg-black/5')
  } focus:outline-none`;
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={name} className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-black'}`}>{label}</label>
      {type === 'textarea' ? (
        <textarea id={name} name={name} value={value} onChange={onChange} placeholder={placeholder} rows={5} className={cls} />
      ) : (
        <input id={name} type={type} step="any" min="0" name={name} value={value} onChange={onChange} placeholder={placeholder} className={cls} />
      )}
      {hint && !error && <p className="text-xs text-gray-500">{hint}</p>}
      {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
    </div>
  );
});
FormInput.displayName = 'FormInput';

const DAY = 86_400;
const USDC_DECIMALS = 6;

function toSeconds(days: string) {
  const n = Number(days);
  return Number.isFinite(n) ? Math.round(n * DAY) : NaN;
}

export function CreatePotForm({ isDarkMode }: CreatePotFormProps) {
  const router = useRouter();
  const { address } = useAccount();

  const [engine, setEngine] = useState<Engine>('circle');
  const [includeMe, setIncludeMe] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    amountPerCycle: '',
    cycleDuration: '7',
    paymentWindow: '2',
    biddingWindow: '3',
    memberAddresses: '',
  });
  const [errors, setErrors] = useState<Errors>({});

  const { data: isRegistered, isLoading: regLoading } = useIsRegistered(address);
  const { data: canCreate } = useCanCreate(address);
  const register = useRegisterMember();
  const create = useContractAction();

  // Final, deduplicated roster: the contract's memberCount must equal the invite-list size exactly.
  const roster = useMemo(() => {
    const entries = formData.memberAddresses.split(/[\s,;]+/);
    if (includeMe && address) entries.unshift(address);
    return normalizeAddresses(entries);
  }, [formData.memberAddresses, includeMe, address]);

  const [submitted, setSubmitted] = useState<{ engine: Engine; addresses: `0x${string}`[] } | null>(null);

  useEffect(() => {
    if (!create.isConfirmed || !create.receipt || !submitted) return;
    const abi = submitted.engine === 'circle' ? circleContract.abi : auctionContract.abi;
    const [created] = parseEventLogs({ abi, eventName: 'PotCreated', logs: create.receipt.logs });
    if (!created) return;
    saveInvite(submitted.addresses);
    router.push(`${potHref(submitted.engine, created.args.potId)}&created=1`);
  }, [create.isConfirmed, create.receipt, submitted, router]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof FormData]) setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = (): Errors => {
    const e: Errors = {};
    let amount = BigInt(0);
    try {
      amount = parseUnits(formData.amountPerCycle || '0', USDC_DECIMALS);
    } catch {
      e.amountPerCycle = 'Enter a valid amount';
    }
    if (!e.amountPerCycle && amount < MIN_AMOUNT_PER_CYCLE) e.amountPerCycle = 'Minimum is 1 USDC per round';

    const cycle = toSeconds(formData.cycleDuration);
    const pay = toSeconds(formData.paymentWindow);
    const bid = toSeconds(formData.biddingWindow);
    if (!(cycle > 0)) e.cycleDuration = 'Enter how long each round lasts';
    if (!(pay >= MIN_PAYMENT_WINDOW)) e.paymentWindow = 'Members need at least 1 day to pay';
    else if (cycle > 0 && pay >= cycle) e.paymentWindow = 'Must be shorter than the round length';
    if (engine === 'auction') {
      if (!(bid >= pay + MIN_BIDDING_PHASE)) e.biddingWindow = 'Must be at least 1 hour after the payment deadline';
      else if (cycle > 0 && bid >= cycle) e.biddingWindow = 'Must close before the round ends';
    }

    const n = roster.valid.length;
    if (roster.invalid.length) e.memberAddresses = `Not valid addresses: ${roster.invalid.slice(0, 3).join(', ')}${roster.invalid.length > 3 ? '…' : ''}`;
    else if (n < MIN_MEMBERS) e.memberAddresses = `A pot needs at least ${MIN_MEMBERS} members`;
    else if (n > MAX_MEMBERS) e.memberAddresses = `A pot can have at most ${MAX_MEMBERS} members`;
    return e;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (create.isBusy) return;
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length) return;

    const addresses = roster.valid;
    const root = buildInviteTree(addresses).root as `0x${string}`;
    const amount = parseUnits(formData.amountPerCycle, USDC_DECIMALS);
    const n = BigInt(addresses.length);
    const cycle = BigInt(toSeconds(formData.cycleDuration));
    const pay = BigInt(toSeconds(formData.paymentWindow));
    setSubmitted({ engine, addresses });

    if (engine === 'circle') {
      create.write({ ...circleContract, functionName: 'createPot', args: [root, n, amount, cycle, pay] });
    } else {
      const bid = BigInt(toSeconds(formData.biddingWindow));
      create.write({ ...auctionContract, functionName: 'createPot', args: [root, n, amount, cycle, pay, bid] });
    }
  };

  const n = roster.valid.length;
  const amountNum = Number(formData.amountPerCycle) || 0;
  const cycleSecs = toSeconds(formData.cycleDuration) || 0;
  const summary = n >= MIN_MEMBERS && amountNum > 0 && cycleSecs > 0
    ? `${n} members each put in $${amountNum.toLocaleString()} every ${formatDuration(cycleSecs)} for ${n} rounds. Each round one member receives about $${(amountNum * n).toLocaleString()}${engine === 'auction' ? ' (less if they bid for it early)' : ''}.`
    : null;

  const muted = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const needsRegistration = !!address && !regLoading && isRegistered === false;
  const blocked = !!address && isRegistered === true && canCreate === false;

  return (
    <div className="mb-12">
      <div className="mb-8">
        <h1 className="text-5xl md:text-6xl font-black mb-4">
          <span className="block underline decoration-2 underline-offset-4">Create Your Pot</span>
        </h1>
        <p className={`text-lg ${muted}`}>Set up a rotating savings pot and invite the people you trust.</p>
      </div>

      {!address && (
        <div className="mb-6 p-4 rounded-xl border-2 border-yellow-500/50 bg-yellow-500/10 text-sm font-medium">
          Connect your wallet to create a pot.
        </div>
      )}

      {needsRegistration && (
        <div className="mb-6 p-4 rounded-xl border-2 border-purple-500/50 bg-purple-500/10 flex flex-col md:flex-row md:items-center gap-3 justify-between">
          <p className="text-sm font-medium">One-time step: register your account before creating a pot.</p>
          <button type="button" onClick={register.registerMember} disabled={register.isBusy} className="px-5 py-2 rounded-full font-bold bg-black text-white disabled:opacity-50">
            {register.isPending ? 'Confirm in wallet…' : register.isConfirming ? 'Registering…' : 'Register account'}
          </button>
          {register.errorMessage && <p className="text-xs text-red-500">{register.errorMessage}</p>}
        </div>
      )}

      {blocked && (
        <div className="mb-6 p-4 rounded-xl border-2 border-red-500/50 bg-red-500/10 text-sm font-medium">
          Your account can&apos;t create pots right now (reputation below the creation threshold or blacklisted).
        </div>
      )}

      <form onSubmit={handleSubmit} className={`p-8 rounded-2xl border-3 border-black transition-colors duration-300 ${isDarkMode ? ' text-white bg-white/5' : 'bg-white border-black text-black'}`}>
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">1. How is each round&apos;s receiver chosen?</h2>
          <p className={`text-sm mb-6 ${muted}`}>You can&apos;t change this after the pot is created.</p>
          <EngineSelector selected={engine} onSelect={setEngine} />
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">2. Who&apos;s in?</h2>
          <p className={`text-sm mb-4 ${muted}`}>Only these addresses will be able to join. The pot starts once all of them have joined.</p>
          <label className="flex items-center gap-2 mb-4 text-sm font-bold cursor-pointer">
            <input type="checkbox" checked={includeMe} onChange={(e) => setIncludeMe(e.target.checked)} className="w-4 h-4" />
            Include me as a member
          </label>
          <FormInput
            label="Member wallet addresses"
            hint="One per line, or separated by commas."
            name="memberAddresses"
            type="textarea"
            placeholder={'0x123…\n0x456…'}
            value={formData.memberAddresses}
            onChange={handleChange}
            error={errors.memberAddresses}
            isDarkMode={isDarkMode}
          />
          <p className="text-sm mt-2 font-semibold">
            {n} member{n === 1 ? '' : 's'}
            {roster.duplicates.length > 0 && <span className={`font-normal ${muted}`}> · {roster.duplicates.length} duplicate{roster.duplicates.length === 1 ? '' : 's'} removed</span>}
            {roster.invalid.length > 0 && <span className="font-normal text-red-500"> · {roster.invalid.length} invalid</span>}
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-6">3. Money and schedule</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormInput label="Each member pays per round (USDC)" hint="Minimum 1 USDC." name="amountPerCycle" type="number" placeholder="50" value={formData.amountPerCycle} onChange={handleChange} error={errors.amountPerCycle} isDarkMode={isDarkMode} />
            <FormInput label="Round length (days)" hint="A new round can start this often." name="cycleDuration" type="number" placeholder="7" value={formData.cycleDuration} onChange={handleChange} error={errors.cycleDuration} isDarkMode={isDarkMode} />
            <FormInput label="Time to pay (days from round start)" hint="At least 1 day. Members who don't pay in time are marked as missed." name="paymentWindow" type="number" placeholder="2" value={formData.paymentWindow} onChange={handleChange} error={errors.paymentWindow} isDarkMode={isDarkMode} />
            {engine === 'auction' && (
              <FormInput label="Bidding closes (days from round start)" hint="Bidding opens when payments close and must last at least 1 hour." name="biddingWindow" type="number" placeholder="3" value={formData.biddingWindow} onChange={handleChange} error={errors.biddingWindow} isDarkMode={isDarkMode} />
            )}
          </div>
        </div>

        {summary && (
          <div className={`mb-6 p-4 rounded-xl ${isDarkMode ? 'bg-white/10' : 'bg-purple-50'}`}>
            <p className="text-sm font-bold mb-1">Summary</p>
            <p className="text-sm">{summary} Money waiting to be paid out earns interest in Compound.</p>
          </div>
        )}

        {create.errorMessage && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/10 border-2 border-red-500/50">
            <p className="text-sm font-bold text-red-500">{create.errorMessage}</p>
          </div>
        )}

        <div className="flex gap-4 pt-8 border-t border-white/10">
          <button
            type="submit"
            disabled={!address || needsRegistration || blocked || create.isBusy || create.isConfirmed}
            className={`flex-1 px-8 py-3 rounded-full font-bold text-lg transition-all duration-300 disabled:opacity-50 ${isDarkMode ? 'bg-white text-black' : 'bg-black text-white'}`}
          >
            {create.isPending ? 'Confirm in wallet…' : create.isConfirming ? 'Creating…' : create.isConfirmed ? 'Opening your pot…' : 'Create Pot'}
          </button>
          <Link href="/pots" className={`flex-1 px-8 py-3 rounded-full font-bold text-lg transition-all text-center border-3 ${isDarkMode ? 'border-white/30 text-white' : 'border-black text-black'}`}>Cancel</Link>
        </div>
      </form>
    </div>
  );
}
