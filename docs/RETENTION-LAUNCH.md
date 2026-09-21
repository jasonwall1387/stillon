# Retention launch preparation

The product and database remain dormant. This source change applies no migration,
performs no purge, and configures no Worker cron trigger. `RETENTION_ENABLED` is
explicitly `false`; unset or any value except the exact string `true` also disables
both the scheduled runner and authenticated purge endpoint before a DB client opens.

The shared runner records a unique `retention_runs` row as `running` before the
retention operation. It then stores `ok` with an exact count (including a real zero)
or `error` with only `purge_failed`. Titles, votes, emails, slugs, IPs and backend error
text never enter this ledger. Dry runs use `mode = 'dry_run'`, so they cannot advance
the last actual purge success. The existing retention filter and secrecy rules remain
unchanged: only title/email are scrubbed for rows more than 30 days past expiry.

Failed start acknowledgement prevents purge. Failure to acknowledge the final write
fails the invocation; the row may remain `running` or already be durably terminal.
Do not infer zero work from that failure. A later purge is idempotent because it only
updates rows whose `title_purged` flag is false. This is a run ledger, not a mutex or
exactly-once execution claim. Concurrent runs can have different counts.

## Future launch sequence

1. Resume the product/database only under launch direction. Review and apply migration
   `0003_retention_runs.sql` to this app's own database. It grants service_role only
   select/insert/update; anon/authenticated get no access and RLS is enabled.
2. Keep the legacy GitHub purge workflow disabled. Choose exactly one scheduler.
   Prefer the Worker scheduled entry prepared here; no external admin secret is needed
   for that entry. The old GitHub schedule definition is unchanged as historical source.
3. Verify service credentials and ledger access, run synthetic tests, and deploy with
   retention still disabled. Changing source alone does not unpause or activate anything.
4. To review eligibility, enable retention deliberately and use the authenticated
   `POST /api/admin/purge?dry_run=1`. A dry run writes a run record but scrubs no checks.
   The normal authenticated POST performs the actual purge.
5. Add the chosen Worker cron only at launch, with its UTC cadence documented. Observe
   a natural completed run and its ledger row before claiming scheduled retention works.
   The handler delegates fetch to the installed Astro adapter and registers its promise
   with `ctx.waitUntil`; failures remain failed scheduled invocations.
6. Configure an independent read-only monitor: error outcomes, running rows older than
   15 minutes, no successful scheduled purge, or success older than the chosen cadence
   plus grace are actionable. Disabled mode deliberately records no false heartbeat.

```sql
-- Last true purge success, unaffected by dry runs or later failures.
select max(finished_at) as last_success_at
from public.retention_runs where status = 'ok' and mode = 'purge';

-- Scheduled success separately proves that the chosen scheduler ran.
select max(finished_at) as scheduled_last_success_at
from public.retention_runs
where status = 'ok' and mode = 'purge' and source = 'scheduled';

select id, source, mode, status, started_at, finished_at, count, error_code
from public.retention_runs order by started_at desc limit 20;
```

Rollback: set `RETENTION_ENABLED=false` and remove/disable the chosen scheduler.
Keep the ledger and prior outcomes. No automatic deletion policy is introduced for
the small operational ledger; review that separately if the product resumes.

Validated locally with synthetic unit tests, an in-memory PostgreSQL migration/RLS
test, Astro check and a production build. No live database query or write is needed
for this preparation. See [Cloudflare scheduled handlers](https://developers.cloudflare.com/workers/runtime-apis/handlers/scheduled/)
and [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
