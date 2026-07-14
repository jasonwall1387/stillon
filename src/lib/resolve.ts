import type { CheckRow, Role, Status, ViewState, Vote } from './types';

export function resolveStatus(creatorVote: Vote, inviteeVote: Vote): 'cancelled' | 'stands' {
  return creatorVote === 'bail' && inviteeVote === 'bail' ? 'cancelled' : 'stands';
}

export function isExpired(check: Pick<CheckRow, 'status' | 'expires_at'>, now: Date): boolean {
  return check.status === 'open' && now.getTime() > new Date(check.expires_at).getTime();
}

export function buildViewState(check: CheckRow, role: Role | 'spectator', now: Date): ViewState {
  const status: Status = isExpired(check, now) ? 'expired' : check.status;
  const base = { id: check.id, title: check.title };

  if (status === 'cancelled') return { kind: 'resolved-cancelled', ...base, ogId: check.og_id };
  if (status === 'stands') return { kind: 'resolved-stands', ...base };
  if (status === 'expired') return { kind: 'expired', ...base };

  if (role === 'creator') {
    return {
      kind: 'creator-open', ...base, eventAt: check.event_at,
      myVote: check.creator_vote, expiresAt: check.expires_at,
    };
  }
  return { kind: 'invitee-open', ...base, eventAt: check.event_at };
}
