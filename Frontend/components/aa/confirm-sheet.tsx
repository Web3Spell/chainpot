'use client';

import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Money } from '@/components/money';
import type { CallDescription } from '@/lib/aa/describe';

export interface ConfirmRequest {
  steps: CallDescription[];
  sponsored: boolean;
  passkeyProtected: boolean;
}

type Confirm = (req: ConfirmRequest) => Promise<boolean>;

const ConfirmContext = createContext<Confirm | null>(null);

export function useConfirm(): Confirm {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used inside ConfirmProvider');
  return ctx;
}

/**
 * Plain-language review of exactly what will be signed. In smart-account mode the embedded wallet's
 * own UI is turned off, so this sheet is the user's single, human-readable confirmation step.
 */
export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [req, setReq] = useState<ConfirmRequest | null>(null);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const confirm = useCallback<Confirm>((r) => {
    resolver.current?.(false); // a newer request supersedes an open one
    setReq(r);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (ok: boolean) => {
    resolver.current?.(ok);
    resolver.current = null;
    setReq(null);
  };

  const total = req?.steps.reduce((sum, s) => sum + (s.amount ?? BigInt(0)), BigInt(0)) ?? BigInt(0);
  // An approval and the payment it funds describe the same money, so don't add them twice.
  const outgoing = req?.steps.find((s) => s.text.startsWith('Pay'))?.amount ?? (total > BigInt(0) ? total : undefined);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {req && (
        <div className="fixed inset-0 z-[100] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
          <div className="w-full md:max-w-md bg-white text-black rounded-t-3xl md:rounded-3xl p-6 shadow-2xl">
            <h2 id="confirm-title" className="text-xl font-bold mb-4">Please confirm</h2>
            <ol className="space-y-3 mb-5">
              {req.steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 shrink-0 rounded-full bg-black text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <div className="text-sm">
                    <p className={s.blocked ? 'text-red-600 font-semibold' : 'font-medium'}>{s.text}</p>
                    {s.amount !== undefined && <p className="text-gray-600"><Money usdc={s.amount} /></p>}
                    {s.blocked && <p className="text-red-600">{s.blocked}</p>}
                  </div>
                </li>
              ))}
            </ol>
            <div className="text-sm space-y-1 border-t border-black/10 pt-4 mb-5">
              {outgoing !== undefined && (
                <p className="flex justify-between"><span className="text-gray-600">You pay</span><span className="font-bold"><Money usdc={outgoing} /></span></p>
              )}
              <p className="flex justify-between">
                <span className="text-gray-600">Network fee</span>
                <span className="font-bold">{req.sponsored ? 'Free — covered by ChainPot' : 'Paid from your wallet'}</span>
              </p>
              {req.passkeyProtected && <p className="text-gray-600">You&apos;ll confirm with Face ID / fingerprint next.</p>}
            </div>
            <div className="flex gap-3">
              <button onClick={() => close(false)} className="flex-1 py-3 rounded-full border-2 border-black font-bold">Cancel</button>
              <button
                onClick={() => close(true)}
                disabled={req.steps.some((s) => s.blocked)}
                className="flex-1 py-3 rounded-full bg-black text-white font-bold disabled:opacity-40"
                autoFocus
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
