-- Evidence that a signed-in user accepted a given version of the Terms, Risk Disclosure and
-- Privacy Policy. One row per (user, version); the first acceptance is kept, never overwritten.
create table if not exists terms_acceptances (
  user_id      text        not null,            -- Privy DID (did:privy:…)
  version      text        not null,            -- lib/legal.ts TERMS_VERSION
  address      text,                            -- smart account at the time, lower-cased
  accepted_at  timestamptz not null,            -- when the person ticked the box (client clock, sanity-bounded)
  recorded_at  timestamptz not null default now(),
  user_agent   text,
  primary key (user_id, version)
);
alter table terms_acceptances enable row level security;
-- No policies: only the server (service role) reads or writes this table.
