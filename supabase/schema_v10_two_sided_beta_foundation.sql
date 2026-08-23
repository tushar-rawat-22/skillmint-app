-- SkillMint ordered schema migration v10: candidate-controlled Proof Briefs
-- and server-owned account personas for the two-sided public beta.

begin;

create table public.account_personas (
  user_id uuid primary key references auth.users(id) on delete cascade,
  persona text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint account_personas_persona_check
    check (persona in ('CANDIDATE', 'RECRUITER'))
);

create table public.proof_briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_resume_analysis_id uuid not null,
  brief_payload jsonb not null,
  visibility text not null default 'PRIVATE',
  share_token_hash text,
  share_created_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proof_briefs_source_owner_fkey
    foreign key (user_id, source_resume_analysis_id)
    references public.resume_analyses(user_id, id)
    on delete cascade,
  constraint proof_briefs_owner_source_unique
    unique (user_id, source_resume_analysis_id),
  constraint proof_briefs_visibility_check
    check (visibility in ('PRIVATE', 'LINK_ONLY')),
  constraint proof_briefs_payload_object_check
    check (jsonb_typeof(brief_payload) = 'object'),
  constraint proof_briefs_payload_size_check
    check (pg_column_size(brief_payload) <= 16384),
  constraint proof_briefs_share_token_hash_unique
    unique (share_token_hash),
  constraint proof_briefs_share_state_check check (
    (
      visibility = 'PRIVATE'
      and share_token_hash is null
      and share_created_at is null
    )
    or
    (
      visibility = 'LINK_ONLY'
      and share_token_hash ~ '^[0-9a-f]{64}$'
      and share_created_at is not null
      and revoked_at is null
    )
  )
);

create index proof_briefs_user_id_created_at_id_idx
on public.proof_briefs(user_id, created_at desc, id);

create index proof_briefs_source_resume_analysis_id_idx
on public.proof_briefs(source_resume_analysis_id);

alter table public.account_personas enable row level security;
alter table public.proof_briefs enable row level security;

revoke all on table public.account_personas
from public, anon, authenticated, service_role;
revoke all on table public.proof_briefs
from public, anon, authenticated, service_role;

grant select on table public.account_personas to authenticated;
grant insert (user_id, persona) on table public.account_personas to authenticated;
grant update (persona) on table public.account_personas to authenticated;
grant delete on table public.account_personas to authenticated;
grant select, insert, update, delete on table public.account_personas to service_role;

grant select (
  id,
  user_id,
  source_resume_analysis_id,
  brief_payload,
  visibility,
  share_created_at,
  revoked_at,
  created_at,
  updated_at
) on table public.proof_briefs to authenticated;
grant select, insert, update, delete on table public.proof_briefs to service_role;

create policy "Users can select their own account persona"
on public.account_personas for select to authenticated
using (public.is_active_skillmint_user() and auth.uid() = user_id);

create policy "Users can insert their own account persona"
on public.account_personas for insert to authenticated
with check (public.is_active_skillmint_user() and auth.uid() = user_id);

create policy "Users can update their own account persona"
on public.account_personas for update to authenticated
using (public.is_active_skillmint_user() and auth.uid() = user_id)
with check (public.is_active_skillmint_user() and auth.uid() = user_id);

create policy "Users can delete their own account persona"
on public.account_personas for delete to authenticated
using (public.is_active_skillmint_user() and auth.uid() = user_id);

create policy "Users can select their own proof briefs"
on public.proof_briefs for select to authenticated
using (public.is_active_skillmint_user() and auth.uid() = user_id);

create trigger set_account_personas_updated_at
before update on public.account_personas
for each row execute function public.set_updated_at();

create trigger set_proof_briefs_updated_at
before update on public.proof_briefs
for each row execute function public.set_updated_at();

