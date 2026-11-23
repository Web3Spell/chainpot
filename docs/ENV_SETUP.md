# ChainPot — Keys, secrets and accounts needed to run for real

Every variable below is read by the code (checked 2026-10-27). **Never commit real values** — put
them in Vercel/Railway env settings, or local `.env.local` files (gitignored). Variables starting with
`NEXT_PUBLIC_` are visible in the browser by design; everything else is server-only.

## 1. Accounts / on-chain setup (do these first)

| What | Why | Where to get it |
|---|---|---|
| **Chainlink VRF subscription consumer** | Every draw with 2+ eligible members currently fails (`InvalidConsumer`) | vrf.chain.link → Base Sepolia → your subscription (ID from deploy) → *Add consumer* → `VRFProviderV4` `0x02C179C8ddD881Ae61C50D06440a849EFCBEf504`. Fund the subscription with LINK (faucets.chain.link). |
| **Privy app** | Phone/email/Google/Apple/passkey login + smart wallets | dashboard.privy.io → create app. Enable login methods, **Smart wallets → Kernel**, add Base Sepolia with the CDP bundler + paymaster URLs, enable **passkey MFA**, enable **identity tokens**, set allowed origins (localhost, your domains). |
| **Coinbase Developer Platform (CDP)** | Bundler + paymaster (free gas), RPC (CDP Node), gas credits | portal.cdp.coinbase.com → create project → Paymaster (Base Sepolia): copy the RPC/paymaster URL, set contract allowlist + per-user limits; Node: copy the Base Sepolia RPC URL. Apply for gas credits there. |
| **Supabase project** | Postgres for invites, profiles, drafts, autopay, rate limits | supabase.com → new project (region Mumbai) → run `supabase/migrations/0001…0006` in order (SQL editor or Supabase CLI) → Settings → Database → **connection pooler** string. |
| **Reown (WalletConnect) project** | "Connect wallet" option for crypto-native users | cloud.reown.com → new project → Project ID. Add your domains to its allowlist. |
| **Vercel project** | Hosts the Next.js app + cron jobs | vercel.com → import repo, root directory `Frontend`. On Hobby, `vercel.json` runs the cron routes once a day (the plan's limit); the keeper calls them every 15 min when `APP_URL` + `CRON_SECRET` are set (see section 4). |
| **Always-on worker host** (Railway / Fly / any VPS) | Runs the keeper loop and the Ponder indexer | railway.app or fly.io — two services: `keeper/` and `indexer/`. |
| **Resend** *(optional: email reminders)* | Sends reminder emails | resend.com → API key; verify your sending domain. |
| **Twilio** *(optional: SMS / WhatsApp reminders)* | Sends SMS + WhatsApp | twilio.com → Account SID + Auth Token; buy an SMS number; WhatsApp sender (sandbox for testing). India SMS needs DLT template registration; production WhatsApp needs approved templates. |
| **Test funds** | Testing on Base Sepolia | USDC: faucet.circle.com (Base Sepolia). ETH for the keeper key: Coinbase/Alchemy Base Sepolia faucets. |

## 2. Frontend (Vercel, `Frontend/`)

| Variable | Required | What / where from |
|---|---|---|
| `NEXT_PUBLIC_PRIVY_APP_ID` | ✅ for phone/email login | Privy dashboard → App ID. Unset = "connect your wallet" mode. |
| `PRIVY_APP_ID` | optional | Same value, server side (defaults to the public one). |
| `PRIVY_VERIFICATION_KEY` | recommended | Privy dashboard → app settings → **verification key** (SPKI PEM). Without it the server fetches Privy's public JWKS. |
| `NEXT_PUBLIC_GAS_SPONSORED` | optional | `false` only if no paymaster is configured in Privy. |
| `NEXT_PUBLIC_WC_PROJECT_ID` | ✅ | Reown project ID (the repo's fallback is a shared dev ID — replace it). |
| `NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL` | ✅ for production | CDP Node (or Alchemy/QuickNode) Base Sepolia URL. Public fallback is rate-limited. Visible in the browser — use a key restricted to your domains. |
| `BASE_SEPOLIA_RPC_URL` | recommended | Server-only RPC (can hold an unrestricted key). |
| `NEXT_PUBLIC_INDEXER_URL` | recommended | Public URL of the deployed `indexer/` (e.g. `https://indexer.yourdomain.com`). Unset = direct contract reads. |
| `DATABASE_URL` | ✅ | Supabase **pooler** connection string. |
| `CRON_SECRET` | ✅ | Generate: `openssl rand -hex 32`. Vercel Cron sends it automatically when set. |
| `APP_URL` | ✅ | Your public site URL, used in reminder links (e.g. `https://chainpot.app`). |
| `AUTOPAY_KEY_ENCRYPTION_KEY` | ✅ for autopay | Generate: `openssl rand -base64 32`. Production: replace with a KMS key. |
| `AUTOPAY_BUNDLER_URL` | ✅ for autopay | CDP bundler URL for Base Sepolia. |
| `AUTOPAY_PAYMASTER_URL` | ✅ for autopay | CDP paymaster URL for Base Sepolia. |
| `RESEND_API_KEY`, `REMINDER_EMAIL_FROM` | optional | Resend API key + a verified sender, e.g. `ChainPot <reminders@yourdomain.com>`. |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | optional | Twilio console. |
| `TWILIO_SMS_FROM`, `TWILIO_WHATSAPP_FROM` | optional | Your Twilio SMS number / WhatsApp sender (E.164, e.g. `+14155238886`). |
| `CSP_ENFORCE` | later | Set `true` after a clean Report-Only run with real Privy flows. |

## 3. Indexer (worker, `indexer/`)

| Variable | Required | What / where from |
|---|---|---|
| `PONDER_RPC_URL_84532` | ✅ | Base Sepolia RPC **with full log history** (CDP Node / Alchemy). |
| `DATABASE_URL` | ✅ in production | A Postgres URL (can be the same Supabase project, separate schema). |
| `DATABASE_SCHEMA` | ✅ | e.g. `chainpot` (any name; one per deployment). |
| `ALLOWED_ORIGINS` | recommended | Your site origin(s), comma-separated (CORS). |
| `PONDER_RPC_MAX_RPS`, `PONDER_GETLOGS_RANGE` | optional | Raise for a paid RPC (defaults 5 req/s, 500k blocks). |

## 4. Keeper (worker, `keeper/`)

| Variable | Required | What / where from |
|---|---|---|
| `DRY_RUN` | ✅ | `false` to actually send (default `true` only logs). |
| `KEEPER_PRIVATE_KEY` | ✅ when sending | **New** key made only for this: `cast wallet new` (Foundry). Fund with a little Base Sepolia ETH. It never needs USDC — it can only make permissionless calls. |
| `KEEPER_RPC_URL` | ✅ | Base Sepolia RPC (CDP Node / Alchemy). |
| `MAX_FEE_GWEI` | optional | Gas-price ceiling (default `1`). |
| `INTERVAL_SEC` | optional | Loop interval (default `60`). |
| `CLAIM_MIN_USDC_UNITS`, `CLAIM_OPT_OUT` | optional | Auto-collect threshold (default `1000000` = $1) / addresses that collect manually. |
| `APP_URL`, `CRON_SECRET` | ✅ on Vercel Hobby | Same values as the app's. The keeper then calls `/api/cron/reminders` and `/api/cron/autopay` every `CRON_EVERY_SEC` (default 900 = 15 min). |

## 5. Local-only / testing

| Variable | Purpose |
|---|---|
| `FORK_TESTS=1`, `FORK_RPC_URL` | Run the autopay fork test (`npx vitest run lib/aa/autopay.fork.test.ts`; needs Foundry's `anvil`). |
| `KEEPER_ADDRESS` | Sender used for dry-run simulations. |

## 6. Already public (no secret needed)

Contract addresses (in `Frontend/config/hooksConf.ts`), Base Sepolia USDC `0x036CbD53842c5426634e7929541eC2318f3dCF7e`,
Chainlink VRF coordinator and key hash (in `smart-contracts/v4/DEPLOYMENT.md`), exchange rates (open.er-api.com, no key).
