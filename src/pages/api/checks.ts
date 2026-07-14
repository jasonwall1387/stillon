import type { APIRoute } from 'astro';
import { createCheck } from '../../lib/handlers';
import { clientIp, json, makeDeps } from '../../lib/runtime';

export const prerender = false;

export const POST: APIRoute = async (ctx) => {
  let body: Record<string, unknown>;
  try { body = await ctx.request.json(); } catch { return json({ error: 'Bad JSON.' }, 400); }
  const res = await createCheck(makeDeps(ctx.locals, ctx.request), {
    title: String(body.title ?? ''),
    eventAt: body.eventAt ? String(body.eventAt) : undefined,
    creatorVote: body.creatorVote as never,
    notifyEmail: body.notifyEmail ? String(body.notifyEmail) : undefined,
    ip: clientIp(ctx),
  });
  if (!res.ok) return json({ error: res.error }, res.status);
  return json(res, 201);
};
