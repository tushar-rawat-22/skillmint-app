-- SkillMint ordered schema migration v4: least-privilege account deletion.
-- Apply exactly once after schema_v1.sql, schema_v2_feedback.sql, and
-- schema_v3_data_controls.sql. This file is the repository's single
-- authoritative v4 migration and has not been applied by this task.

begin;

do $$
declare
  required_table_name text;
  cascade_owner_tables integer;
begin
  foreach required_table_name in array array[
    'profiles',
    'resume_analyses',
    'job_matches',
    'career_snapshots',
    'beta_feedback'
  ] loop
    if to_regclass(format('public.%I', required_table_name)) is null then
      raise exception 'Required SkillMint table is missing: public.%', required_table_name;
    end if;
  end loop;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and information_schema.columns.table_name = 'profiles'
      and column_name = 'id'
      and data_type = 'uuid'
  ) then
    raise exception 'public.profiles.id must exist as uuid';
  end if;

  foreach required_table_name in array array[
    'resume_analyses',
    'job_matches',
    'career_snapshots',
    'beta_feedback'
  ] loop
    if not exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and information_schema.columns.table_name = required_table_name
        and column_name = 'user_id'
        and data_type = 'uuid'
    ) then
      raise exception 'public.%.user_id must exist as uuid', required_table_name;
    end if;
  end loop;

  select count(distinct constraint_row.conrelid)::integer
  into cascade_owner_tables
  from pg_catalog.pg_constraint as constraint_row
  where constraint_row.contype = 'f'
    and constraint_row.conrelid in (
      'public.profiles'::regclass,
      'public.resume_analyses'::regclass,
      'public.job_matches'::regclass,
      'public.career_snapshots'::regclass,
      'public.beta_feedback'::regclass
    )
    and constraint_row.confrelid = 'auth.users'::regclass
    and constraint_row.confdeltype = 'c';

  if cascade_owner_tables <> 5 then
    raise exception 'All five account tables must reference auth.users ON DELETE CASCADE';
  end if;
end;
$$;

alter table public.profiles enable row level security;
alter table public.resume_analyses enable row level security;
alter table public.job_matches enable row level security;
alter table public.career_snapshots enable row level security;
alter table public.beta_feedback enable row level security;

revoke all on table public.profiles from public, anon, authenticated;
revoke all on table public.resume_analyses from public, anon, authenticated;
revoke all on table public.job_matches from public, anon, authenticated;
revoke all on table public.career_snapshots from public, anon, authenticated;
revoke all on table public.beta_feedback from public, anon, authenticated;

-- Direct browser privileges follow production callers exactly.
grant select, insert, update on table public.profiles to authenticated;
grant select, insert, delete on table public.resume_analyses to authenticated;
grant select, insert, update, delete on table public.job_matches to authenticated;
grant select on table public.career_snapshots to authenticated;
grant select, insert on table public.beta_feedback to authenticated;

-- Every browser policy and authenticated account-data RPC verifies trusted
-- Auth state. This makes absent and provider soft-deleted users inactive even
-- when an old, structurally unexpired JWT still carries their former subject.
create or replace function public.is_active_skillmint_user()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select exists (
    select 1
    from auth.users
    where auth.users.id = (select auth.uid())
      and auth.users.deleted_at is null
  );
$$;

alter function public.is_active_skillmint_user() owner to postgres;
revoke all on function public.is_active_skillmint_user()
from public, anon, authenticated;
grant execute on function public.is_active_skillmint_user()
to authenticated;

drop policy if exists "Users can select their own profile" on public.profiles;
drop policy if exists "Users can insert their own profile" on public.profiles;
drop policy if exists "Users can update their own profile" on public.profiles;
drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can select their own profile"
on public.profiles for select to authenticated
using (public.is_active_skillmint_user() and auth.uid() = id);
create policy "Users can insert their own profile"
on public.profiles for insert to authenticated
with check (public.is_active_skillmint_user() and auth.uid() = id);
create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (public.is_active_skillmint_user() and auth.uid() = id)
with check (public.is_active_skillmint_user() and auth.uid() = id);

drop policy if exists "Users can select their own resume analyses" on public.resume_analyses;
drop policy if exists "Users can insert their own resume analyses" on public.resume_analyses;
drop policy if exists "Users can update their own resume analyses" on public.resume_analyses;
drop policy if exists "Users can delete their own resume analyses" on public.resume_analyses;
create policy "Users can select their own resume analyses"
on public.resume_analyses for select to authenticated
using (public.is_active_skillmint_user() and auth.uid() = user_id);
create policy "Users can insert their own resume analyses"
on public.resume_analyses for insert to authenticated
with check (public.is_active_skillmint_user() and auth.uid() = user_id);
create policy "Users can delete their own resume analyses"
on public.resume_analyses for delete to authenticated
using (public.is_active_skillmint_user() and auth.uid() = user_id);

drop policy if exists "Users can select their own job matches" on public.job_matches;
drop policy if exists "Users can insert their own job matches" on public.job_matches;
drop policy if exists "Users can update their own job matches" on public.job_matches;
drop policy if exists "Users can delete their own job matches" on public.job_matches;
create policy "Users can select their own job matches"
on public.job_matches for select to authenticated
using (public.is_active_skillmint_user() and auth.uid() = user_id);
create policy "Users can insert their own job matches"
on public.job_matches for insert to authenticated
with check (public.is_active_skillmint_user() and auth.uid() = user_id);
create policy "Users can update their own job matches"
on public.job_matches for update to authenticated
using (public.is_active_skillmint_user() and auth.uid() = user_id)
with check (public.is_active_skillmint_user() and auth.uid() = user_id);
create policy "Users can delete their own job matches"
on public.job_matches for delete to authenticated
using (public.is_active_skillmint_user() and auth.uid() = user_id);

