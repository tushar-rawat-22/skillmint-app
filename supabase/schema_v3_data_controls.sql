-- SkillMint Supabase schema v3: data controls and account deletion support
-- Run after schema_v1.sql and schema_v2_feedback.sql.
-- This file is additive and preserves existing product tables.

create extension if not exists pgcrypto;

-- Account-owned feedback should be removed when the auth account is deleted.
-- Rows with user_id null remain legitimate anonymous/local feedback imports
-- only if the product later supports inserting them server-side.
alter table public.beta_feedback
  drop constraint if exists beta_feedback_user_id_fkey;

alter table public.beta_feedback
  add constraint beta_feedback_user_id_fkey
  foreign key (user_id)
  references auth.users(id)
  on delete cascade;

drop policy if exists "Users can delete their own beta feedback"
on public.beta_feedback;
create policy "Users can delete their own beta feedback"
on public.beta_feedback
for delete
to authenticated
using (auth.uid() = user_id);

create or replace function public.delete_current_user_saved_reports()
returns table (
  resume_analyses_deleted integer,
  job_matches_deleted integer,
  career_snapshots_deleted integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required'
      using errcode = '28000';
  end if;

  with deleted_resume_analyses as (
    delete from public.resume_analyses
    where user_id = current_user_id
    returning 1
  )
  select count(*)::integer
  into resume_analyses_deleted
  from deleted_resume_analyses;

  with deleted_job_matches as (
    delete from public.job_matches
    where user_id = current_user_id
    returning 1
  )
  select count(*)::integer
  into job_matches_deleted
  from deleted_job_matches;

  with deleted_career_snapshots as (
    delete from public.career_snapshots
    where user_id = current_user_id
    returning 1
  )
  select count(*)::integer
  into career_snapshots_deleted
  from deleted_career_snapshots;

  return next;
end;
$$;

revoke all on function public.delete_current_user_saved_reports()
from public;

grant execute on function public.delete_current_user_saved_reports()
to authenticated;
