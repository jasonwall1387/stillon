import { defineMiddleware } from 'astro:middleware';

// Security headers on every SSR response. The capability slug lives in the URL path, so
// Referrer-Policy: no-referrer is the load-bearing one - it stops the slug leaking to the
// footer link's destination. No CSP here: it must be validated against the React islands
// (a wrong policy breaks hydration), so it is a deliberate fast-follow.
export const onRequest = defineMiddleware(async (_ctx, next) => {
  const res = await next();
  res.headers.set('Referrer-Policy', 'no-referrer');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.headers.set('X-Frame-Options', 'DENY');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  return res;
});
