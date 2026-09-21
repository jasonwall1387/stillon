import { PGlite } from '@electric-sql/pglite';
import { describe, it, expect } from 'vitest';
import migration from '../supabase/migrations/0003_retention_runs.sql?raw';

describe('retention ledger migration',()=>{
  it('enforces service-only access and preserves last actual success across failures/dry runs',async()=>{
    const db=new PGlite();
    try {
      await db.exec('create role anon; create role authenticated; create role service_role; grant usage on schema public to service_role; alter default privileges in schema public grant all on tables to anon, authenticated, service_role;');
      await db.exec(migration);
      expect((await db.query<{relrowsecurity:boolean}>("select relrowsecurity from pg_class where relname='retention_runs'")).rows[0].relrowsecurity).toBe(true);
      for(const role of ['anon','authenticated']) {
        await db.exec(`set role ${role}`);
        for(const sql of ['select * from retention_runs', 'delete from retention_runs', "update retention_runs set status='ok'", 'insert into retention_runs(id) values(gen_random_uuid())'])
          await expect(db.exec(sql)).rejects.toThrow(/permission denied/);
        await db.exec('reset role');
      }
      await db.exec('set role service_role');
      await db.exec(`insert into retention_runs(id,source,mode,status,started_at,cutoff_at)
        values('11111111-1111-4111-8111-111111111111','scheduled','purge','running','2026-09-20','2026-08-21');`);
      await expect(db.exec("update retention_runs set status='ok' where status='running'")).rejects.toThrow(/check constraint/);
      await db.exec("update retention_runs set status='ok',count=0,finished_at='2026-09-20' where status='running'");
      await db.exec(`insert into retention_runs(id,source,mode,status,started_at,cutoff_at,finished_at,count,error_code) values
        ('22222222-2222-4222-8222-222222222222','scheduled','purge','error','2026-09-21','2026-08-22','2026-09-21',null,'purge_failed'),
        ('33333333-3333-4333-8333-333333333333','admin','dry_run','ok','2026-09-22','2026-08-23','2026-09-22',7,null);`);
      expect((await db.query<{last_success:string}>("select max(finished_at)::text as last_success from retention_runs where status='ok' and mode='purge'")).rows[0].last_success).toContain('2026-09-20');
      await expect(db.exec('delete from retention_runs')).rejects.toThrow(/permission denied/);
    } finally {await db.close();}
  },10000);
});
