import type { Db } from './db';
import type { Role, ViewState, Vote } from './types';
import { buildViewState, isExpired } from './resolve';
import { hashSlug, newId, newOgId, newSlug } from './tokens';

// Per-IP per rolling 24h. 100 (not 20) so shared NAT - corporate/university/mobile-carrier
// networks where many real users share one public IP - does not false-reject during a launch spike.
export const RATE_LIMIT_PER_DAY = 100;
const SEVENTY_TWO_HOURS_MS = 72 * 3600_000;
const DAY_MS = 24 * 3600_000;

export interface Deps {
  db: Db;
  now(): Date;
  pepper: string;
  siteUrl: string;
  sendResolutionEmail(to: string, status: 'cancelled' | 'stands', title: string): Promise<void>;
}

export interface CreateInput { title: string; eventAt?: string; creatorVote: Vote; notifyEmail?: string; ip: string }
export type CreateResult =
  | { ok: true; id: string; creatorUrl: string; shareUrl: string }
  | { ok: false; status: number; error: string };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function createCheck(deps: Deps, input: CreateInput): Promise<CreateResult> {
  const title = (input.title ?? '').replace(/\p{Cc}/gu, ' ').trim();
  if (title.length < 1 || title.length > 80) return { ok: false, status: 400, error: 'Title must be 1-80 characters.' };
  if (input.creatorVote !== 'on' && input.creatorVote !== 'bail') return { ok: false, status: 400, error: 'Invalid vote.' };

  const now = deps.now();
  let eventAt: string | null = null;
  if (input.eventAt) {
    const t = new Date(input.eventAt);
    if (Number.isNaN(t.getTime())) return { ok: false, status: 400, error: 'Invalid date.' };
    if (t.getTime() <= now.getTime()) return { ok: false, status: 400, error: 'The plan time must be in the future.' };
    eventAt = t.toISOString();
  }

  const notifyEmail = input.notifyEmail?.trim() || null;
  if (notifyEmail && !EMAIL_RE.test(notifyEmail)) return { ok: false, status: 400, error: 'Invalid email.' };

  const ipHash = await hashSlug(input.ip, deps.pepper);
  const since = new Date(now.getTime() - DAY_MS).toISOString();
  if ((await deps.db.countRecentByIp(ipHash, since)) >= RATE_LIMIT_PER_DAY) {
    return { ok: false, status: 429, error: 'Too many vibe checks today. Try tomorrow.' };
  }

  const id = newId();
  const creatorSlug = newSlug();
  const inviteeSlug = newSlug();
  await deps.db.insertCheck({
    id, title, event_at: eventAt,
    expires_at: eventAt ?? new Date(now.getTime() + SEVENTY_TWO_HOURS_MS).toISOString(),
    creator_hash: await hashSlug(creatorSlug, deps.pepper),
    invitee_hash: await hashSlug(inviteeSlug, deps.pepper),
    og_id: newOgId(), creator_vote: input.creatorVote, notify_email: notifyEmail, ip_hash: ipHash,
  });
  await deps.db.insertEvent('created', id);

  return {
    ok: true, id,
    creatorUrl: `${deps.siteUrl}/c/${creatorSlug}`,
    shareUrl: `${deps.siteUrl}/v/${inviteeSlug}`,
  };
}

export async function loadView(deps: Deps, slug: string): Promise<{ view: ViewState; role: Role } | null> {
  const found = await deps.db.findBySlugHash(await hashSlug(slug, deps.pepper));
  if (!found) return null;
  const now = deps.now();
  if (isExpired(found.check, now)) {
    await deps.db.markExpired(found.check.id);   // idempotent, reveals nothing
    found.check.status = 'expired';
  }
  return { view: buildViewState(found.check, found.role, now), role: found.role };
}

export async function castVote(
  deps: Deps, input: { slug: string; vote: Vote },
): Promise<{ ok: boolean; status: number; view?: ViewState; error?: string }> {
  if (input.vote !== 'on' && input.vote !== 'bail') return { ok: false, status: 400, error: 'Invalid vote.' };
  const found = await deps.db.findBySlugHash(await hashSlug(input.slug, deps.pepper));
  if (!found) return { ok: false, status: 404, error: 'Not found.' };

  const now = deps.now();
  const { check, role } = found;

  if (isExpired(check, now)) {
    await deps.db.markExpired(check.id);
    check.status = 'expired';
    return { ok: true, status: 200, view: buildViewState(check, role, now) };
  }

  if (check.status !== 'open') {
    return { ok: true, status: 200, view: buildViewState(check, role, now) };
  }

  if (role === 'creator') {
    const updated = await deps.db.setCreatorVote(check.id, input.vote);
    const current = updated ?? (await deps.db.findBySlugHash(await hashSlug(input.slug, deps.pepper)))!.check;
    return { ok: true, status: 200, view: buildViewState(current, 'creator', now) };
  }

  // Invitee vote resolves the check atomically in Postgres; status is computed there under the
  // row lock from the current creator_vote (closes the creator-flip TOCTOU). First vote wins.
  const claimed = await deps.db.claimInviteeVote(check.id, input.vote, now.toISOString());
  if (!claimed) {
    const fresh = (await deps.db.findBySlugHash(await hashSlug(input.slug, deps.pepper)))!.check;
    return { ok: true, status: 200, view: buildViewState(fresh, 'invitee', now) };
  }

  const status = claimed.status as 'cancelled' | 'stands';
  await deps.db.insertEvent(status === 'cancelled' ? 'resolved_cancelled' : 'resolved_stands', check.id);
  if (claimed.notify_email) {
    try { await deps.sendResolutionEmail(claimed.notify_email, status, claimed.title); } catch { /* best effort */ }
  }
  return { ok: true, status: 200, view: buildViewState(claimed, 'invitee', now) };
}
