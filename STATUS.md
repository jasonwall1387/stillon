# STATUS - stillon

## 2026-07-14
- Done:
  - Tasks 0-8 implemented and committed on `main` at `C:\dev\stillon`
  - Unit tests green: 24 (tokens, resolve + secrecy invariant, handlers)
  - `npm run check` + `npm run build` green (including OG routes + workers-og)
  - Playwright config + e2e specs written; Chromium installed
- In progress: none in code
- Blocked (Jason):
  1. **Supabase project `stillon`** - not visible via MCP `list_projects` on this org. Create a dedicated project (do not reuse TrueVIg / RWAI / Midwatch), apply `supabase/migrations/0001_init.sql`, put `SUPABASE_URL` + `SUPABASE_SECRET_KEY` (`sb_secret_...`) in Infisical and local `.dev.vars`.
  2. Fill `.dev.vars` from Infisical (`RESEND_API_KEY`, `TOKEN_PEPPER`, `ADMIN_SECRET` too).
  3. Run `npm run e2e` locally after secrets work (Task 9 not green yet - needs live DB).
  4. `wrangler secret put` for all five secrets + deploy (`npm run deploy`).
  5. Cloudflare: custom domain stillon.io on Worker, Web Analytics, add `ADMIN_SECRET` to GitHub Actions secrets.
- Next: Jason unblocks Supabase + Infisical -> agent resumes with Task 9 e2e + Task 10 deploy.
