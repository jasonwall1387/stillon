import type { APIRoute } from 'astro';
import { makeDb } from '../../../lib/db';
import { getEnv, json } from '../../../lib/runtime';

export const prerender = false;
const THIRTY_DAYS_MS = 30 * 24 * 3600_000;

export const POST: APIRoute = async (ctx) => {
  const env = getEnv(ctx.locals);
  if (ctx.request.headers.get('x-admin-secret') !== env.ADMIN_SECRET) {
    return json({ error: 'Forbidden' }, 403);
  }
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
  const purged = await makeDb(env).purgeOld(cutoff);
  return json({ purged });
};
