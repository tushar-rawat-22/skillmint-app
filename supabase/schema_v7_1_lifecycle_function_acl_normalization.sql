-- SkillMint ordered compatibility migration v7.1:
-- normalize lifecycle-function execution privileges before Resume Workspace V8.
--
-- Hosted Supabase may retain an explicit service_role EXECUTE grant on
-- browser-authenticated lifecycle functions even though the original V4
-- migration granted their public use only to authenticated.
--
-- This migration is intentionally safe when the unwanted grant is already
-- absent. It does not alter function bodies, ownership, behavior, browser
-- privileges, account deletion authority, tables, policies, or data.

begin;

do $acl_normalization_preflight$
declare
  active_guard_oid oid := pg_catalog.to_regprocedure(
    'public.is_active_skillmint_user()'
  );
  saved_reports_oid oid := pg_catalog.to_regprocedure(
    'public.delete_current_user_saved_reports()'
  );
  prepare_deletion_oid oid := pg_catalog.to_regprocedure(
    'public.prepare_account_deletion(uuid)'
  );
begin
  if (
    select pg_catalog.count(*)
    from pg_catalog.pg_roles
    where rolname in ('anon', 'authenticated', 'service_role')
  ) <> 3 then
    raise exception 'Required SkillMint database roles are missing';
  end if;

  if active_guard_oid is null
    or saved_reports_oid is null
    or prepare_deletion_oid is null then
    raise exception 'Required SkillMint lifecycle functions are missing';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc
    where oid = active_guard_oid
      and pg_catalog.pg_get_userbyid(proowner) = 'postgres'
      and prosecdef
      and provolatile = 's'
      and proconfig is not distinct from
        array['search_path=pg_catalog']::text[]
      and pg_catalog.pg_get_function_result(oid) = 'boolean'
  ) or pg_catalog.has_function_privilege(
    'anon',
    active_guard_oid,
    'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'authenticated',
    active_guard_oid,
    'EXECUTE'
  ) then
    raise exception
      'public.is_active_skillmint_user() has an incompatible base contract';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc
    where oid = saved_reports_oid
      and pg_catalog.pg_get_userbyid(proowner) = 'postgres'
      and prosecdef
      and proconfig is not distinct from
        array['search_path=pg_catalog']::text[]
      and pg_catalog.lower(
        pg_catalog.pg_get_function_result(oid)
      ) = pg_catalog.lower(
        'TABLE(resume_analyses_deleted integer, job_matches_deleted integer, career_snapshots_deleted integer)'
      )
  ) or pg_catalog.has_function_privilege(
    'anon',
    saved_reports_oid,
    'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'authenticated',
    saved_reports_oid,
    'EXECUTE'
  ) then
    raise exception
      'public.delete_current_user_saved_reports() has an incompatible base contract';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc
    where oid = prepare_deletion_oid
      and pg_catalog.pg_get_userbyid(proowner) = 'postgres'
      and prosecdef
      and proconfig is not distinct from
        array['search_path=pg_catalog']::text[]
      and pg_catalog.lower(
        pg_catalog.pg_get_function_result(oid)
      ) = pg_catalog.lower(
        'TABLE(profiles_deleted integer, resume_analyses_deleted integer, job_matches_deleted integer, career_snapshots_deleted integer, beta_feedback_deleted integer, verified_absent boolean)'
      )
  ) or pg_catalog.has_function_privilege(
    'anon',
    prepare_deletion_oid,
    'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'authenticated',
    prepare_deletion_oid,
    'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'service_role',
    prepare_deletion_oid,
    'EXECUTE'
  ) then
    raise exception
      'public.prepare_account_deletion(uuid) has an incompatible contract';
  end if;
end;
$acl_normalization_preflight$;

revoke execute
on function public.is_active_skillmint_user()
from service_role;

revoke execute
on function public.delete_current_user_saved_reports()
from service_role;

do $acl_normalization_postflight$
declare
  active_guard_oid oid := pg_catalog.to_regprocedure(
    'public.is_active_skillmint_user()'
  );
  saved_reports_oid oid := pg_catalog.to_regprocedure(
    'public.delete_current_user_saved_reports()'
  );
  prepare_deletion_oid oid := pg_catalog.to_regprocedure(
    'public.prepare_account_deletion(uuid)'
  );
begin
  if pg_catalog.has_function_privilege(
    'anon',
    active_guard_oid,
    'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'authenticated',
    active_guard_oid,
    'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'service_role',
    active_guard_oid,
    'EXECUTE'
  ) then
    raise exception
      'public.is_active_skillmint_user() ACL normalization failed';
  end if;

  if pg_catalog.has_function_privilege(
    'anon',
    saved_reports_oid,
    'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'authenticated',
    saved_reports_oid,
    'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'service_role',
    saved_reports_oid,
    'EXECUTE'
  ) then
    raise exception
      'public.delete_current_user_saved_reports() ACL normalization failed';
  end if;

  if pg_catalog.has_function_privilege(
    'anon',
    prepare_deletion_oid,
    'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'authenticated',
    prepare_deletion_oid,
    'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'service_role',
    prepare_deletion_oid,
    'EXECUTE'
  ) then
    raise exception
      'public.prepare_account_deletion(uuid) ACL changed unexpectedly';
  end if;
end;
$acl_normalization_postflight$;

commit;
