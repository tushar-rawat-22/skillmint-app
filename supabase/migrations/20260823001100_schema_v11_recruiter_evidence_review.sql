-- SkillMint ordered schema migration v11: server-owned recruiter personas,
-- deterministic role evidence maps, and candidate-owned structured reviews.

begin;

revoke insert, update, delete on table public.account_personas from authenticated;
drop policy if exists "Users can insert their own account persona" on public.account_personas;
drop policy if exists "Users can update their own account persona" on public.account_personas;
drop policy if exists "Users can delete their own account persona" on public.account_personas;

create table public.recruiter_role_evidence_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role_title text not null,
  job_description text not null,
  evidence_map jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recruiter_role_title_length_check
    check (char_length(role_title) between 2 and 120),
  constraint recruiter_role_jd_length_check
    check (char_length(job_description) between 80 and 12000),
  constraint recruiter_role_map_object_check
    check (jsonb_typeof(evidence_map) = 'object'),
  constraint recruiter_role_map_size_check
    check (pg_column_size(evidence_map) <= 16384)
);

alter table public.proof_briefs
add constraint proof_briefs_owner_id_unique
unique (user_id, id);

create table public.candidate_evidence_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  proof_brief_id uuid not null,
  role_map_id uuid references public.recruiter_role_evidence_maps(id) on delete set null,
  role_title text not null,
  question_category text not null,
  question_text text not null,
  feedback_category text not null,
  review_ease text not null,
  review_time_signal text not null,
  note text,
  created_at timestamptz not null default now(),
  constraint candidate_review_proof_brief_owner_fkey
    foreign key (user_id, proof_brief_id)
    references public.proof_briefs(user_id, id)
    on delete cascade,
  constraint candidate_review_role_title_length_check
    check (char_length(role_title) between 2 and 120),
  constraint candidate_review_question_category_check check (
    question_category in (
      'APPLIED_EXAMPLE',
      'OWNERSHIP_CONTEXT',
      'OUTCOME_CONTEXT',
      'VALIDATION_CONTEXT',
      'TEAM_REVIEW_CONTEXT'
    )
  ),
  constraint candidate_review_question_length_check
    check (char_length(question_text) between 10 and 320),
  constraint candidate_review_feedback_category_check check (
    feedback_category in (
      'BRIEF_MADE_EVIDENCE_CLEARER',
      'NEEDS_MORE_OWNERSHIP_CONTEXT',
      'NEEDS_MORE_OUTCOME_CONTEXT',
      'NEEDS_MORE_VALIDATION_CONTEXT',
      'ROLE_RELEVANCE_REMAINS_UNCLEAR'
    )
  ),
  constraint candidate_review_ease_check
    check (review_ease in ('EASIER', 'ABOUT_THE_SAME', 'HARDER')),
  constraint candidate_review_time_check
    check (review_time_signal in ('LESS_TIME', 'ABOUT_THE_SAME', 'MORE_TIME', 'NOT_SURE')),
  constraint candidate_review_note_length_check
    check (note is null or char_length(note) between 1 and 1000),
  constraint candidate_review_one_per_role_map_unique
    unique (proof_brief_id, role_map_id)
);

create index recruiter_role_maps_user_created_idx
on public.recruiter_role_evidence_maps(user_id, created_at desc, id);

create index candidate_reviews_owner_created_idx
on public.candidate_evidence_reviews(user_id, created_at desc, id);

alter table public.recruiter_role_evidence_maps enable row level security;
alter table public.candidate_evidence_reviews enable row level security;

revoke all on table public.recruiter_role_evidence_maps
from public, anon, authenticated, service_role;
revoke all on table public.candidate_evidence_reviews
from public, anon, authenticated, service_role;

grant select on table public.recruiter_role_evidence_maps to authenticated;
grant select (
  id,
  user_id,
  proof_brief_id,
  role_title,
  question_category,
  question_text,
  feedback_category,
  review_ease,
  review_time_signal,
  note,
  created_at
) on table public.candidate_evidence_reviews to authenticated;
grant select, insert, update, delete on table public.recruiter_role_evidence_maps to service_role;
grant select, insert, update, delete on table public.candidate_evidence_reviews to service_role;

create policy "Recruiters can select their own role evidence maps"
on public.recruiter_role_evidence_maps for select to authenticated
using (public.is_active_skillmint_user() and auth.uid() = user_id);

create policy "Candidates can select reviews sent to them"
on public.candidate_evidence_reviews for select to authenticated
using (public.is_active_skillmint_user() and auth.uid() = user_id);

create trigger set_recruiter_role_evidence_maps_updated_at
before update on public.recruiter_role_evidence_maps
for each row execute function public.set_updated_at();

