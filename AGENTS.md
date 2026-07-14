# stillon - Still On? (stillon.io)

Link-based mutual-cancel vibe check. Two people privately answer "still on or bail?";
the plan is cancelled only if BOTH said bail. One-sided bails are never revealed.

Spec: C:\dev\docs\superpowers\specs\2026-07-14-stillon-design.md

## Stack
Astro 5 SSR + @astrojs/cloudflare on Workers. Supabase Postgres (SERVER-SIDE ONLY,
service key). React islands. Vitest + Playwright.

## Commands
npm run dev / build / test / e2e / check / deploy (wrangler)

## Hard rules
- SECRECY INVARIANT: never expose the other party's vote unless status = cancelled.
  No "both in!" screen. See spec 3.3. Tests in tests/resolve.test.ts enforce it.
- GET routes are side-effect-free (link prefetchers). Claims/votes happen on POST only.
- No client-side Supabase, ever. No accounts. No cookies except the non-secret
  so_own_{id} creator marker.
- Secrets from Infisical -> .dev.vars / wrangler secret put. Never committed.
- No em dashes in copy or docs (use " - "). Never the word "straightforward".
- All user-facing strings live in src/lib/copy.ts.

Cursor/Codex agents: read every file in .claude/rules/ at session start.
