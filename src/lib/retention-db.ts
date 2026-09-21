import { createClient } from '@supabase/supabase-js';
import { makeDb } from './db';
import { runRetention, type RetentionBackend, type RetentionOptions } from './retention';

type RetentionEnv = Pick<Env, 'SUPABASE_URL' | 'SUPABASE_SECRET_KEY' | 'RETENTION_ENABLED'>;
export function makeRetentionBackend(env: RetentionEnv): RetentionBackend {
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return {
    async start(row) {
      const { data, error } = await sb.from('retention_runs').insert(row).select('id').single();
      if (error || data?.id !== row.id) throw Error('Retention ledger unavailable');
    },
    async finish(id, outcome) {
      const { data, error } = await sb.from('retention_runs').update(outcome)
        .eq('id', id).eq('status', 'running').select('id').single();
      if (error || data?.id !== id) throw Error('Retention ledger unavailable');
    },
    purge: (cutoff, dryRun) => makeDb(env).purgeOld(cutoff, dryRun),
  };
}
export function runConfiguredRetention(env: RetentionEnv, options: Omit<RetentionOptions, 'enabled'>) {
  return runRetention({ ...options, enabled: env.RETENTION_ENABLED }, () => makeRetentionBackend(env));
}
