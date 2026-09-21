import { describe, expect, it, vi } from 'vitest';
import { runRetention } from '../src/lib/retention';

function harness() {
  const rows: any[] = [];
  const backend = {
    start: vi.fn(async (row: any) => { rows.push({ ...row }); }),
    finish: vi.fn(async (id: string, patch: any) => { Object.assign(rows.find(row => row.id === id), patch); }),
    purge: vi.fn(async () => 0),
  };
  const factory = vi.fn(() => backend);
  return { rows, backend, factory };
}
const opts = { enabled: 'true', source: 'scheduled' as const, now: () => new Date('2026-09-21T00:00:00Z') };
describe('durable retention runner', () => {
  it.each([undefined, 'false', 'TRUE', '1'])('disabled %s never opens a DB connection', async enabled => {
    const h = harness();
    expect(await runRetention({ ...opts, enabled }, h.factory)).toEqual({ status: 'disabled' });
    expect(h.factory).not.toHaveBeenCalled();
  });
  it('persists running before purge and true zero as a successful outcome', async () => {
    const h = harness();
    h.backend.purge.mockImplementation(async () => { expect(h.rows[0].status).toBe('running'); return 0; });
    expect(await runRetention(opts, h.factory)).toMatchObject({ status: 'ok', count: 0 });
    expect(h.rows[0]).toMatchObject({ status: 'ok', count: 0, cutoff_at: '2026-08-22T00:00:00.000Z', finished_at: '2026-09-21T00:00:00.000Z' });
  });
  it('does not purge when durable start fails', async () => {
    const h = harness();h.backend.start.mockRejectedValue(Error('backend secret'));
    await expect(runRetention(opts, h.factory)).rejects.toThrow('Retention unavailable');
    expect(h.backend.purge).not.toHaveBeenCalled();
  });
  it('records a redacted error instead of a false successful zero', async () => {
    const h = harness();h.backend.purge.mockRejectedValue(Error('private title and backend secret'));
    await expect(runRetention(opts, h.factory)).rejects.toThrow('Retention unavailable');
    expect(h.rows[0]).toMatchObject({ status: 'error', error_code: 'purge_failed', count: null });
    expect(JSON.stringify(h.rows)).not.toContain('private');
  });
  it('leaves running evidence when final acknowledgement fails', async () => {
    const h = harness();h.backend.finish.mockRejectedValue(Error('storage unavailable'));
    await expect(runRetention(opts, h.factory)).rejects.toThrow('Retention unavailable');
    expect(h.rows[0].status).toBe('running');
    expect(h.backend.finish).toHaveBeenCalledTimes(1);
  });
  it('keeps dry-run success distinct from a real purge', async () => {
    const h = harness();h.backend.purge.mockResolvedValue(7);
    await runRetention({ ...opts, dryRun: true }, h.factory);
    expect(h.backend.purge).toHaveBeenCalledWith('2026-08-22T00:00:00.000Z', true);
    expect(h.rows[0]).toMatchObject({ mode: 'dry_run', status: 'ok', count: 7 });
  });
});
