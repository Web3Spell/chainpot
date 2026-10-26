'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { countryByCode, guessCountry, OTHER_COUNTRY, type Country } from '@/lib/currency';

const STORAGE_KEY = 'chainpot:country';

interface CurrencyState {
  /** undefined until the user has chosen (or confirmed) a country. */
  country?: Country;
  suggested?: Country;
  /** False until the stored preference has been read on the client. */
  loaded: boolean;
  currency: string;
  rate?: number;
  setCountry: (code: string) => void;
}

const CurrencyContext = createContext<CurrencyState | null>(null);

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider');
  return ctx;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountryState] = useState<Country | undefined>();
  const [suggested, setSuggested] = useState<Country | undefined>();
  const [loaded, setLoaded] = useState(false);

  // Browser-only preferences are read after mount so server and first client render match.
  useEffect(() => {
    let stored: string | null = null;
    try {
      stored = localStorage.getItem(STORAGE_KEY);
    } catch {
      // storage blocked: ask every visit
    }
    /* eslint-disable react-hooks/set-state-in-effect -- one-time read of browser-only state */
    setCountryState(countryByCode(stored));
    setSuggested(guessCountry(navigator.languages ?? [navigator.language]));
    setLoaded(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const setCountry = useCallback((code: string) => {
    const c = countryByCode(code) ?? OTHER_COUNTRY;
    setCountryState(c);
    try {
      localStorage.setItem(STORAGE_KEY, c.code);
    } catch {
      // not persisted; fine for this session
    }
  }, []);

  const currency = country?.currency ?? 'USD';
  const { data } = useQuery({
    queryKey: ['fx'],
    queryFn: async () => (await (await fetch('/api/fx')).json()) as { rates: Record<string, number> },
    enabled: currency !== 'USD',
    staleTime: 60 * 60 * 1000,
    refetchInterval: false,
  });

  return (
    <CurrencyContext.Provider value={{ country, suggested, loaded, currency, rate: data?.rates[currency], setCountry }}>
      {children}
    </CurrencyContext.Provider>
  );
}
