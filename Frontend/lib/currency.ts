// Display-currency support. On-chain amounts are always USDC (6 decimals); local currency is an
// estimate shown next to the exact dollar amount, never instead of it on confirmations.

export interface Country {
  code: string; // ISO 3166-1 alpha-2
  name: string;
  currency: string; // ISO 4217
}

// India & Asia first, then other launch regions; anything else displays USD.
export const COUNTRIES: Country[] = [
  { code: "IN", name: "India", currency: "INR" },
  { code: "PK", name: "Pakistan", currency: "PKR" },
  { code: "BD", name: "Bangladesh", currency: "BDT" },
  { code: "LK", name: "Sri Lanka", currency: "LKR" },
  { code: "NP", name: "Nepal", currency: "NPR" },
  { code: "ID", name: "Indonesia", currency: "IDR" },
  { code: "PH", name: "Philippines", currency: "PHP" },
  { code: "VN", name: "Vietnam", currency: "VND" },
  { code: "TH", name: "Thailand", currency: "THB" },
  { code: "MY", name: "Malaysia", currency: "MYR" },
  { code: "SG", name: "Singapore", currency: "SGD" },
  { code: "AE", name: "United Arab Emirates", currency: "AED" },
  { code: "SA", name: "Saudi Arabia", currency: "SAR" },
  { code: "CN", name: "China", currency: "CNY" },
  { code: "HK", name: "Hong Kong", currency: "HKD" },
  { code: "JP", name: "Japan", currency: "JPY" },
  { code: "KR", name: "South Korea", currency: "KRW" },
  { code: "NG", name: "Nigeria", currency: "NGN" },
  { code: "KE", name: "Kenya", currency: "KES" },
  { code: "GH", name: "Ghana", currency: "GHS" },
  { code: "MX", name: "Mexico", currency: "MXN" },
  { code: "BR", name: "Brazil", currency: "BRL" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "FR", name: "France", currency: "EUR" },
  { code: "CA", name: "Canada", currency: "CAD" },
  { code: "AU", name: "Australia", currency: "AUD" },
  { code: "US", name: "United States", currency: "USD" },
];

export const OTHER_COUNTRY: Country = { code: "ZZ", name: "Somewhere else", currency: "USD" };

export function countryByCode(code: string | null | undefined): Country | undefined {
  if (!code) return undefined;
  const c = code.toUpperCase();
  return c === OTHER_COUNTRY.code ? OTHER_COUNTRY : COUNTRIES.find((x) => x.code === c);
}

/** Best guess from the browser's language tag (e.g. "en-IN" → IN). No IP lookup, nothing leaves the device. */
export function guessCountry(languages: readonly string[]): Country | undefined {
  for (const tag of languages) {
    const region = tag.split("-")[1];
    const hit = countryByCode(region);
    if (hit) return hit;
  }
  return undefined;
}

/**
 * Format USDC base units as an exact dollar string. Always en-US ("$50.00"): identical on server and
 * client (no hydration mismatch) and unambiguous next to a local-currency estimate.
 */
export function formatUsd(usdc: bigint, locale = "en-US") {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(Number(usdc) / 1e6);
}

/** Local-currency estimate for USDC base units, or undefined when it would just repeat USD. */
export function formatLocal(usdc: bigint, currency: string, rate: number | undefined, locale?: string) {
  if (currency === "USD" || !rate) return undefined;
  const value = (Number(usdc) / 1e6) * rate;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: value >= 100 ? 0 : 2,
  }).format(value);
}
