-- SkillMint ordered schema migration v16: finite Proof Brief share grants.
-- A candidate may republish at any time to mint a new token and a fresh window.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

do $$
begin
  if pg_catalog.to_regprocedure('public.get_shared_proof_brief(text)') is null then
    raise exception 'Expected public.get_shared_proof_brief(text)';
  end if;
  if pg_catalog.to_regprocedure(
    'public.submit_candidate_evidence_review(uuid,text,uuid,text,text,text,text,text,text)'
  ) is null then
    raise exception 'Expected public.submit_candidate_evidence_review(uuid,text,uuid,text,text,text,text,text,text)';
  end if;
end;
$$;

create or replace function public.get_shared_proof_brief(requested_token_hash text)
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
    and proof_briefs.share_created_at
      > pg_catalog.statement_timestamp() - interval '14 days'
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

create or replace function public.submit_candidate_evidence_review(
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
  selected_visibility text;
  selected_revoked_at timestamptz;
  selected_share_created_at timestamptz;
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

  select
    proof_briefs.id,
    proof_briefs.user_id,
    proof_briefs.visibility,
    proof_briefs.revoked_at,
    proof_briefs.share_created_at
  into
    selected_brief_id,
    selected_candidate_user_id,
    selected_visibility,
    selected_revoked_at,
    selected_share_created_at
  from public.proof_briefs
  join auth.users on auth.users.id = proof_briefs.user_id
  where proof_briefs.share_token_hash = requested_token_hash
    and auth.users.deleted_at is null
  for update of proof_briefs;

  if not found
    or selected_visibility <> 'LINK_ONLY'
    or selected_revoked_at is not null
    or selected_share_created_at is null
    or selected_share_created_at
      <= pg_catalog.clock_timestamp() - interval '14 days' then
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

comment on function public.get_shared_proof_brief(text) is
  'Returns the allowlisted public Proof Brief projection only while its candidate-created share grant is younger than 14 days.';
comment on function public.submit_candidate_evidence_review(uuid, text, uuid, text, text, text, text, text, text) is
  'Atomically locks and rechecks recruiter, role-map, live token, revocation, owner, and 14-day share-expiry authority before inserting candidate-owned feedback.';

commit;
