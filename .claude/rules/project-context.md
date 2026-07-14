# Project context

- Product decisions and research live in the spec (see AGENTS.md). Key ones:
  symmetric vibe-check framing (not cancel-only), no calendar integration in v1
  (Google API cannot let a non-organizer cancel; OAuth verification takes 3-6 weeks),
  no SMS (10DLC registration lead time), web push is v1.1.
- Data: single `checks` table + `events` funnel table. Capability slugs are stored
  only as sha256(slug + TOKEN_PEPPER) hashes.
- Expiry is LAZY (marked on read) + a daily purge endpoint hit by GitHub Actions cron.
- Launch metric: invitees who voted (not signups).
