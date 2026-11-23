// Security headers for every response. Kept in one pure module so they're unit-tested and reviewed
// together. CSP ships in Report-Only until it's been verified against a live Privy app; set
// CSP_ENFORCE=true to enforce it.

export interface CspOptions {
  rpcUrls: string[];
  indexerUrl?: string;
  dev?: boolean;
}

function origin(url?: string) {
  try {
    return url ? new URL(url).origin : undefined;
  } catch {
    return undefined;
  }
}

export function buildCsp({ rpcUrls, indexerUrl, dev }: CspOptions) {
  const connect = [
    "'self'",
    ...rpcUrls.map(origin),
    origin(indexerUrl),
    // Privy auth + embedded wallet, smart-wallet bundler/paymaster (configured in Privy), WalletConnect, Coinbase.
    "https://auth.privy.io", "https://*.privy.io", "wss://*.privy.io",
    "https://*.walletconnect.com", "https://*.walletconnect.org", "wss://*.walletconnect.com", "wss://*.walletconnect.org",
    // WalletConnect's Reown/AppKit config + explorer (seen in report-only testing).
    "https://*.web3modal.org", "https://*.web3modal.com", "https://*.reown.com", "wss://*.reown.com",
    "https://*.coinbase.com", "wss://*.coinbase.com",
    "https://*.pimlico.io",
    ...(dev ? ["ws://localhost:*", "http://localhost:*"] : []),
  ].filter(Boolean);
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // Next injects inline bootstrap scripts; move to nonces when CSP is enforced. wasm for wallet crypto.
    "script-src": ["'self'", "'unsafe-inline'", "'wasm-unsafe-eval'", ...(dev ? ["'unsafe-eval'"] : [])],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "font-src": ["'self'", "data:"],
    "connect-src": connect as string[],
    "frame-src": ["https://auth.privy.io", "https://*.privy.io", "https://verify.walletconnect.com", "https://verify.walletconnect.org", "https://*.coinbase.com"],
    "worker-src": ["'self'", "blob:"],
    "media-src": ["'self'", "https:"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives).map(([k, v]) => `${k} ${v.join(" ")}`).join("; ");
}

export function securityHeaders(opts: CspOptions & { enforceCsp?: boolean }) {
  return [
    { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    // Wallet SDKs open popups (Coinbase, OAuth); same-origin-allow-popups keeps them working.
    { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), usb=(), payment=(), interest-cohort=()" },
    { key: opts.enforceCsp ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", value: buildCsp(opts) },
  ];
}
