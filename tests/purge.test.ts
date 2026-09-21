import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({ rows: [] as any[], failed: false, creates: 0 }));
vi.mock('@supabase/supabase-js', () => ({ createClient: () => {
  state.creates++;
  return { from: (table:string) => {
    if(table==='retention_runs') {
      let id:string;
      const ledger:any={insert:(row:any)=>{id=row.id;return ledger;},update:()=>ledger,
        eq:(key:string,value:string)=>{if(key==='id')id=value;return ledger;},select:()=>ledger,
        single:async()=>({data:{id},error:null})};
      return ledger;
    }
    let dry=false, cutoff='', patch:any=null;
    const q:any={
      update: (value:any)=>{patch=value;return q;},
      select: (_columns:string,opts?:any)=>{if(opts?.head)dry=true;return q;},
      eq: ()=>q,
      lt: (_column:string,value:string)=>{cutoff=value;return q;},
      then: (done:any)=>{
        if(state.failed)return Promise.resolve(done({error:{message:'private backend detail'}}));
        const rows=state.rows.filter(r=>!r.title_purged && r.expires_at<cutoff);
        if(!dry)for(const r of rows)Object.assign(r,patch);
        return Promise.resolve(done({data:dry?null:rows.map(r=>({id:r.id})),count:rows.length,error:null}));
      },
    };return q;
  }};
}}));
import { makeDb } from '../src/lib/db';
import { POST } from '../src/pages/api/admin/purge';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_SECRET_KEY:'test-key',ADMIN_SECRET:'synthetic-secret',RETENTION_ENABLED:'true'};
const cutoff='2026-08-01T00:00:00.000Z';
beforeEach(()=>{state.rows=[];state.failed=false;state.creates=0;});
describe('retention',()=>{
  it('scrubs expired untouched open rows, preserves votes/status, boundary and already scrubbed rows',async()=>{
    state.rows=[{id:'a',title:'private',notify_email:'test@example.com',title_purged:false,status:'open',creator_vote:'bail',expires_at:'2026-07-01T00:00:00.000Z'},
      {id:'b',title:'boundary',title_purged:false,expires_at:cutoff},
      {id:'c',title:'(purged)',title_purged:true,expires_at:'2026-06-01T00:00:00.000Z'}];
    expect(await makeDb(env).purgeOld(cutoff)).toBe(1);
    expect(state.rows[0]).toMatchObject({title:'(purged)',notify_email:null,status:'open',creator_vote:'bail'});
    expect(state.rows[1].title).toBe('boundary');
    expect(await makeDb(env).purgeOld(cutoff)).toBe(0);
  });
  it('dry run counts eligibility without mutation',async()=>{
    state.rows=[{id:'a',title:'keep',title_purged:false,expires_at:'2026-07-01T00:00:00.000Z'}];
    expect(await makeDb(env).purgeOld(cutoff,true)).toBe(1);
    expect(state.rows[0].title).toBe('keep');
  });
  it('missing admin configuration fails before creating a database client',async()=>{
    const result=await POST({request:new Request('https://example.com/api/admin/purge',{method:'POST'}),locals:{runtime:{env:{...env,ADMIN_SECRET:undefined}}}} as any);
    expect(result.status).toBe(403);expect(state.creates).toBe(0);
  });
  it('database failure remains non-success and redacted',async()=>{
    state.failed=true;
    const result=await POST({request:new Request('https://example.com/api/admin/purge',{method:'POST',headers:{'x-admin-secret':env.ADMIN_SECRET}}),locals:{runtime:{env}}} as any);
    expect(result.status).toBe(503);expect(await result.text()).not.toContain('private backend');
  });
  it('authenticated dormant calls return disabled without a database connection',async()=>{
    const result=await POST({request:new Request('https://example.com/api/admin/purge',{method:'POST',headers:{'x-admin-secret':env.ADMIN_SECRET}}),locals:{runtime:{env:{...env,RETENTION_ENABLED:undefined}}}} as any);
    expect(result.status).toBe(503);expect(await result.json()).toEqual({error:'Retention disabled'});expect(state.creates).toBe(0);
  });
  it('a successful empty purge remains an actual zero response',async()=>{
    const result=await POST({request:new Request('https://example.com/api/admin/purge',{method:'POST',headers:{'x-admin-secret':env.ADMIN_SECRET}}),locals:{runtime:{env}}} as any);
    expect(result.status).toBe(200);expect(await result.json()).toEqual({purged:0});
  });
});
