import type { SSRManifest } from 'astro';
import type { ScheduledController, ExecutionContext } from '@cloudflare/workers-types';
import { createExports as astroExports } from '@astrojs/cloudflare/entrypoints/server.js';
import { runConfiguredRetention } from './lib/retention-db';

export function createExports(manifest: SSRManifest) {
  const adapter = astroExports(manifest);
  return {
    default: {
      ...adapter.default,
      async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
        // No configured cron in this source preparation. Rejections remain failures.
        ctx.waitUntil(runConfiguredRetention(env, { source: 'scheduled' }).then(result => {
          console.log(JSON.stringify({ event: 'retention_tick', ...result }));
        }));
      },
    },
  };
}
