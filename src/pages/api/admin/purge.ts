import type { APIRoute } from 'astro';
import { makeDb } from '../../../lib/db';
import { getEnv, json } from '../../../lib/runtime';

export const prerender = false;
const THIRTY_DAYS_MS = 30 * 24 * 3600_000;

export const POST: APIRoute = async (ctx) => {
  const env = getEnv(ctx.locals);
  if (!env.ADMIN_SECRET || ctx.request.headers.get('x-admin-secret') !== env.ADMIN_SECRET) {
    return json({ error: 'Forbidden' }, 403);
  }
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
  const dryRun = new URL(ctx.request.url).searchParams.get('dry_run') === '1';
  try {
    const count = await makeDb(env).purgeOld(cutoff, dryRun);
    return json(dryRun ? { dryRun: true, eligible: count } : { purged: count });
  } catch {
    return json({ error: 'Retention unavailable' }, 503);
  }
};
