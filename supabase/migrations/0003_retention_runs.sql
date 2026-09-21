-- Launch preparation only. No customer content or capability tokens in this ledger.
create table public.retention_runs (
  id uuid primary key,
  source text not null check (source in ('admin', 'scheduled')),
  mode text not null check (mode in ('purge', 'dry_run')),
  status text not null check (status in ('running', 'ok', 'error')),
  started_at timestamptz not null,
  cutoff_at timestamptz not null,
  finished_at timestamptz,
  count bigint check (count >= 0),
  error_code text check (error_code = 'purge_failed'),
  check (
    (status = 'running' and finished_at is null and count is null and error_code is null)
    or (status = 'ok' and finished_at is not null and count is not null and error_code is null)
    or (status = 'error' and finished_at is not null and count is null and error_code is not null)
  )
);
create index retention_runs_recent on public.retention_runs (started_at desc);
create index retention_runs_last_success on public.retention_runs (finished_at desc)
  where status = 'ok' and mode = 'purge';
alter table public.retention_runs enable row level security;
revoke all on public.retention_runs from public, anon, authenticated, service_role;
grant select, insert, update on public.retention_runs to service_role;
create policy retention_runs_service on public.retention_runs for all to service_role
  using (true) with check (true);
