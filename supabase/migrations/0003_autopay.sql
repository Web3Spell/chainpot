-- Autopay mandates: an on-chain session key per (member, pot). The session private key is stored
-- encrypted (AES-256-GCM, key from AUTOPAY_KEY_ENCRYPTION_KEY — move to a KMS for production) and
-- wiped on revoke. The on-chain permission limits what the key can do even if this table leaks.

create table if not exists autopay_mandates (
  id                  uuid primary key default gen_random_uuid(),
  user_id             text not null references profiles(user_id) on delete cascade,
  address             text not null,            -- member's smart wallet, lowercase
  engine              text not null check (engine in ('circle', 'auction')),
  pot_id              numeric(78) not null,
  amount_per_cycle    numeric(78) not null,     -- USDC base units, the most one approval may allow
  valid_until         bigint not null,          -- unix seconds, mirrors the on-chain timestamp policy
  session_key_address text not null,
  session_key_cipher  text,                     -- null once revoked
  serialized_account  text,                     -- signed permission (no private key inside); null until active
  status              text not null default 'pending' check (status in ('pending', 'active', 'revoked')),
  last_paid_cycle     int,
  last_attempt_at     timestamptz,
  last_error          text,
  created_at          timestamptz not null default now(),
  revoked_at          timestamptz
);

-- One live mandate per member per pot.
create unique index if not exists autopay_one_live_idx
  on autopay_mandates (address, engine, pot_id) where status in ('pending', 'active');

alter table autopay_mandates enable row level security;
