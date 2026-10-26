-- Reminder delivery: per-channel opt-in and a send log that makes the notifier idempotent.

alter table notification_prefs
  add column if not exists email_enabled    boolean not null default false,
  add column if not exists sms_enabled      boolean not null default false,
  add column if not exists whatsapp_enabled boolean not null default false;

-- Smart-wallet addresses are matched case-insensitively against on-chain data.
create index if not exists profiles_address_lower_idx on profiles (lower(address));

-- One row per (recipient, reminder) ever sent; the unique key stops double-sends across notifier runs.
create table if not exists notification_log (
  id          bigint generated always as identity primary key,
  address     text not null,                  -- smart-wallet address, lowercase
  reminder    text not null,                  -- e.g. "due24h:circle:1:3"
  channel     text not null check (channel in ('email', 'sms', 'whatsapp', 'push', 'console')),
  sent_at     timestamptz not null default now(),
  unique (address, reminder, channel)
);

alter table notification_log enable row level security;
