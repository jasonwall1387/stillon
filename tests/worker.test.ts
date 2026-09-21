import { describe, it, expect, vi, beforeEach } from 'vitest';
import config from '../wrangler.jsonc?raw';
const mocks=vi.hoisted(()=>({fetch:vi.fn(),run:vi.fn()}));
vi.mock('@astrojs/cloudflare/entrypoints/server.js',()=>({createExports:()=>({default:{fetch:mocks.fetch}})}));
vi.mock('../src/lib/retention-db',()=>({runConfiguredRetention:mocks.run}));
import { createExports } from '../src/worker';
beforeEach(()=>vi.clearAllMocks());
describe('scheduled entry',()=>{
  it('preserves adapter fetch and binds the retention promise to waitUntil',async()=>{
    const worker=createExports({} as any).default;
    expect(worker.fetch).toBe(mocks.fetch);
    mocks.run.mockResolvedValue({status:'disabled'});
    const promises:Promise<unknown>[]=[];
    const env={RETENTION_ENABLED:'false'};
    await worker.scheduled({} as any,env as any,{waitUntil:(p:Promise<unknown>)=>promises.push(p)} as any);
    expect(mocks.run).toHaveBeenCalledWith(env,{source:'scheduled'});
    expect(promises).toHaveLength(1);await promises[0];
  });
  it('keeps ledger failures rejected for cron outcome reporting',async()=>{
    mocks.run.mockRejectedValue(Error('Retention unavailable'));
    let task:Promise<unknown>|undefined;
    await createExports({} as any).default.scheduled({} as any,{} as any,{waitUntil:(p:Promise<unknown>)=>{task=p;}} as any);
    await expect(task).rejects.toThrow('Retention unavailable');
  });
  it('ships disabled with no configured cron',()=>{
    expect(config).toContain('"RETENTION_ENABLED": "false"');
    expect(config).not.toMatch(/"triggers"\s*:/);
  });
});
