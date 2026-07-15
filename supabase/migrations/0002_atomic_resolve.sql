-- Fix: resolve the invitee vote atomically so status is derived from the row's
-- current creator_vote under the row lock, never from a stale app-side snapshot.
-- Closes the TOCTOU where a creator flipping bail->on as the invitee bails could
-- leave (creator_vote='on', invitee_vote='bail', status='cancelled') and reveal the
-- other party's bail to a keeper. Also fixes the reverse (bail,bail)->stands bug.
create or replace function resolve_invitee_vote(p_id text, p_vote text, p_now timestamptz)
returns setof checks
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update checks
     set invitee_vote    = p_vote,
         invitee_voted_at = p_now,
         resolved_at      = p_now,
         status = case
                    when creator_vote = 'bail' and p_vote = 'bail' then 'cancelled'
                    else 'stands'
                  end
   where id = p_id
     and status = 'open'
     and invitee_vote is null
  returning *;
end;
$$;

-- Match the table lockdown: only the server (service_role) may call it.
revoke all on function resolve_invitee_vote(text, text, timestamptz) from anon, authenticated;
grant execute on function resolve_invitee_vote(text, text, timestamptz) to service_role;

-- Defense in depth: the DB itself refuses to persist a 'cancelled' row that is not a mutual bail.
-- If the buggy code ever wrote a bad row, this ALTER will fail until it is cleaned. Check first:
--   select * from checks
--   where status = 'cancelled' and not (creator_vote = 'bail' and invitee_vote = 'bail');
-- (fresh app, so expect zero.)
alter table checks
  add constraint checks_cancelled_iff_both_bail
  check (status <> 'cancelled' or (creator_vote = 'bail' and invitee_vote = 'bail'));
