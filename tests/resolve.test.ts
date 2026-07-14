import { describe, it, expect } from 'vitest';
import { resolveStatus, isExpired, buildViewState } from '../src/lib/resolve';
import type { CheckRow, Vote } from '../src/lib/types';

const NOW = new Date('2026-07-14T12:00:00Z');
const FUTURE = '2026-07-15T12:00:00Z';
const PAST = '2026-07-13T12:00:00Z';

function check(overrides: Partial<CheckRow> = {}): CheckRow {
  return {
    id: 'c1', title: 'Dinner Friday', event_at: null,
    created_at: '2026-07-14T10:00:00Z', expires_at: FUTURE,
    status: 'open', resolved_at: null,
    creator_hash: 'ch', invitee_hash: 'ih', og_id: 'og1',
    creator_vote: 'on', creator_voted_at: '2026-07-14T10:00:00Z',
    invitee_vote: null, invitee_voted_at: null,
    notify_email: null, notified_at: null, title_purged: false, ip_hash: 'x',
    ...overrides,
  };
}

describe('resolveStatus', () => {
  it('cancels only on mutual bail', () => {
    expect(resolveStatus('bail', 'bail')).toBe('cancelled');
    expect(resolveStatus('on', 'bail')).toBe('stands');
    expect(resolveStatus('bail', 'on')).toBe('stands');
    expect(resolveStatus('on', 'on')).toBe('stands');
  });
});

describe('isExpired', () => {
  it('is true only for open checks past expires_at', () => {
    expect(isExpired(check({ expires_at: PAST }), NOW)).toBe(true);
    expect(isExpired(check({ expires_at: FUTURE }), NOW)).toBe(false);
    expect(isExpired(check({ status: 'stands', expires_at: PAST }), NOW)).toBe(false);
  });
});

describe('buildViewState - basics', () => {
  it('open check: creator sees own vote, invitee sees question', () => {
    const c = check({ creator_vote: 'bail' });
    expect(buildViewState(c, 'creator', NOW)).toEqual({
      kind: 'creator-open', id: 'c1', title: 'Dinner Friday',
      eventAt: null, myVote: 'bail', expiresAt: FUTURE,
    });
    expect(buildViewState(c, 'invitee', NOW)).toEqual({
      kind: 'invitee-open', id: 'c1', title: 'Dinner Friday', eventAt: null,
    });
  });

  it('open check past expiry renders expired for everyone', () => {
    const c = check({ expires_at: PAST });
    for (const role of ['creator', 'invitee', 'spectator'] as const) {
      expect(buildViewState(c, role, NOW)).toEqual({ kind: 'expired', id: 'c1', title: 'Dinner Friday' });
    }
  });

  it('cancelled renders celebration with ogId for everyone', () => {
    const c = check({ status: 'cancelled', creator_vote: 'bail', invitee_vote: 'bail', resolved_at: NOW.toISOString() });
    expect(buildViewState(c, 'creator', NOW)).toEqual({
      kind: 'resolved-cancelled', id: 'c1', title: 'Dinner Friday', ogId: 'og1',
    });
  });
});

describe('SECRECY INVARIANT (spec 3.3 - do not weaken these tests)', () => {
  const combos: Array<[Vote, Vote]> = [['on', 'on'], ['on', 'bail'], ['bail', 'on']];

  it('a keeper cannot distinguish why the plan stands (creator view)', () => {
    const fromKeep = buildViewState(check({ status: 'stands', creator_vote: 'on', invitee_vote: 'on' }), 'creator', NOW);
    const fromBail = buildViewState(check({ status: 'stands', creator_vote: 'on', invitee_vote: 'bail' }), 'creator', NOW);
    expect(fromKeep).toEqual(fromBail);
  });

  it('a keeper cannot distinguish why the plan stands (invitee view)', () => {
    const fromKeep = buildViewState(check({ status: 'stands', creator_vote: 'on', invitee_vote: 'on' }), 'invitee', NOW);
    const fromBail = buildViewState(check({ status: 'stands', creator_vote: 'bail', invitee_vote: 'on' }), 'invitee', NOW);
    expect(fromKeep).toEqual(fromBail);
  });

  it('no stands/expired/invitee-open state ever contains vote fields', () => {
    for (const [cv, iv] of combos) {
      const vs = buildViewState(check({ status: 'stands', creator_vote: cv, invitee_vote: iv }), 'invitee', NOW);
      expect(JSON.stringify(vs)).not.toContain('Vote');
      expect(vs).not.toHaveProperty('myVote');
      expect(vs).not.toHaveProperty('creatorVote');
      expect(vs).not.toHaveProperty('inviteeVote');
    }
    const inviteeOpen = buildViewState(check({ creator_vote: 'bail' }), 'invitee', NOW);
    expect(JSON.stringify(inviteeOpen)).not.toContain('bail');
  });

  it('the only kind that implies votes is resolved-cancelled', () => {
    const c = check({ status: 'cancelled', creator_vote: 'bail', invitee_vote: 'bail' });
    expect(buildViewState(c, 'spectator', NOW).kind).toBe('resolved-cancelled');
  });
});
