import { describe, it, expect, beforeEach } from 'vitest';
import { createCheck, castVote, loadView, RATE_LIMIT_PER_DAY, type Deps } from '../src/lib/handlers';
import type { Db, NewCheck } from '../src/lib/db';
import type { CheckRow, Vote } from '../src/lib/types';
import { hashSlug } from '../src/lib/tokens';

const PEPPER = 'test-pepper';
const NOW = new Date('2026-07-14T12:00:00Z');

function fakeDb() {
  const rows = new Map<string, CheckRow>();
  const events: string[] = [];
  const db: Db = {
    async insertCheck(r: NewCheck) {
      rows.set(r.id, {
        ...r, created_at: NOW.toISOString(), status: 'open', resolved_at: null,
        creator_voted_at: NOW.toISOString(), invitee_vote: null, invitee_voted_at: null,
        notified_at: null, title_purged: false,
      });
    },
    async findBySlugHash(hash) {
      for (const check of rows.values()) {
        if (check.creator_hash === hash) return { check, role: 'creator' };
        if (check.invitee_hash === hash) return { check, role: 'invitee' };
      }
      return null;
    },
    async findByOgId(ogId) {
      for (const c of rows.values()) if (c.og_id === ogId) return { title: c.title, status: c.status };
      return null;
    },
    async claimInviteeVote(id, vote, status, resolvedAt) {
      const c = rows.get(id);
      if (!c || c.status !== 'open' || c.invitee_vote !== null) return null;
      Object.assign(c, { invitee_vote: vote, invitee_voted_at: resolvedAt, status, resolved_at: resolvedAt });
      return c;
    },
    async setCreatorVote(id, vote) {
      const c = rows.get(id);
      if (!c || c.status !== 'open' || c.invitee_vote !== null) return null;
      c.creator_vote = vote;
      return c;
    },
    async markExpired(id) {
      const c = rows.get(id);
      if (c && c.status === 'open') c.status = 'expired';
    },
    async countRecentByIp(ipHash) {
      return [...rows.values()].filter((c) => c.ip_hash === ipHash).length;
    },
    async insertEvent(kind) { events.push(kind); },
    async purgeOld() { return 0; },
  };
  return { db, rows, events };
}

function makeDeps(db: Db, emails: Array<{ to: string; status: string }> = []): Deps {
  return {
    db, now: () => NOW, pepper: PEPPER, siteUrl: 'https://stillon.io',
    async sendResolutionEmail(to, status) { emails.push({ to, status }); },
  };
}

async function createOne(deps: Deps, vote: Vote = 'bail', extra: Record<string, string> = {}) {
  const res = await createCheck(deps, { title: 'Dinner Friday', creatorVote: vote, ip: '1.2.3.4', ...extra });
  if (!res.ok) throw new Error(res.error);
  return res;
}

describe('createCheck', () => {
  let f: ReturnType<typeof fakeDb>;
  beforeEach(() => { f = fakeDb(); });

  it('creates a check and returns both capability urls', async () => {
    const res = await createOne(makeDeps(f.db));
    expect(res.creatorUrl).toMatch(/^https:\/\/stillon\.io\/c\/[0-9A-Za-z]{24}$/);
    expect(res.shareUrl).toMatch(/^https:\/\/stillon\.io\/v\/[0-9A-Za-z]{24}$/);
    const row = [...f.rows.values()][0];
    expect(row.title).toBe('Dinner Friday');
    expect(row.expires_at).toBe(new Date(NOW.getTime() + 72 * 3600_000).toISOString());
    // Slugs are stored hashed, never raw.
    const creatorSlug = res.creatorUrl.split('/c/')[1];
    expect(row.creator_hash).toBe(await hashSlug(creatorSlug, PEPPER));
  });

  it('uses event_at as expiry when provided, and rejects past event_at', async () => {
    const future = '2026-07-20T00:00:00Z';
    const res = await createOne(makeDeps(f.db), 'on', { eventAt: future });
    expect(res.ok).toBe(true);
    expect([...f.rows.values()][0].expires_at).toBe(new Date(future).toISOString());
    const bad = await createCheck(makeDeps(f.db), { title: 'x', creatorVote: 'on', eventAt: '2020-01-01T00:00:00Z', ip: '1.1.1.1' });
    expect(bad.ok).toBe(false);
  });

  it('validates title and vote', async () => {
    const deps = makeDeps(f.db);
    expect((await createCheck(deps, { title: '  ', creatorVote: 'on', ip: 'i' })).ok).toBe(false);
    expect((await createCheck(deps, { title: 'x'.repeat(81), creatorVote: 'on', ip: 'i' })).ok).toBe(false);
    expect((await createCheck(deps, { title: 'ok', creatorVote: 'maybe' as never, ip: 'i' })).ok).toBe(false);
  });

  it('rate limits per ip', async () => {
    const deps = makeDeps(f.db);
    for (let i = 0; i < RATE_LIMIT_PER_DAY; i++) await createOne(deps);
    const res = await createCheck(deps, { title: 'one more', creatorVote: 'on', ip: '1.2.3.4' });
    expect(res).toMatchObject({ ok: false, status: 429 });
  });
});