create function public.get_shared_proof_brief(requested_token_hash text)
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog
as $$
  select pg_catalog.jsonb_build_object(
    'payload', pg_catalog.jsonb_build_object(
      'schemaVersion', proof_briefs.brief_payload -> 'schemaVersion',
      'direction', proof_briefs.brief_payload -> 'direction',
      'currentSupport', proof_briefs.brief_payload -> 'currentSupport',
      'strongestSupport', proof_briefs.brief_payload -> 'strongestSupport',
      'mainEvidenceGap', proof_briefs.brief_payload -> 'mainEvidenceGap',
      'bestNextMove', proof_briefs.brief_payload -> 'bestNextMove',
      'evidenceSignals', (
        select coalesce(
          pg_catalog.jsonb_agg(
            pg_catalog.jsonb_build_object(
              'state', signal.value -> 'state',
              'label', signal.value -> 'label',
              'detail', signal.value -> 'detail'
            ) order by signal.ordinality
          ),
          '[]'::jsonb
        )
        from pg_catalog.jsonb_array_elements(
          case
            when pg_catalog.jsonb_typeof(
              proof_briefs.brief_payload -> 'evidenceSignals'
            ) = 'array'
              then proof_briefs.brief_payload -> 'evidenceSignals'
            else '[]'::jsonb
          end
        ) with ordinality as signal(value, ordinality)
      ),
      'sourceSummary', pg_catalog.jsonb_build_object(
        'projectEntries',
          proof_briefs.brief_payload -> 'sourceSummary' -> 'projectEntries',
        'experienceEntries',
          proof_briefs.brief_payload -> 'sourceSummary' -> 'experienceEntries',
        'evidenceCandidateLinks',
          proof_briefs.brief_payload -> 'sourceSummary' -> 'evidenceCandidateLinks'
      )
    ),
    'shared_at', proof_briefs.share_created_at
  )
  from public.proof_briefs
  join auth.users on auth.users.id = proof_briefs.user_id
  where requested_token_hash ~ '^[0-9a-f]{64}$'
    and proof_briefs.share_token_hash = requested_token_hash
    and proof_briefs.visibility = 'LINK_ONLY'
    and proof_briefs.revoked_at is null
    and auth.users.deleted_at is null
    and proof_briefs.brief_payload ?& array[
      'schemaVersion',
      'direction',
      'currentSupport',
      'strongestSupport',
      'mainEvidenceGap',
      'bestNextMove',
      'evidenceSignals',
      'sourceSummary'
    ]
  limit 1;
$$;

alter function public.get_shared_proof_brief(text) owner to postgres;
revoke all on function public.get_shared_proof_brief(text)
from public, anon, authenticated, service_role;
grant execute on function public.get_shared_proof_brief(text)
to anon, authenticated;

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

  delete from public.active_resume_selections
  where user_id = current_user_id;

  delete from public.proof_briefs
  where user_id = current_user_id;

  with deleted as (
    delete from public.resume_analyses
    where user_id = current_user_id
    returning 1
  )
  select pg_catalog.count(*)::integer
  into resume_analyses_deleted
  from deleted;

  with deleted as (
    delete from public.job_matches
    where user_id = current_user_id
    returning 1
  )
  select pg_catalog.count(*)::integer
  into job_matches_deleted
  from deleted;

  with deleted as (
    delete from public.career_snapshots
    where user_id = current_user_id
    returning 1
  )
  select pg_catalog.count(*)::integer
  into career_snapshots_deleted
  from deleted;

  if exists (
    select 1 from public.active_resume_selections where user_id = current_user_id
    union all
    select 1 from public.proof_briefs where user_id = current_user_id
  ) then
    raise exception 'Saved report dependent-data cleanup verification failed'
      using errcode = 'P0001';
  end if;

  return next;
end;
$$;

alter function public.delete_current_user_saved_reports() owner to postgres;
revoke all on function public.delete_current_user_saved_reports()
from public, anon, authenticated, service_role;
grant execute on function public.delete_current_user_saved_reports()
to authenticated;

create or replace function public.prepare_account_deletion(target_user_id uuid)
returns table (
  profiles_deleted integer,
  resume_analyses_deleted integer,
  job_matches_deleted integer,
  career_snapshots_deleted integer,
  beta_feedback_deleted integer,
  active_resume_selections_deleted integer,
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

  delete from public.proof_briefs where user_id = target_user_id;
  delete from public.account_personas where user_id = target_user_id;

  with deleted as (
    delete from public.active_resume_selections where user_id = target_user_id returning 1
  ) select pg_catalog.count(*)::integer into active_resume_selections_deleted from deleted;
  with deleted as (
    delete from public.resume_analyses where user_id = target_user_id returning 1
  ) select pg_catalog.count(*)::integer into resume_analyses_deleted from deleted;
  with deleted as (
    delete from public.job_matches where user_id = target_user_id returning 1
  ) select pg_catalog.count(*)::integer into job_matches_deleted from deleted;
  with deleted as (
    delete from public.career_snapshots where user_id = target_user_id returning 1
  ) select pg_catalog.count(*)::integer into career_snapshots_deleted from deleted;
  with deleted as (
    delete from public.profiles where id = target_user_id returning 1
  ) select pg_catalog.count(*)::integer into profiles_deleted from deleted;
  with deleted as (
    delete from public.beta_feedback where user_id = target_user_id returning 1
  ) select pg_catalog.count(*)::integer into beta_feedback_deleted from deleted;

  verified_absent := not exists (
    select 1 from public.account_personas where user_id = target_user_id
    union all select 1 from public.proof_briefs where user_id = target_user_id
    union all select 1 from public.active_resume_selections where user_id = target_user_id
    union all select 1 from public.profiles where id = target_user_id
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
from public, anon, authenticated, service_role;
grant execute on function public.prepare_account_deletion(uuid)
to service_role;

commit;
