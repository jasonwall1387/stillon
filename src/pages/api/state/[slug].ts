import type { APIRoute } from 'astro';
import { loadView } from '../../../lib/handlers';
import { json, makeDeps } from '../../../lib/runtime';

export const prerender = false;

export const GET: APIRoute = async (ctx) => {
  const slug = ctx.params.slug ?? '';
  const res = await loadView(makeDeps(ctx.locals, ctx.request), slug);
  if (!res) return json({ error: 'Not found.' }, 404);
  return json(res.view);
};
