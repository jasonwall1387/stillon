const RETENTION_MS = 30 * 24 * 3600_000;
export interface RetentionStart {
  id: string;
  source: 'admin' | 'scheduled';
  mode: 'purge' | 'dry_run';
  status: 'running';
  started_at: string;
  cutoff_at: string;
  count: null;
}
export interface RetentionFinish {
  status: 'ok' | 'error';
  finished_at: string;
  count: number | null;
  error_code: 'purge_failed' | null;
}
export interface RetentionBackend {
  start(row: RetentionStart): Promise<void>;
  finish(id: string, outcome: RetentionFinish): Promise<void>;
  purge(cutoff: string, dryRun: boolean): Promise<number>;
}
export interface RetentionOptions {
  enabled?: string;
  source: RetentionStart['source'];
  dryRun?: boolean;
  now?: () => Date;
}
export type RetentionResult = { status: 'disabled' } | { status: 'ok'; count: number; runId: string };

/** Factory is deliberately lazy: dormant invocations must not even open a DB client. */
export async function runRetention(options: RetentionOptions, createBackend: () => RetentionBackend): Promise<RetentionResult> {
  if (options.enabled !== 'true') return { status: 'disabled' };
  try {
    const now = options.now ?? (() => new Date());
    const started = now();
    const row: RetentionStart = {
      id: crypto.randomUUID(), source: options.source, mode: options.dryRun ? 'dry_run' : 'purge',
      status: 'running', started_at: started.toISOString(),
      cutoff_at: new Date(started.getTime() - RETENTION_MS).toISOString(), count: null,
    };
    const backend = createBackend();
    await backend.start(row);
    let count: number;
    try {
      count = await backend.purge(row.cutoff_at, options.dryRun === true);
      if (!Number.isSafeInteger(count) || count < 0) throw Error('Invalid count');
    } catch {
      await backend.finish(row.id, { status: 'error', finished_at: now().toISOString(), count: null, error_code: 'purge_failed' });
      throw Error('Retention unavailable');
    }
    // A lost success acknowledgement must not overwrite a committed success with error.
    await backend.finish(row.id, { status: 'ok', finished_at: now().toISOString(), count, error_code: null });
    return { status: 'ok', count, runId: row.id };
  } catch {
    throw Error('Retention unavailable');
  }
}
