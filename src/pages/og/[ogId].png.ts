import type { APIRoute } from 'astro';
import { ImageResponse } from 'workers-og';
import { makeDb } from '../../lib/db';
import { getEnv } from '../../lib/runtime';
import { COPY } from '../../lib/copy';

export const prerender = false;

export async function renderCard(
  request: Request, env: Env, heading: string, sub: string,
): Promise<Response> {
  const cache = (caches as unknown as { default: Cache }).default;
  const cached = await cache.match(request);
  if (cached) return cached;

  // ASSETS serves built files in production; astro dev serves public/ directly,
  // so fall back to a plain fetch when the binding is missing or misses.
  const fontUrl = new URL('/fonts/inter-600.woff', request.url);
  let fontRes = await env.ASSETS?.fetch(fontUrl).catch(() => null);
  if (!fontRes || !fontRes.ok) fontRes = await fetch(fontUrl);
  const font = await fontRes.arrayBuffer();

  const html = `
    <div style="display:flex;flex-direction:column;justify-content:center;align-items:flex-start;
                width:100%;height:100%;background:#0f0e17;padding:80px;">
      <div style="display:flex;font-size:34px;color:#ff8906;">${COPY.brand}</div>
      <div style="display:flex;font-size:72px;color:#fffffe;margin-top:24px;max-width:1040px;">${heading}</div>
      <div style="display:flex;font-size:32px;color:#a7a9be;margin-top:24px;">${sub}</div>
    </div>`;

  const res = new ImageResponse(html, {
    width: 1200, height: 630,
    fonts: [{ name: 'Inter', data: font, weight: 600, style: 'normal' }],
  });
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400');
  await cache.put(request, out.clone()).catch(() => {});
  return out;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export const GET: APIRoute = async (ctx) => {
  const env = getEnv(ctx.locals);
  const row = await makeDb(env).findByOgId(ctx.params.ogId ?? '');
  if (!row) return new Response('Not found', { status: 404 });
  return renderCard(ctx.request, env, `Still on for "${esc(row.title)}"? 👀`, COPY.ogSubtitle);
};
