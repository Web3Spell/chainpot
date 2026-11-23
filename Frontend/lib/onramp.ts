// Fiat on-ramp (buy USDC with card / bank / UPI) via Transak's hosted widget.
//
// Transak is URL-driven: we hand it the destination (the member's ChainPot smart-account address),
// the asset (USDC on Base) and the buyer's local fiat currency, and it runs KYC + payment + delivery.
// The address form is locked so funds can only land in the user's own account.
//
// On-ramps settle on MAINNET only. On testnet this stays off and the faucet link is shown instead.

const API_KEY = process.env.NEXT_PUBLIC_TRANSAK_API_KEY;
const ENV = (process.env.NEXT_PUBLIC_TRANSAK_ENV ?? 'STAGING').toUpperCase();
// Base mainnet = "base". Only mainnet networks actually deliver funds.
const NETWORK = process.env.NEXT_PUBLIC_ONRAMP_NETWORK ?? 'base';

/** Whether the on-ramp is configured. Without an API key the UI falls back to "copy my address". */
export const ONRAMP_ENABLED = !!API_KEY;

const HOST = ENV === 'PRODUCTION' ? 'https://global.transak.com' : 'https://global-stg.transak.com';

// Transak supports a fixed set of fiat currencies; anything else buys in USD.
const SUPPORTED_FIAT = new Set([
  'INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'AED', 'HKD', 'JPY', 'KRW', 'THB',
  'MYR', 'PHP', 'IDR', 'VND', 'NGN', 'KES', 'GHS', 'MXN', 'BRL', 'SAR', 'PKR', 'BDT', 'LKR', 'NPR',
]);

export function fiatForOnramp(currency?: string | null): string {
  return currency && SUPPORTED_FIAT.has(currency.toUpperCase()) ? currency.toUpperCase() : 'USD';
}

export interface OnrampParams {
  /** Destination smart-account address (locked in the widget). */
  address: string;
  /** Buyer's local currency, e.g. "INR". Falls back to USD if Transak doesn't support it. */
  fiatCurrency?: string | null;
  /** Prefilled amount in that fiat currency; the user can still change it. */
  fiatAmount?: number;
  /** Where Transak returns the user after the purchase. */
  redirectUrl?: string;
}

/** Build the hosted on-ramp URL. Returns null if the on-ramp isn't configured. */
export function buildOnrampUrl({ address, fiatCurrency, fiatAmount, redirectUrl }: OnrampParams): string | null {
  if (!API_KEY || !address) return null;
  const params = new URLSearchParams({
    apiKey: API_KEY,
    productsAvailed: 'BUY',
    network: NETWORK,
    cryptoCurrencyCode: 'USDC',
    walletAddress: address,
    disableWalletAddressForm: 'true',
    fiatCurrency: fiatForOnramp(fiatCurrency),
    themeColor: '4F46E5',
  });
  if (fiatAmount && fiatAmount > 0) params.set('defaultFiatAmount', String(Math.round(fiatAmount)));
  if (redirectUrl) params.set('redirectURL', redirectUrl);
  return `${HOST}/?${params.toString()}`;
}
