-- ChainPot off-chain store (Supabase / Postgres).
-- On-chain state stays the source of truth; these tables hold the social layer the chain can't.
-- All access goes through the Next.js server with the service connection; RLS denies anon/authenticated
-- clients by default, so the anon key can never read phone numbers or emails.

-- Invite lists for pots. Public data (a Merkle proof only lets a listed address join), stored so
-- invitees can join from any device without a giant share link. The API only accepts a list whose
-- rebuilt Merkle root equals the pot's current on-chain root, so this table can't be poisoned.
create table if not exists pot_invites (
  engine      text        not null check (engine in ('circle', 'auction')),
  pot_id      numeric(78) not null,
  merkle_root text        not null check (merkle_root ~ '^0x[0-9a-f]{64}$'),
  addresses   text[]      not null check (cardinality(addresses) between 2 and 100),
  created_at  timestamptz not null default now(),
  primary key (engine, pot_id, merkle_root)
);

-- ---- Phase 2 (Privy auth) — created now so the schema is reviewed once ----

-- One row per signed-in person. user_id is the Privy DID; address is their smart-account address.
create table if not exists profiles (
  user_id      text primary key,
  address      text unique check (address ~ '^0x[0-9a-fA-F]{40}$'),
  display_name text check (char_length(display_name) <= 60),
  country      char(2),             -- ISO 3166-1 alpha-2, asked at onboarding
  currency     char(3),             -- ISO 4217 display currency derived from country (editable)
  locale       text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Contact channels are PII: kept separate from profiles so they can be encrypted/rotated independently.
create table if not exists contact_methods (
  id          bigint generated always as identity primary key,
  user_id     text not null references profiles(user_id) on delete cascade,
  kind        text not null check (kind in ('email', 'phone', 'whatsapp', 'push')),
  value       text not null,
  verified_at timestamptz,
  unique (user_id, kind, value)
);

create table if not exists notification_prefs (
  user_id       text primary key references profiles(user_id) on delete cascade,
  payment_due   boolean not null default true,
  round_started boolean not null default true,
  bidding_open  boolean not null default true,
  you_received  boolean not null default true,
  missed        boolean not null default true,
  quiet_hours   int4range                       -- local hours [start, end), null = none
);

-- Draft circles: built off-chain, invitees accept, then the creator deploys on-chain (Phase 4 wizard).
create table if not exists circle_drafts (
  id               uuid primary key default gen_random_uuid(),
  creator_user_id  text not null references profiles(user_id) on delete cascade,
  name             text not null check (char_length(name) between 1 and 80),
  engine           text not null check (engine in ('circle', 'auction')),
  amount_per_cycle numeric(78) not null,        -- USDC base units (6 decimals)
  member_count     int not null check (member_count between 2 and 100),
  cycle_duration   int not null,                -- seconds
  payment_window   int not null,
  bidding_window   int not null default 0,
  auto_start       boolean not null default false,
  pot_id           numeric(78),                 -- set once deployed
  created_at       timestamptz not null default now()
);

create table if not exists draft_invitees (
  draft_id    uuid not null references circle_drafts(id) on delete cascade,
  token_hash  text not null unique,             -- sha256 of the invite token; the token itself is never stored
  contact     text,                             -- email/phone the creator entered (PII)
  user_id     text references profiles(user_id),
  address     text,                             -- smart-account address once accepted
  accepted_at timestamptz,
  primary key (draft_id, token_hash)
);

alter table pot_invites        enable row level security;
alter table profiles           enable row level security;
alter table contact_methods    enable row level security;
alter table notification_prefs enable row level security;
alter table circle_drafts      enable row level security;
alter table draft_invitees     enable row level security;
-- No policies are defined: only the server's service connection (which bypasses RLS) can access these.