drop policy if exists "Users can select their own career snapshots" on public.career_snapshots;
drop policy if exists "Users can insert their own career snapshots" on public.career_snapshots;
drop policy if exists "Users can update their own career snapshots" on public.career_snapshots;
drop policy if exists "Users can delete their own career snapshots" on public.career_snapshots;
create policy "Users can select their own career snapshots"
on public.career_snapshots for select to authenticated
using (public.is_active_skillmint_user() and auth.uid() = user_id);

drop policy if exists "Users can select their own beta feedback" on public.beta_feedback;
drop policy if exists "Users can insert their own beta feedback" on public.beta_feedback;
drop policy if exists "Users can update their own beta feedback" on public.beta_feedback;
drop policy if exists "Users can delete their own beta feedback" on public.beta_feedback;
create policy "Users can select their own beta feedback"
on public.beta_feedback for select to authenticated
using (public.is_active_skillmint_user() and auth.uid() = user_id);
create policy "Users can insert their own beta feedback"
on public.beta_feedback for insert to authenticated
with check (public.is_active_skillmint_user() and auth.uid() = user_id);

create index resume_analyses_user_id_id_idx
on public.resume_analyses(user_id, id);
create index resume_analyses_user_id_created_at_id_idx
on public.resume_analyses(user_id, created_at desc, id);
create index job_matches_user_id_id_idx
on public.job_matches(user_id, id);
create index job_matches_user_id_created_at_id_idx
on public.job_matches(user_id, created_at desc, id);
create index career_snapshots_user_id_id_idx
on public.career_snapshots(user_id, id);
create index career_snapshots_user_id_created_at_id_idx
on public.career_snapshots(user_id, created_at desc, id);
create index beta_feedback_user_id_id_idx
on public.beta_feedback(user_id, id);
create index beta_feedback_user_id_created_at_id_idx
on public.beta_feedback(user_id, created_at desc, id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

alter function public.set_updated_at() owner to postgres;
revoke all on function public.set_updated_at()
from public, anon, authenticated;

-- This intended authenticated RPC deletes saved reports only. SECURITY
-- DEFINER is required so career_snapshots can remain read-only to browsers.
create or replace function public.delete_current_user_saved_reports()
returns table (
  resume_analyses_deleted integer,
  job_matches_deleted integer,
  career_snapshots_deleted integer
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null or not public.is_active_skillmint_user() then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  with deleted as (
    delete from public.resume_analyses where user_id = current_user_id returning 1
  ) select count(*)::integer into resume_analyses_deleted from deleted;
  with deleted as (
    delete from public.job_matches where user_id = current_user_id returning 1
  ) select count(*)::integer into job_matches_deleted from deleted;
  with deleted as (
    delete from public.career_snapshots where user_id = current_user_id returning 1
  ) select count(*)::integer into career_snapshots_deleted from deleted;
  return next;
end;
$$;

alter function public.delete_current_user_saved_reports() owner to postgres;
revoke all on function public.delete_current_user_saved_reports()
from public, anon, authenticated;
grant execute on function public.delete_current_user_saved_reports()
to authenticated;

-- Account preparation is route-only. The browser cannot execute this
-- function or choose its target; the server supplies a provider-validated ID.
drop function if exists public.prepare_current_account_deletion();
create or replace function public.prepare_account_deletion(target_user_id uuid)
returns table (
  profiles_deleted integer,
  resume_analyses_deleted integer,
  job_matches_deleted integer,
  career_snapshots_deleted integer,
  beta_feedback_deleted integer,
  verified_absent boolean
)
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if target_user_id is null then
    raise exception 'Target account is required' using errcode = '22004';
  end if;

  with deleted as (
    delete from public.resume_analyses where user_id = target_user_id returning 1
  ) select count(*)::integer into resume_analyses_deleted from deleted;
  with deleted as (
    delete from public.job_matches where user_id = target_user_id returning 1
  ) select count(*)::integer into job_matches_deleted from deleted;
  with deleted as (
    delete from public.career_snapshots where user_id = target_user_id returning 1
  ) select count(*)::integer into career_snapshots_deleted from deleted;
  with deleted as (
    delete from public.profiles where id = target_user_id returning 1
  ) select count(*)::integer into profiles_deleted from deleted;
  with deleted as (
    delete from public.beta_feedback where user_id = target_user_id returning 1
  ) select count(*)::integer into beta_feedback_deleted from deleted;

  verified_absent := not exists (
    select 1 from public.profiles where id = target_user_id
    union all select 1 from public.resume_analyses where user_id = target_user_id
    union all select 1 from public.job_matches where user_id = target_user_id
    union all select 1 from public.career_snapshots where user_id = target_user_id
    union all select 1 from public.beta_feedback where user_id = target_user_id
  );
  if not verified_absent then
    raise exception 'Account data cleanup verification failed' using errcode = 'P0001';
  end if;
  return next;
end;
$$;

alter function public.prepare_account_deletion(uuid) owner to postgres;
revoke all on function public.prepare_account_deletion(uuid)
from public, anon, authenticated;
grant execute on function public.prepare_account_deletion(uuid)
to service_role;

commit;
