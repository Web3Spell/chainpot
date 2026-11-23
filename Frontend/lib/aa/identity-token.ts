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

/** Identity token for `user`, reusing a still-valid one and de-duplicating concurrent requests. */
export async function sharedIdentityToken(fetcher: Fetcher, user: string, now: () => number = Date.now): Promise<string | null> {
  if (cached && cached.user === user && cached.expMs - SKEW_MS > now()) return cached.token;
  if (inflight && inflight.user === user) return inflight.promise;
  const promise = fetcher()
    .then((token) => {
      cached = token ? { token, user, expMs: jwtExpiryMs(token) ?? now() + FALLBACK_TTL_MS } : null;
      return token;
    })
    .finally(() => {
      if (inflight?.promise === promise) inflight = null;
    });
  inflight = { promise, user };
  return promise;
}

/** Forget the token (sign-out, user switch). */
export function clearIdentityToken() {
  cached = null;
  inflight = null;
}
