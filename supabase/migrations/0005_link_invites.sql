-- Invite-by-link: an organizer drafts a circle off-chain and shares ONE link; friends sign in and
-- accept a seat; the organizer then creates the circle on-chain with exactly the accepted members.

alter table circle_drafts
  add column if not exists emoji             text,
  add column if not exists invite_token_hash text unique,      -- sha256 of the link token; token never stored
  add column if not exists status            text not null default 'open'
    check (status in ('open', 'locked', 'deployed', 'cancelled')), -- locked = organizer is creating it on-chain
  add column if not exists deployed_at       timestamptz;

create table if not exists draft_members (
  draft_id    uuid not null references circle_drafts(id) on delete cascade,
  user_id     text not null references profiles(user_id) on delete cascade,
  address     text not null,                                  -- smart wallet, lowercase
  accepted_at timestamptz not null default now(),
  primary key (draft_id, user_id),
  unique (draft_id, address)
);

create index if not exists draft_members_user_idx on draft_members (user_id);
alter table draft_members enable row level security;
