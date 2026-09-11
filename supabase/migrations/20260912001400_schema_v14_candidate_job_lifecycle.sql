-- SkillMint schema v14: candidate-owned durable job lifecycle.
-- Provider provenance is server-controlled; browser sessions may only read owner rows.
begin;

create table public.candidate_job_lifecycle (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_account_id text not null,
  source_native_id text not null,
  source_key text not null,
  original_apply_url text not null,
  role_title text not null,
  company_name text not null,
  location text,
  source_updated_at timestamptz,
  source_fetched_at timestamptz not null,
  provider_availability text not null default 'live',
  workflow_state text not null default 'saved',
  applied_at timestamptz,
  follow_up_at timestamptz,
  follow_up_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint candidate_job_lifecycle_provider_check check (provider in ('greenhouse')),
  constraint candidate_job_lifecycle_provider_account_check check (provider_account_id ~ '^[a-z0-9][a-z0-9_-]{0,79}$'),
  constraint candidate_job_lifecycle_source_native_id_check check (char_length(source_native_id) between 1 and 160),
  constraint candidate_job_lifecycle_source_key_check check (source_key = provider || ':' || provider_account_id || ':' || source_native_id),
  constraint candidate_job_lifecycle_original_apply_url_check check (original_apply_url ~ '^https?://'),
  constraint candidate_job_lifecycle_role_title_check check (char_length(btrim(role_title)) between 1 and 240),
  constraint candidate_job_lifecycle_company_name_check check (char_length(btrim(company_name)) between 1 and 240),
  constraint candidate_job_lifecycle_location_check check (location is null or char_length(btrim(location)) between 1 and 240),
  constraint candidate_job_lifecycle_provider_availability_check check (provider_availability in ('live', 'stale', 'closed', 'unavailable')),
  constraint candidate_job_lifecycle_workflow_state_check check (workflow_state in ('saved', 'applied', 'withdrawn', 'archived')),
  constraint candidate_job_lifecycle_applied_state_check check (workflow_state <> 'applied' or applied_at is not null),
  constraint candidate_job_lifecycle_follow_up_check check (follow_up_completed_at is null or follow_up_at is not null),
  constraint candidate_job_lifecycle_owner_source_unique unique (user_id, provider, provider_account_id, source_native_id)
);

create index candidate_job_lifecycle_user_updated_idx on public.candidate_job_lifecycle(user_id, updated_at desc, id);
create index candidate_job_lifecycle_user_follow_up_idx on public.candidate_job_lifecycle(user_id, follow_up_at)
  where follow_up_at is not null and follow_up_completed_at is null;

alter table public.candidate_job_lifecycle enable row level security;
revoke all on table public.candidate_job_lifecycle from public, anon, authenticated, service_role;
grant select on table public.candidate_job_lifecycle to authenticated;
grant select, insert, update, delete on table public.candidate_job_lifecycle to service_role;

create policy "Candidates can select their own job lifecycle" on public.candidate_job_lifecycle for select to authenticated
using (public.is_active_skillmint_user() and auth.uid() = user_id and exists (
  select 1 from public.account_personas where account_personas.user_id = auth.uid() and account_personas.persona = 'CANDIDATE'
));
create policy "Candidates own inserted job lifecycle rows" on public.candidate_job_lifecycle for insert to authenticated
with check (public.is_active_skillmint_user() and auth.uid() = user_id and exists (
  select 1 from public.account_personas where account_personas.user_id = auth.uid() and account_personas.persona = 'CANDIDATE'
));
create policy "Candidates own updated job lifecycle rows" on public.candidate_job_lifecycle for update to authenticated
using (public.is_active_skillmint_user() and auth.uid() = user_id and exists (
  select 1 from public.account_personas where account_personas.user_id = auth.uid() and account_personas.persona = 'CANDIDATE'
))
with check (public.is_active_skillmint_user() and auth.uid() = user_id and exists (
  select 1 from public.account_personas where account_personas.user_id = auth.uid() and account_personas.persona = 'CANDIDATE'
));
create policy "Candidates own deleted job lifecycle rows" on public.candidate_job_lifecycle for delete to authenticated
using (public.is_active_skillmint_user() and auth.uid() = user_id and exists (
  select 1 from public.account_personas where account_personas.user_id = auth.uid() and account_personas.persona = 'CANDIDATE'
));

create trigger set_candidate_job_lifecycle_updated_at before update on public.candidate_job_lifecycle
for each row execute function public.set_updated_at();

