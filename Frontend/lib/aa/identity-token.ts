// Shared Privy identity token for calls to ChainPot's own API.
//
// Every API request needs the token, and a dashboard load fires several at once (plus 15s
// refetches). Asking Privy for a fresh token each time tripped its rate limit right after sign-in
// ("Too many requests"). One token is reused until shortly before it expires, concurrent callers
// share one in-flight request, and switching users or signing out starts over.

type Fetcher = () => Promise<string | null>;

const SKEW_MS = 60_000; // refresh a minute before expiry
const FALLBACK_TTL_MS = 5 * 60_000; // if the token has no readable exp

let cached: { token: string; expMs: number; user: string } | null = null;
let inflight: { promise: Promise<string | null>; user: string } | null = null;

/** Expiry (ms since epoch) from a JWT's `exp`, or undefined if it can't be read. */
export function jwtExpiryMs(token: string): number | undefined {
  try {
    const part = token.split(".")[1];
    if (!part) return undefined;
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=")));
    return typeof json.exp === "number" ? json.exp * 1000 : undefined;
  } catch {
    return undefined;
  }
}

/** Does the token's `linked_accounts` claim include this smart wallet? (Unverified read; the server verifies.) */
export function tokenHasSmartWallet(token: string, wallet: string): boolean {
  try {
    const part = token.split(".")[1];
    if (!part) return false;
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=")));
    const raw = json.linked_accounts;
    const list = (typeof raw === "string" ? JSON.parse(raw) : raw) as { type?: string; address?: string }[];
    return Array.isArray(list) && list.some((a) => a?.type === "smart_wallet" && a.address?.toLowerCase() === wallet.toLowerCase());
  } catch {
    return false;
  }
}

export interface TokenOptions {
  /** The user's smart wallet, once known. A token that doesn't list it is stale and never cached. */
  wallet?: string;
  /** Ask Privy to re-issue the token (refreshUser). Used once when the token lacks `wallet`. */
  refresh?: () => Promise<unknown>;
}

/**
 * Identity token for `user`, reusing a still-valid one and de-duplicating concurrent requests.
 *
 * A brand-new account gets its smart wallet a moment after sign-in, so the first token Privy issues
 * can predate it. The server needs the wallet in the token (e.g. to accept an invite), so the cache is
 * keyed by user + wallet, and a token missing the expected wallet triggers one refresh and isn't kept.
 */
export async function sharedIdentityToken(
  fetcher: Fetcher,
  user: string,
  now: () => number = Date.now,
  opts: TokenOptions = {},
): Promise<string | null> {
  const key = `${user}|${opts.wallet?.toLowerCase() ?? ""}`;
  if (cached && cached.user === key && cached.expMs - SKEW_MS > now()) return cached.token;
  if (inflight && inflight.user === key) return inflight.promise;
  const promise = (async () => {
    let token = await fetcher();
    if (token && opts.wallet && !tokenHasSmartWallet(token, opts.wallet) && opts.refresh) {
      await opts.refresh().catch(() => undefined);
      token = await fetcher();
    }
    const complete = !!token && (!opts.wallet || tokenHasSmartWallet(token, opts.wallet));
    cached = token && complete ? { token, user: key, expMs: jwtExpiryMs(token) ?? now() + FALLBACK_TTL_MS } : null;
    return token;
  })().finally(() => {
    if (inflight?.promise === promise) inflight = null;
  });
  inflight = { promise, user: key };
  return promise;
}

/** Forget the token (sign-out, user switch). */
export function clearIdentityToken() {
  cached = null;
  inflight = null;
}
