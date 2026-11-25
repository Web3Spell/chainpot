'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useChainPotAccount } from '@/lib/aa/account';
import { apiFetch } from '@/lib/aa/api';
import { LEGAL_PATHS, TERMS_VERSION } from '@/lib/legal';

const KEY = 'chainpot:terms';
const RECORDED_KEY = 'chainpot:terms-recorded';
const EVENT = 'chainpot:terms-change';

interface Stored {
  version: string;
  acceptedAt: string;
}

function readStored(): Stored | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Stored) : null;
  } catch {
    return null;
  }
}

/** Snapshot is a primitive so React compares by value: the accepted version, or ''. */
function snapshot(): string {
  return readStored()?.version ?? '';
}

function subscribe(cb: () => void) {
  window.addEventListener('storage', cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener('storage', cb);
    window.removeEventListener(EVENT, cb);
  };
}

function recordedFor(address: string): boolean {
  try {
    const list = JSON.parse(localStorage.getItem(RECORDED_KEY) ?? '[]') as string[];
    return list.includes(`${address.toLowerCase()}@${TERMS_VERSION}`);
  } catch {
    return false;
  }
}

function markRecorded(address: string) {
  try {
    const list = JSON.parse(localStorage.getItem(RECORDED_KEY) ?? '[]') as string[];
    list.push(`${address.toLowerCase()}@${TERMS_VERSION}`);
    localStorage.setItem(RECORDED_KEY, JSON.stringify(Array.from(new Set(list))));
  } catch {
    // Storage blocked: we'll simply record again next visit; the server keeps the first record.
  }
}

/**
 * Blocks the app until the visitor accepts the current Terms, Risk Disclosure and Privacy Policy.
 * Acceptance is kept on the device and, once the person is signed in, recorded on our server
 * against their account so there is durable proof of consent. The legal pages themselves stay open.
 */
export function TermsGate() {
  const pathname = usePathname();
  const account = useChainPotAccount();
  const accepted = useSyncExternalStore(subscribe, snapshot, () => TERMS_VERSION); // SSR: don't flash
  const [adult, setAdult] = useState(false);
  const [risk, setRisk] = useState(false);

  const address = account.isConnected ? account.address : undefined;
  const isCurrent = accepted === TERMS_VERSION;

  // Once accepted and signed in, send the acceptance to the server (once per account + version).
  useEffect(() => {
    if (!isCurrent || !address || recordedFor(address)) return;
    const stored = readStored();
    let cancelled = false;
    apiFetch(account, '/api/terms', {
      method: 'POST',
      body: JSON.stringify({ version: TERMS_VERSION, acceptedAt: stored?.acceptedAt }),
    })
      .then(() => {
        if (!cancelled) markRecorded(address);
      })
      .catch(() => {
        // Not fatal: retried on the next page load.
      });
    return () => {
      cancelled = true;
    };
    // account object identity changes often; address + version are what matter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCurrent, address]);

  if (isCurrent || LEGAL_PATHS.includes(pathname)) return null;

  const accept = () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ version: TERMS_VERSION, acceptedAt: new Date().toISOString() } satisfies Stored));
    } catch {
      // Storage blocked: the gate will ask again next visit.
    }
    window.dispatchEvent(new Event(EVENT));
  };

  const updated = accepted !== '' && accepted !== TERMS_VERSION;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm md:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-title"
    >
      <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 text-black shadow-2xl md:max-w-lg md:rounded-3xl md:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-700">{updated ? 'We updated our terms' : 'Before you start'}</p>
        <h2 id="terms-title" className="mt-2 text-2xl font-black">
          Please read and accept
        </h2>
        <p className="mt-2 text-sm text-gray-600">ChainPot is a tool for saving with people you trust. A few things you need to know:</p>

        <ul className="mt-4 space-y-2.5 text-sm">
          {[
            ['We never hold your money.', 'Circles run on smart contracts. We can’t reverse, refund or redirect any payment.'],
            ['Miss a payment, lose your place.', 'No grace period, no refund of what you already paid, no rejoining that circle.'],
            ['Members can stop paying.', 'Someone who already got the pot can stop paying and keep it. ChainPot can’t force them to pay or cover the loss.'],
            ['No guarantees.', 'Interest is variable and not promised. Smart contracts and the services we use can fail.'],
            ['Not advice, not a bank or chit fund operator.', 'You follow the laws where you live and handle your own taxes.'],
          ].map(([strong, rest]) => (
            <li key={strong} className="flex gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-black" aria-hidden />
              <span>
                <strong>{strong}</strong> <span className="text-gray-600">{rest}</span>
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-5 space-y-3 rounded-2xl bg-gray-100 p-4 text-sm">
          <label className="flex cursor-pointer gap-3">
            <input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-black" />
            <span>
              I am 18 or older and I agree to the{' '}
              <Link href="/terms" target="_blank" className="font-bold underline">Terms of Service</Link> and{' '}
              <Link href="/privacy" target="_blank" className="font-bold underline">Privacy Policy</Link>.
            </span>
          </label>
          <label className="flex cursor-pointer gap-3">
            <input type="checkbox" checked={risk} onChange={(e) => setRisk(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-black" />
            <span>
              I have read the <Link href="/risk" target="_blank" className="font-bold underline">Risk Disclosure</Link> and
              understand I can lose money I contribute, including if other members don&apos;t pay.
            </span>
          </label>
        </div>

        <button
          onClick={accept}
          disabled={!adult || !risk}
          className="mt-5 min-h-12 w-full rounded-full bg-black font-bold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600 focus-visible:ring-offset-2"
        >
          Agree and continue
        </button>
        <p className="mt-3 text-center text-[11px] text-gray-500">
          If you don&apos;t agree, please don&apos;t use ChainPot. Your acceptance is saved with your account when you sign in.
        </p>
      </div>
    </div>,
    document.body,
  );
}
