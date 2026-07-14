# STATUS - stillon

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
