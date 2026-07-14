import type { APIRoute } from 'astro';
import { makeDb } from '../../../lib/db';
import { getEnv } from '../../../lib/runtime';
import { renderCard } from '../[ogId].png';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const env = getEnv(ctx.locals);
  const row = await makeDb(env).findByOgId(ctx.params.ogId ?? '');
  if (!row || row.status !== 'cancelled') return new Response('Not found', { status: 404 });
  const title = row.title.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return renderCard(ctx.request, env, `🎉 OFFICIALLY CANCELLED`, `"${title}" - nobody had to be the bad guy.`);
};
