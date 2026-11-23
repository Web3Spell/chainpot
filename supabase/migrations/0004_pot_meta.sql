-- Display names for circles ("Family Circle 🏠"). Not on-chain; only the pot's on-chain creator can set it.
create table if not exists pot_meta (
  engine     text not null check (engine in ('circle', 'auction')),
  pot_id     numeric(78) not null,
  name       text not null check (char_length(name) between 1 and 40),
  emoji      text check (char_length(emoji) <= 8),
  updated_by text not null,                 -- creator's smart wallet, lowercase
  updated_at timestamptz not null default now(),
  primary key (engine, pot_id)
);
alter table pot_meta enable row level security;
