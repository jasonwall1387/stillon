import type { APIContext } from 'astro';
import { makeDb } from './db';
import { makeEmailSender } from './email';
import type { Deps } from './handlers';

export function getEnv(locals: App.Locals): Env {
  return locals.runtime.env;
}

export function makeDeps(locals: App.Locals, request: Request): Deps {
  const env = getEnv(locals);
  return {
    db: makeDb(env),
    now: () => new Date(),
    pepper: env.TOKEN_PEPPER,
    siteUrl: env.PUBLIC_SITE_URL ?? new URL(request.url).origin,
    sendResolutionEmail: makeEmailSender(env.RESEND_API_KEY),
  };
}

export function clientIp(ctx: APIContext): string {
  return ctx.request.headers.get('CF-Connecting-IP') ?? '127.0.0.1';
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}