create function public.create_recruiter_role_evidence_map(
  expected_recruiter_user_id uuid,
  requested_role_title text,
  requested_job_description text,
  requested_evidence_map jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  inserted public.recruiter_role_evidence_maps%rowtype;
begin
  if expected_recruiter_user_id is null then
    return null;
  end if;

  perform 1
  from public.account_personas
  join auth.users on auth.users.id = account_personas.user_id
  where account_personas.user_id = expected_recruiter_user_id
    and account_personas.persona = 'RECRUITER'
    and auth.users.deleted_at is null
  for update of account_personas;

  if not found then
    return null;
  end if;

  if (
    select pg_catalog.count(*)
    from public.recruiter_role_evidence_maps
    where user_id = expected_recruiter_user_id
  ) >= 10 then
    return pg_catalog.jsonb_build_object('status', 'LIMIT_REACHED');
  end if;

  insert into public.recruiter_role_evidence_maps (
    user_id,
    role_title,
    job_description,
    evidence_map
  ) values (
    expected_recruiter_user_id,
    requested_role_title,
    requested_job_description,
    requested_evidence_map
  )
  returning * into inserted;

  return pg_catalog.jsonb_build_object(
    'status', 'CREATED',
    'roleMap', pg_catalog.jsonb_build_object(
      'id', inserted.id,
      'user_id', inserted.user_id,
      'role_title', inserted.role_title,
      'job_description', inserted.job_description,
      'evidence_map', inserted.evidence_map,
      'created_at', inserted.created_at,
      'updated_at', inserted.updated_at
    )
  );
end;
$$;

alter function public.create_recruiter_role_evidence_map(uuid, text, text, jsonb)
owner to postgres;
revoke all on function public.create_recruiter_role_evidence_map(uuid, text, text, jsonb)
from public, anon, authenticated, service_role;
grant execute on function public.create_recruiter_role_evidence_map(uuid, text, text, jsonb)
to service_role;

create function public.submit_candidate_evidence_review(
  expected_recruiter_user_id uuid,
  requested_token_hash text,
  requested_role_map_id uuid,
  requested_question_category text,
  requested_question_text text,
  requested_feedback_category text,
  requested_review_ease text,
  requested_review_time_signal text,
  requested_note text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  selected_role_title text;
  selected_brief_id uuid;
  selected_candidate_user_id uuid;
  inserted public.candidate_evidence_reviews%rowtype;
begin
  if expected_recruiter_user_id is null
    or requested_token_hash !~ '^[0-9a-f]{64}$'
    or requested_role_map_id is null then
    return null;
  end if;

  perform 1
  from public.account_personas
  join auth.users on auth.users.id = account_personas.user_id
  where account_personas.user_id = expected_recruiter_user_id
    and account_personas.persona = 'RECRUITER'
    and auth.users.deleted_at is null;

  if not found then
    return null;
  end if;

  select role_title
  into selected_role_title
  from public.recruiter_role_evidence_maps
  where id = requested_role_map_id
    and user_id = expected_recruiter_user_id
  for share;

  if not found then
    return null;
  end if;

  select proof_briefs.id, proof_briefs.user_id
  into selected_brief_id, selected_candidate_user_id
  from public.proof_briefs
  join auth.users on auth.users.id = proof_briefs.user_id
  where proof_briefs.share_token_hash = requested_token_hash
    and proof_briefs.visibility = 'LINK_ONLY'
    and proof_briefs.revoked_at is null
    and auth.users.deleted_at is null
  for update of proof_briefs;

  if not found then
    return null;
  end if;

  insert into public.candidate_evidence_reviews (
    user_id,
    proof_brief_id,
    role_map_id,
    role_title,
    question_category,
    question_text,
    feedback_category,
    review_ease,
    review_time_signal,
    note
  ) values (
    selected_candidate_user_id,
    selected_brief_id,
    requested_role_map_id,
    selected_role_title,
    requested_question_category,
    requested_question_text,
    requested_feedback_category,
    requested_review_ease,
    requested_review_time_signal,
    requested_note
  )
  returning * into inserted;

  return pg_catalog.jsonb_build_object(
    'id', inserted.id,
    'role_title', inserted.role_title,
    'question_category', inserted.question_category,
    'question_text', inserted.question_text,
    'feedback_category', inserted.feedback_category,
    'review_ease', inserted.review_ease,
    'review_time_signal', inserted.review_time_signal,
    'note', inserted.note,
    'created_at', inserted.created_at
  );
end;
$$;

alter function public.submit_candidate_evidence_review(uuid, text, uuid, text, text, text, text, text, text)
owner to postgres;
revoke all on function public.submit_candidate_evidence_review(uuid, text, uuid, text, text, text, text, text, text)
from public, anon, authenticated, service_role;
grant execute on function public.submit_candidate_evidence_review(uuid, text, uuid, text, text, text, text, text, text)
to service_role;

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

  delete from public.recruiter_role_evidence_maps where user_id = target_user_id;
  delete from public.proof_briefs where user_id = target_user_id;
  delete from public.candidate_evidence_reviews where user_id = target_user_id;
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
    union all select 1 from public.recruiter_role_evidence_maps where user_id = target_user_id
    union all select 1 from public.candidate_evidence_reviews where user_id = target_user_id
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
