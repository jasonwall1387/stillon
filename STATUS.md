# STATUS - stillon

## 2026-07-15 - secrecy TOCTOU fix shipped (gate: GO)

Pre-launch adversarial review (multi-agent) found and reproduced LIVE a break of the core
secrecy invariant: a TOCTOU between setCreatorVote and claimInviteeVote let a check resolve to
(creator_vote='on', invitee_vote='bail', status='cancelled'), so a KEEPER saw the cancelled
screen and learned the other party bailed. ~4/6 on naive concurrent fire. No real users were
affected - only the review's own test rows.

- **Fixed + deployed** (commit 587109c, Worker version c4f10839): invitee resolution now runs
  in a Postgres RPC `resolve_invitee_vote` whose CASE derives status from the current
  creator_vote under the row lock, so a concurrent creator flip is always reflected. Plus a
  CHECK constraint `checks_cancelled_iff_both_bail` that makes a keeper-cancelled row impossible
  to persist. Same change fixes the mirror bug (real mutual bail recorded as stands).
  Migration: supabase/migrations/0002_atomic_resolve.sql (applied to prod via dashboard).
- **Verified**: 25/25 unit tests incl. a TOCTOU regression; live re-run shows keepers only ever
  see 'stands'; confirming query `select count(*) from checks where status='cancelled' and
  creator_vote<>'bail'` returns 0. The 4 corrupted review rows were repaired to 'stands'.
- Ride-alongs bundled: strip control chars from titles (blocks email-body injection); security
  headers middleware (Referrer-Policy: no-referrer since the slug is in the URL) + noreferrer link.
- Non-blocking fast-follows (plan: C:\dev\docs\superpowers\plans\2026-07-15-stillon-toctou-fix.md):
  raise og_id entropy to >=16 chars; stop CF observability logging slugs in URLs; rate-limit
  POST /api/events; add a gitleaks pre-commit guard for .dev.vars.

**Gate: GO.** Launch assets being drafted (r/InternetIsBeautiful submission + X quote-post);
not yet posted. Metric: invitees who voted.

## 2026-07-14 (evening - LIVE)
- Done:
  - Tasks 0-10 complete. **LIVE at https://stillon.io** (custom domain attached; workers.dev also up).
  - Unit tests: 24 green. Playwright e2e: 3 green (hydration gate on CreateForm).
  - Secrets via wrangler secret put; PUBLIC_SITE_URL in wrangler vars; `ADMIN_SECRET` in
    GitHub Actions secrets; Web Analytics enabled (automatic setup).
  - Purge cron verified END-TO-END: workflow run 29358967931 -> {"purged":0}. Two launch
    blockers found and fixed on the way (see gotchas in .claude/rules/project-context.md):
    1. Cloudflare Browser Integrity Check banned curl/python UAs (error 1010) - BIC turned
       OFF zone-wide (webview false-positive risk to the viral loop); cron also sends a
       custom UA now.
    2. Astro 5 default CSRF (`security.checkOrigin`) blocked server-to-server POSTs -
       disabled in astro.config.mjs (no cookie auth exists; capability URLs are the auth).
  - Verified: link-preview crawlers (facebookexternalhit/WhatsApp) get 200 - OG loop safe.
  - Repo is public (MIT) with secret scanning + push protection on by default.
- In progress: none
- Blocked: nothing
- Next (launch): 20s demo video of mutual-bail confetti; X post quoting the @mattiekahn
  tweet ("no app, just a link"); r/InternetIsBeautiful; seed on real plans. Metric:
  invitees who voted (events funnel: `select kind, count(*) from events group by kind`).
