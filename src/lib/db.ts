import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CheckRow, Role, Vote } from './types';

export interface NewCheck {
  id: string; title: string; event_at: string | null; expires_at: string;
  creator_hash: string; invitee_hash: string; og_id: string;
  creator_vote: Vote; notify_email: string | null; ip_hash: string;
}

export interface Db {
  insertCheck(row: NewCheck): Promise<void>;
  findBySlugHash(hash: string): Promise<{ check: CheckRow; role: Role } | null>;
  findByOgId(ogId: string): Promise<Pick<CheckRow, 'title' | 'status'> | null>;
  claimInviteeVote(id: string, vote: Vote, resolvedAt: string): Promise<CheckRow | null>;
  setCreatorVote(id: string, vote: Vote): Promise<CheckRow | null>;
  markExpired(id: string): Promise<void>;
  countRecentByIp(ipHash: string, sinceIso: string): Promise<number>;
  insertEvent(kind: string, checkId?: string): Promise<void>;
  purgeOld(cutoffIso: string): Promise<number>;
}

export function makeDb(env: { SUPABASE_URL: string; SUPABASE_SECRET_KEY: string }): Db {
  const sb: SupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async insertCheck(row) {
      const { error } = await sb.from('checks').insert(row);
      if (error) throw new Error(`insertCheck: ${error.message}`);
    },

    async findBySlugHash(hash) {
      const { data, error } = await sb
        .from('checks')
        .select('*')
        .or(`creator_hash.eq.${hash},invitee_hash.eq.${hash}`)
        .maybeSingle();
      if (error) throw new Error(`findBySlugHash: ${error.message}`);
      if (!data) return null;
      const check = data as CheckRow;
      return { check, role: check.creator_hash === hash ? 'creator' : 'invitee' };
    },

    async findByOgId(ogId) {
      const { data, error } = await sb
        .from('checks').select('title,status').eq('og_id', ogId).maybeSingle();
      if (error) throw new Error(`findByOgId: ${error.message}`);
      return (data as Pick<CheckRow, 'title' | 'status'> | null) ?? null;
    },

    async claimInviteeVote(id, vote, resolvedAt) {
      // Resolve atomically in Postgres: status is computed there under the row lock from the
      // current creator_vote, so a concurrent creator vote-flip cannot leave a stale status.
      const { data, error } = await sb
        .rpc('resolve_invitee_vote', { p_id: id, p_vote: vote, p_now: resolvedAt })
        .maybeSingle();
      if (error) throw new Error(`claimInviteeVote: ${error.message}`);
      return (data as CheckRow | null) ?? null;
    },

    async setCreatorVote(id, vote) {
      const { data, error } = await sb
        .from('checks')
        .update({ creator_vote: vote, creator_voted_at: new Date().toISOString() })
        .eq('id', id).eq('status', 'open').is('invitee_vote', null)
        .select().maybeSingle();
      if (error) throw new Error(`setCreatorVote: ${error.message}`);
      return (data as CheckRow | null) ?? null;
    },

    async markExpired(id) {
      const { error } = await sb
        .from('checks').update({ status: 'expired' })
        .eq('id', id).eq('status', 'open');
      if (error) throw new Error(`markExpired: ${error.message}`);
    },

    async countRecentByIp(ipHash, sinceIso) {
      const { count, error } = await sb
        .from('checks').select('id', { count: 'exact', head: true })
        .eq('ip_hash', ipHash).gte('created_at', sinceIso);
      if (error) throw new Error(`countRecentByIp: ${error.message}`);
      return count ?? 0;
    },

    async insertEvent(kind, checkId) {
      // Best-effort analytics; never throw.
      await sb.from('events').insert({ kind, check_id: checkId ?? null }).then(() => {}, () => {});
    },

    async purgeOld(cutoffIso) {
      const { data, error } = await sb
        .from('checks')
        .update({ title: '(purged)', notify_email: null, title_purged: true })
        .neq('status', 'open').eq('title_purged', false)
        .lt('expires_at', cutoffIso)
        .select('id');
      if (error) throw new Error(`purgeOld: ${error.message}`);
      return data?.length ?? 0;
    },
  };
}
