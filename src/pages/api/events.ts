import type { APIRoute } from 'astro';
import { json, makeDeps } from '../../lib/runtime';

export const prerender = false;
const ALLOWED = new Set(['invitee_viewed', 'share_clicked', 'cta_clicked']);

export const POST: APIRoute = async (ctx) => {
  try {
    const body = await ctx.request.json();
    const kind = String(body.kind ?? '');
    if (ALLOWED.has(kind)) {
      await makeDeps(ctx.locals, ctx.request).db.insertEvent(kind, body.checkId ? String(body.checkId) : undefined);
    }
  } catch { /* ignore */ }
  return json({ ok: true });
};
