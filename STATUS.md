# STATUS - stillon

## 2026-07-14
- Done:
  - Tasks 0-8 implemented locally at `C:\dev\stillon` (granular conventional commits)
  - Unit tests green: 24 (tokens, resolve + secrecy invariant, handlers)
  - `npm run check` + `npm run build` green (including OG routes + workers-og)
  - Playwright config + e2e specs written; Chromium installed
  - Public GitHub `jasonwall1387/stillon` seeded (squashed snapshot without CI workflows - see Blocked)
- In progress: none in code
- Blocked (Jason):
  1. **Supabase project `stillon`** - not on this MCP org's `list_projects`. Create a dedicated project (never reuse TrueVIg / RWAI / Midwatch), run `supabase/migrations/0001_init.sql`, put `SUPABASE_URL` + `SUPABASE_SECRET_KEY` (`sb_secret_...`) in Infisical and `.dev.vars`.
  2. Fill remaining `.dev.vars` from Infisical (`RESEND_API_KEY`, `TOKEN_PEPPER`, `ADMIN_SECRET`).
  3. GitHub auth: `gh auth refresh -h github.com -s workflow` then from `C:\dev\stillon` run `git push --force-with-lease` so local history + `.github/workflows/*` land on origin.
  4. After secrets: `npm run e2e` (Task 9).
  5. `wrangler secret put` x5, add `vars.PUBLIC_SITE_URL` in wrangler.jsonc, `npm run deploy`.
  6. Cloudflare custom domain stillon.io, Web Analytics, GitHub Actions secret `ADMIN_SECRET`.
- Next: Jason unblocks Supabase + Infisical + workflow scope -> resume Tasks 9-10.

