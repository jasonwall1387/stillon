import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';

export default defineConfig({
  output: 'server',
  site: 'https://stillon.io',
  // No cookie-based auth exists (identity = capability URLs), so CSRF origin
  // checking protects nothing and blocks legitimate server-to-server POSTs
  // (the purge cron) with "Cross-site POST form submissions are forbidden".
  security: { checkOrigin: false },
  adapter: cloudflare({ platformProxy: { enabled: true } }),
  integrations: [react()],
  devToolbar: { enabled: false },
  vite: {
    ssr: { noExternal: ['workers-og'] },
  },
});
