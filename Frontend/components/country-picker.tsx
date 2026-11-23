'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useCurrency } from '@/providers/currency-provider';
import { COUNTRIES, OTHER_COUNTRY } from '@/lib/currency';

/** Asks once where the user is, to show amounts in their currency. Re-open via <CountryButton />. */
export function CountryPicker({ open, onClose }: { open?: boolean; onClose?: () => void }) {
  const { country, suggested, loaded, setCountry } = useCurrency();
  const firstVisit = loaded && !country;
  const [choice, setChoice] = useState<string>('');
  if (!(open || firstVisit)) return null;

  const value = choice || country?.code || suggested?.code || 'IN';
  const save = () => {
    setCountry(value);
    onClose?.();
  };

  // Portal to <body>: ancestors with backdrop-filter (the navbar) would otherwise trap position:fixed.
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end md:items-center justify-center bg-black/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="country-title">
      <div className="w-full md:max-w-sm bg-white text-black rounded-t-3xl md:rounded-3xl p-6 shadow-2xl">
        <h2 id="country-title" className="text-xl font-bold mb-1">Where are you?</h2>
        <p className="text-sm text-gray-600 mb-4">We&apos;ll show amounts in your local currency. Payments stay fixed in US dollars (USDC).</p>
        <label htmlFor="country" className="sr-only">Country</label>
        <select id="country" value={value} onChange={(e) => setChoice(e.target.value)} className="w-full px-4 py-3 rounded-xl border-2 border-cp-line mb-4 bg-white">
          {COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>{c.name} ({c.currency})</option>
          ))}
          <option value={OTHER_COUNTRY.code}>{OTHER_COUNTRY.name} (USD)</option>
        </select>
        <button onClick={save} className="w-full min-h-12 rounded-full bg-cp-ink text-cp-ink-inverse font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent focus-visible:ring-offset-2">Continue</button>
        <p className="text-[11px] text-gray-500 mt-3 text-center">
          <a href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer" className="underline">Rates by ExchangeRate-API</a> · you can change this anytime
        </p>
      </div>
    </div>,
    document.body,
  );
}

export function CountryButton({}: { isDarkMode?: boolean }) {
  const { country } = useCurrency();
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="h-11 min-w-11 px-3 inline-flex items-center justify-center rounded-full text-xs font-bold border border-cp-line-soft text-cp-ink hover:bg-cp-line-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cp-accent"
        aria-label="Change country and currency"
      >
        {country?.currency ?? 'USD'}
      </button>
      {open && <CountryPicker open onClose={() => setOpen(false)} />}
    </>
  );
}
