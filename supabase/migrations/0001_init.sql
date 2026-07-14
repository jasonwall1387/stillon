create table if not exists checks (
  id               text primary key,
  title            text not null check (char_length(title) <= 80),
  event_at         timestamptz,
  created_at       timestamptz not null default now(),
  expires_at       timestamptz not null,
  status           text not null default 'open'
                   check (status in ('open','cancelled','stands','expired')),
  resolved_at      timestamptz,
  creator_hash     text not null unique,
  invitee_hash     text not null unique,
  og_id            text not null unique,
  creator_vote     text not null check (creator_vote in ('on','bail')),
  creator_voted_at timestamptz not null default now(),
  invitee_vote     text check (invitee_vote in ('on','bail')),
  invitee_voted_at timestamptz,
  notify_email     text,
  notified_at      timestamptz,
  title_purged     boolean not null default false,
  ip_hash          text not null
);

create index if not exists checks_expiry on checks (status, expires_at);
create index if not exists checks_ip on checks (ip_hash, created_at);

create table if not exists events (
  id bigint generated always as identity primary key,
  check_id text,
  kind text not null,
  at timestamptz not null default now()
);

-- Lockdown. The app reaches Postgres ONLY via the service_role key from the Worker.
-- No browser ever holds a Supabase key, so anon/authenticated must be able to do nothing,
-- even if a key were somehow exposed. RLS with zero policies denies them everything;
-- the explicit grants/revokes below make that true regardless of the project's
-- "automatically expose new tables" setting.
alter table checks enable row level security;
alter table events enable row level security;

revoke all on table checks from anon, authenticated;
revoke all on table events from anon, authenticated;
grant all privileges on table checks to service_role;
grant all privileges on table events to service_role;
grant usage on schema public to service_role;
