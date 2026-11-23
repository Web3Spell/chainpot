import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

// The module reads env at import time, so re-import under a fresh env per case.
async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  const prev = { ...process.env };
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  const mod = await import('./onramp');
  for (const k of Object.keys(env)) delete process.env[k];
  Object.assign(process.env, prev);
  return mod;
}

describe('on-ramp URL', () => {
  const ADDR = '0xB4e245edf5544302A1Add70b4FE9B034e994C2b8';

  it('is disabled without an API key', async () => {
    const { ONRAMP_ENABLED, buildOnrampUrl } = await load({ NEXT_PUBLIC_TRANSAK_API_KEY: undefined });
    expect(ONRAMP_ENABLED).toBe(false);
    expect(buildOnrampUrl({ address: ADDR })).toBeNull();
  });

  it('builds a staging URL with the destination locked to the user address', async () => {
    const { buildOnrampUrl } = await load({ NEXT_PUBLIC_TRANSAK_API_KEY: 'test-key', NEXT_PUBLIC_TRANSAK_ENV: 'STAGING' });
    const url = new URL(buildOnrampUrl({ address: ADDR, fiatCurrency: 'INR', fiatAmount: 1500 })!);
    expect(url.host).toBe('global-stg.transak.com');
    expect(url.searchParams.get('apiKey')).toBe('test-key');
    expect(url.searchParams.get('walletAddress')).toBe(ADDR);
    expect(url.searchParams.get('disableWalletAddressForm')).toBe('true');
    expect(url.searchParams.get('cryptoCurrencyCode')).toBe('USDC');
    expect(url.searchParams.get('network')).toBe('base');
    expect(url.searchParams.get('fiatCurrency')).toBe('INR');
    expect(url.searchParams.get('defaultFiatAmount')).toBe('1500');
    expect(url.searchParams.get('productsAvailed')).toBe('BUY');
  });

  it('uses the production host when configured', async () => {
    const { buildOnrampUrl } = await load({ NEXT_PUBLIC_TRANSAK_API_KEY: 'k', NEXT_PUBLIC_TRANSAK_ENV: 'PRODUCTION' });
    expect(new URL(buildOnrampUrl({ address: ADDR })!).host).toBe('global.transak.com');
  });

  it('falls back to USD for currencies Transak does not support', async () => {
    const { fiatForOnramp } = await load({ NEXT_PUBLIC_TRANSAK_API_KEY: 'k' });
    expect(fiatForOnramp('INR')).toBe('INR');
    expect(fiatForOnramp('XYZ')).toBe('USD');
    expect(fiatForOnramp(null)).toBe('USD');
  });
});
