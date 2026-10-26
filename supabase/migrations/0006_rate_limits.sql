-- Fixed-window API rate limits, shared across serverless instances.
create table if not exists rate_limits (
  key          text   not null,   -- e.g. "user:did:privy:…:drafts.create" or "ip:1.2.3.4:invites.post"
  window_start bigint not null,   -- unix seconds, floored to the window
  count        int    not null,
  primary key (key, window_start)
);
create index if not exists rate_limits_window_idx on rate_limits (window_start);
alter table rate_limits enable row level security;
