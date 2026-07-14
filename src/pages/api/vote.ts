import type { APIRoute } from 'astro';
import { castVote } from '../../lib/handlers';
import { json, makeDeps } from '../../lib/runtime';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  let body: Record<string, unknown>;
  try { body = await ctx.request.json(); } catch { return json({ error: 'Bad JSON.' }, 400); }
  const res = await castVote(makeDeps(ctx.locals, ctx.request), {
    slug: String(body.slug ?? ''), vote: body.vote as never,
  });
  if (!res.ok) return json({ error: res.error }, res.status);
  return json(res.view, res.status);
};
