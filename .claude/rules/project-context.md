# Project context

- Product decisions and research live in the spec (see AGENTS.md). Key ones:
  symmetric vibe-check framing (not cancel-only), no calendar integration in v1
  (Google API cannot let a non-organizer cancel; OAuth verification takes 3-6 weeks),
  no SMS (10DLC registration lead time), web push is v1.1.
- Data: single `checks` table + `events` funnel table. Capability slugs are stored
  only as sha256(slug + TOKEN_PEPPER) hashes.
- Expiry is LAZY (marked on read) + a daily purge endpoint hit by GitHub Actions cron.
- Launch metric: invitees who voted (not signups).

## Deployment gotchas (2026-07-14, both cost real debugging)
- Cloudflare **Browser Integrity Check** (default ON for new zones) bans non-browser
  UAs with error 1010 BEFORE the Worker sees the request. It blocked the purge cron
  and all curl/python testing. Turned OFF zone-wide (in-app webviews are false-positive
  prone and the viral loop cannot afford them). If it gets re-enabled, the cron breaks.
- Astro 5 `security.checkOrigin` (default ON for output:'server') 403s any POST without
  a matching Origin header ("Cross-site POST form submissions are forbidden") - browsers
  pass, server-to-server calls fail. Disabled in astro.config.mjs: this app has no cookie
  auth, so CSRF checking protects nothing. Do not re-enable without adding an Origin
  header to the purge workflow.
- The stillon Supabase project lives in the "Jason Labs" free org and is INVISIBLE to
  the Supabase MCP (RWAI-org token). Manage it via dashboard or REST with the secret key.
