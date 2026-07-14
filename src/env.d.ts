/// <reference types="astro/client" />

type Env = {
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
  RESEND_API_KEY: string;
  TOKEN_PEPPER: string;
  ADMIN_SECRET: string;
  PUBLIC_SITE_URL?: string;
  ASSETS: { fetch: typeof fetch };
};

type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {}
}
