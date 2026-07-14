# STATUS - stillon

## 2026-07-14
- Done:
  - Tasks 0-10 complete. App live at https://stillon.airevenuestack-jason.workers.dev
  - Unit tests: 24 green. Playwright e2e: 3 green (hydration gate on CreateForm).
  - Secrets via wrangler secret put. PUBLIC_SITE_URL=https://stillon.io in wrangler vars.
  - Prod smoke: create -> mutual bail -> cancelled page + OG PNG + purge 403 without secret.
- In progress: none
- Blocked (Jason / post-deploy human steps):
  1. Cloudflare: custom domain `stillon.io` on Worker `stillon`.
  2. Enable Cloudflare Web Analytics; note the token.
  3. Add `ADMIN_SECRET` to GitHub Actions secrets (purge cron).
  4. Optionally Workers Builds for deploy-on-push.
- Next: launch assets (20s demo video, X post quoting @mattiekahn, r/InternetIsBeautiful).