describe('castVote', () => {
  let f: ReturnType<typeof fakeDb>;
  let emails: Array<{ to: string; status: string }>;
  let deps: Deps;
  beforeEach(() => { f = fakeDb(); emails = []; deps = makeDeps(f.db, emails); });

  function slugOf(url: string) { return url.split('/').pop()!; }

  it('mutual bail cancels and emails the creator', async () => {
    const res = await createOne(deps, 'bail', { notifyEmail: 'a@example.com' });
    const out = await castVote(deps, { slug: slugOf(res.shareUrl), vote: 'bail' });
    expect(out.view?.kind).toBe('resolved-cancelled');
    expect(emails).toEqual([{ to: 'a@example.com', status: 'cancelled' }]);
  });

  it('mixed votes stand, and keeper email says stands', async () => {
    const res = await createOne(deps, 'bail', { notifyEmail: 'a@example.com' });
    const out = await castVote(deps, { slug: slugOf(res.shareUrl), vote: 'on' });
    expect(out.view?.kind).toBe('resolved-stands');
    expect(emails).toEqual([{ to: 'a@example.com', status: 'stands' }]);
  });

  it('creator can flip their vote while open, not after resolution', async () => {
    const res = await createOne(deps, 'on');
    const flip = await castVote(deps, { slug: slugOf(res.creatorUrl), vote: 'bail' });
    expect(flip.view).toMatchObject({ kind: 'creator-open', myVote: 'bail' });
    await castVote(deps, { slug: slugOf(res.shareUrl), vote: 'bail' });   // resolves: cancelled
    const late = await castVote(deps, { slug: slugOf(res.creatorUrl), vote: 'on' });
    expect(late.view?.kind).toBe('resolved-cancelled');                   // no change, just current state
  });

  it('second invitee vote does not double-resolve', async () => {
    const res = await createOne(deps, 'bail');
    await castVote(deps, { slug: slugOf(res.shareUrl), vote: 'on' });
    const again = await castVote(deps, { slug: slugOf(res.shareUrl), vote: 'bail' });
    expect(again.view?.kind).toBe('resolved-stands');                     // first vote won
  });

  it('voting on an expired check returns expired', async () => {
    const res = await createOne(deps, 'bail');
    const row = [...f.rows.values()][0];
    row.expires_at = '2026-07-14T11:00:00Z'; // 1h before NOW
    const out = await castVote(deps, { slug: slugOf(res.shareUrl), vote: 'bail' });
    expect(out.view?.kind).toBe('expired');
    expect(row.status).toBe('expired');      // lazily marked
  });

  it('unknown slug 404s', async () => {
    const out = await castVote(deps, { slug: 'nope'.repeat(6), vote: 'on' });
    expect(out).toMatchObject({ ok: false, status: 404 });
  });
});

describe('loadView', () => {
  it('returns role-scoped view and never leaks the other vote (invariant at handler level)', async () => {
    const f = fakeDb();
    const deps = makeDeps(f.db);
    const res = await createOne(deps, 'bail');
    const inviteeView = await loadView(deps, res.shareUrl.split('/').pop()!);
    expect(inviteeView?.role).toBe('invitee');
    expect(JSON.stringify(inviteeView!.view)).not.toContain('bail');
  });

  it('is side-effect-free for open, unexpired checks (prefetcher safety)', async () => {
    const f = fakeDb();
    const deps = makeDeps(f.db);
    const res = await createOne(deps, 'bail');
    const before = JSON.stringify([...f.rows.values()][0]);
    await loadView(deps, res.shareUrl.split('/').pop()!);
    await loadView(deps, res.creatorUrl.split('/').pop()!);
    expect(JSON.stringify([...f.rows.values()][0])).toBe(before);
  });
});
