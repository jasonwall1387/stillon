import type { APIRoute } from 'astro';
import { runConfiguredRetention } from '../../../lib/retention-db';
import { getEnv, json } from '../../../lib/runtime';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  const env = getEnv(ctx.locals);
  if (!env.ADMIN_SECRET || ctx.request.headers.get('x-admin-secret') !== env.ADMIN_SECRET) {
    return json({ error: 'Forbidden' }, 403);
  }
  const dryRun = new URL(ctx.request.url).searchParams.get('dry_run') === '1';
  try {
    const result = await runConfiguredRetention(env, { source: 'admin', dryRun });
    if (result.status === 'disabled') return json({ error: 'Retention disabled' }, 503);
    const count = result.count;
    return json(dryRun ? { dryRun: true, eligible: count } : { purged: count });
  } catch {
    return json({ error: 'Retention unavailable' }, 503);
  }
};
