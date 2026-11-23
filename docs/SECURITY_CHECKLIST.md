# ChainPot — Launch Security Checklist

_Last updated 2026-10-27 (branch `phase-5-hardening`). Contracts are Certora-audited and out of
scope; this covers the frontend, API, keeper, indexer and the account-abstraction setup._

## In place

| Area | What | Where |
|---|---|---|
| Signing | App only signs calls to ChainPot contracts and `USDC.approve(Vault, …)`; plain-language confirmation; simulation of single calls | `lib/aa/describe.ts`, `hooks/useContractAction.ts` |
| Smart accounts | Privy smart wallet is the acting address; passkey MFA available | `lib/aa/privy-account.tsx` |
| Autopay | On-chain Kernel session key limited to approve(Vault, ≤ 1 installment) + `payForCycle(thisPot)`, expires with the pot; fork-tested; key encrypted at rest, destroyed on revoke | `lib/aa/autopay.ts`, `lib/server/autopay.ts` |
| Identity | Server trusts only Privy identity tokens (ES256, issuer + audience checked); contacts and wallet come from the token | `lib/server/auth.ts` |
| Invites | Invite lists accepted only if they rebuild the on-chain Merkle root; link tokens stored hashed; drafts linked to pots only after re-reading the chain | `lib/server/invites.ts`, `lib/server/drafts.ts` |
| Database | RLS enabled on every table with no policies (server-only access) | `supabase/migrations/*` |
| Rate limits | Postgres fixed-window, atomic, per user / per IP on every write and public read | `lib/server/limits.ts` |
| Request size | JSON bodies capped at 32 KB (413) | `lib/server/limits.ts` |
| Cron | Fails closed without `CRON_SECRET`; constant-time comparison | `lib/server/route-auth.ts` |
| Headers | HSTS (preload), `X-Frame-Options: DENY`, nosniff, strict referrer, COOP, Permissions-Policy, no `X-Powered-By`; CSP (Report-Only) | `lib/security/headers.ts` |
| Keeper | Dry-run default; simulates before sending; gas-price cap; gas-only key; only permissionless calls | `keeper/` |
| Dependencies | Next.js 16.0.10 → 16.4.3 (critical advisories: cache poisoning, XSS, request smuggling, SSRF, middleware bypass); `axios` ≥ 1.20 via override; `npm audit`: 0 critical | `Frontend/package.json` |
| Monitoring | `/api/health` (db / rpc / indexer reachability, cached 15 s) | `app/api/health/route.ts` |

## Accepted residual risk (re-check before mainnet)

- **`ws` < 8.21 in nested copies** (pinned by wallet SDKs). Only used if Node opens WebSockets; the
  browser uses native `WebSocket` and our server talks to RPCs over HTTP.
- **`zod` v3 in nested copies** (memory exhaustion validating huge untrusted collections). Used by
  wallet libraries client-side on their own data; no server path validates user input with it.
- **CSP is Report-Only and allows `'unsafe-inline'` scripts** (Next bootstrap). Enforce
  (`CSP_ENFORCE=true`) after a clean run with a real Privy app; then move to nonces.
- **Moderate advisories** (25) are transitive in wallet SDKs; review on each dependency bump.

## Must do before mainnet

1. **Chainlink VRF**: add `VRFProviderV4` as a consumer of the subscription and fund it; alert on low balance.
2. **Privy**: production app; smart wallet type **Kernel**; login methods; allowed origins = production
   domains only; passkey MFA enabled; identity tokens enabled.
3. **Paymaster (CDP)**: contract allowlist (engines, registry, Vault `claim`, USDC `approve`), per-user
   op limits, monthly spend cap + alert. Never expose the paymaster URL key unrestricted.
4. **Secrets** (Vercel env, never in the repo): `DATABASE_URL` (pooler), `CRON_SECRET`, `PRIVY_APP_ID`
   (+ verification key), `AUTOPAY_KEY_ENCRYPTION_KEY` → **move to a KMS envelope key**, bundler/paymaster
   URLs, Resend/Twilio keys, own WalletConnect project ID, dedicated RPC URLs.
5. **Keeper**: run with a fresh gas-only key, `MAX_FEE_GWEI` set, logs shipped to monitoring.
6. **CSP**: run Report-Only with real login + payment flows, add any missing origins, then enforce.
7. **External review** of the new surface: API routes, keeper, autopay permission scope, draft/invite flow.
8. **Legal**: ROSCA / chit-fund positioning per market (e.g. India's Chit Funds Act); on/off-ramp KYC.
9. **Incident runbook**: pause engines (owner) — deadlines auto-extend; revoke all autopay
   (`update autopay_mandates set status='revoked', session_key_cipher=null`); disable the paymaster
   policy; rotate `CRON_SECRET` and Privy keys.