comment on table public.candidate_job_lifecycle is 'Candidate-owned job workflow state. Provider provenance is written only by trusted server code.';
comment on column public.candidate_job_lifecycle.provider_availability is 'Provider/source availability only; never an inferred employer outcome.';
comment on column public.candidate_job_lifecycle.workflow_state is 'Candidate-recorded state only; never inferred from provider silence or employer behavior.';

create or replace function public.delete_current_user_saved_reports()
returns table (resume_analyses_deleted integer, job_matches_deleted integer, career_snapshots_deleted integer)
language plpgsql security definer set search_path = pg_catalog
as $$
declare current_user_id uuid := auth.uid();
begin
  if current_user_id is null or not public.is_active_skillmint_user() then raise exception 'Authentication required' using errcode = '28000'; end if;
  delete from public.active_resume_selections where user_id = current_user_id;
  delete from public.proof_briefs where user_id = current_user_id;
  delete from public.candidate_job_lifecycle where user_id = current_user_id;
  with deleted as (delete from public.resume_analyses where user_id = current_user_id returning 1) select pg_catalog.count(*)::integer into resume_analyses_deleted from deleted;
  with deleted as (delete from public.job_matches where user_id = current_user_id returning 1) select pg_catalog.count(*)::integer into job_matches_deleted from deleted;
  with deleted as (delete from public.career_snapshots where user_id = current_user_id returning 1) select pg_catalog.count(*)::integer into career_snapshots_deleted from deleted;
  if exists (
    select 1 from public.active_resume_selections where user_id = current_user_id
    union all select 1 from public.proof_briefs where user_id = current_user_id
    union all select 1 from public.candidate_job_lifecycle where user_id = current_user_id
  ) then raise exception 'Saved report dependent-data cleanup verification failed' using errcode = 'P0001'; end if;
  return next;
end;
$$;
alter function public.delete_current_user_saved_reports() owner to postgres;
revoke all on function public.delete_current_user_saved_reports() from public, anon, authenticated, service_role;
grant execute on function public.delete_current_user_saved_reports() to authenticated;

create or replace function public.prepare_account_deletion(target_user_id uuid)
returns table (profiles_deleted integer, resume_analyses_deleted integer, job_matches_deleted integer, career_snapshots_deleted integer, beta_feedback_deleted integer, active_resume_selections_deleted integer, verified_absent boolean)
language plpgsql security definer set search_path = pg_catalog
as $$
begin
  if target_user_id is null then raise exception 'Target account is required' using errcode = '22004'; end if;
  delete from public.candidate_job_lifecycle where user_id = target_user_id;
  delete from public.proof_briefs where user_id = target_user_id;
  delete from public.account_personas where user_id = target_user_id;
  with deleted as (delete from public.active_resume_selections where user_id = target_user_id returning 1) select pg_catalog.count(*)::integer into active_resume_selections_deleted from deleted;
  with deleted as (delete from public.resume_analyses where user_id = target_user_id returning 1) select pg_catalog.count(*)::integer into resume_analyses_deleted from deleted;
  with deleted as (delete from public.job_matches where user_id = target_user_id returning 1) select pg_catalog.count(*)::integer into job_matches_deleted from deleted;
  with deleted as (delete from public.career_snapshots where user_id = target_user_id returning 1) select pg_catalog.count(*)::integer into career_snapshots_deleted from deleted;
  with deleted as (delete from public.profiles where id = target_user_id returning 1) select pg_catalog.count(*)::integer into profiles_deleted from deleted;
  with deleted as (delete from public.beta_feedback where user_id = target_user_id returning 1) select pg_catalog.count(*)::integer into beta_feedback_deleted from deleted;
  verified_absent := not exists (
    select 1 from public.account_personas where user_id = target_user_id
    union all select 1 from public.proof_briefs where user_id = target_user_id
    union all select 1 from public.candidate_job_lifecycle where user_id = target_user_id
    union all select 1 from public.active_resume_selections where user_id = target_user_id
    union all select 1 from public.profiles where id = target_user_id
    union all select 1 from public.resume_analyses where user_id = target_user_id
    union all select 1 from public.job_matches where user_id = target_user_id
    union all select 1 from public.career_snapshots where user_id = target_user_id
    union all select 1 from public.beta_feedback where user_id = target_user_id
  );
  if not verified_absent then raise exception 'Account data cleanup verification failed' using errcode = 'P0001'; end if;
  return next;
end;
$$;
alter function public.prepare_account_deletion(uuid) owner to postgres;
revoke all on function public.prepare_account_deletion(uuid) from public, anon, authenticated, service_role;
grant execute on function public.prepare_account_deletion(uuid) to service_role;

commit;
