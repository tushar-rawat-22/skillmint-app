-- SkillMint ordered schema migration v9:
-- normalize the untracked public.rls_auto_enable() execution ACL if present.
--
-- This migration is object-specific. It does not create, drop, replace, or
-- alter the function body or its event trigger, and it does not change default
-- function privileges.

begin;

do $public_function_acl_normalization$
declare
  target_count integer;
  target_oid oid;
  function_contract_before text;
  function_contract_after text;
  event_trigger_count_before integer;
  event_trigger_count_after integer;
  event_trigger_contract_before text;
  event_trigger_contract_after text;
begin
  select
    pg_catalog.count(*)::integer,
    (pg_catalog.array_agg(function_row.oid order by function_row.oid))[1]
  into target_count, target_oid
  from pg_catalog.pg_proc as function_row
  join pg_catalog.pg_namespace as namespace_row
    on namespace_row.oid = function_row.pronamespace
  where namespace_row.nspname = 'public'
    and function_row.proname = 'rls_auto_enable';

  if target_count = 0 then
    return;
  end if;

  if target_count <> 1 then
    raise exception
      'public.rls_auto_enable has an unexpected signature or overload';
  end if;

  if (
    select pg_catalog.count(*)
    from pg_catalog.pg_roles
    where rolname in ('anon', 'authenticated', 'service_role')
  ) <> 3 then
    raise exception 'Required SkillMint database roles are missing';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_proc as function_row
    join pg_catalog.pg_language as language_row
      on language_row.oid = function_row.prolang
    join pg_catalog.pg_roles as owner_row
      on owner_row.oid = function_row.proowner
    where function_row.oid = target_oid
      and function_row.prokind = 'f'
      and function_row.pronargs = 0
      and pg_catalog.pg_get_function_identity_arguments(function_row.oid) = ''
      and function_row.prorettype =
        'pg_catalog.event_trigger'::pg_catalog.regtype
      and pg_catalog.pg_get_function_result(function_row.oid) = 'event_trigger'
      and language_row.lanname = 'plpgsql'
      and function_row.provolatile = 'v'
      and function_row.prosecdef
      and function_row.proconfig is not distinct from
        array['search_path=pg_catalog']::text[]
      and owner_row.rolname = 'postgres'
  ) then
    raise exception
      'public.rls_auto_enable() does not match the exact expected function contract';
  end if;

  select pg_catalog.format(
    '%s|%s|%s|%s|%s|%s|%s|%s|%s',
    owner_row.rolname,
    function_row.prokind,
    function_row.pronargs,
    pg_catalog.pg_get_function_identity_arguments(function_row.oid),
    pg_catalog.pg_get_function_result(function_row.oid),
    language_row.lanname,
    function_row.provolatile,
    function_row.prosecdef,
    pg_catalog.array_to_string(function_row.proconfig, ',')
  )
  into function_contract_before
  from pg_catalog.pg_proc as function_row
  join pg_catalog.pg_language as language_row
    on language_row.oid = function_row.prolang
  join pg_catalog.pg_roles as owner_row
    on owner_row.oid = function_row.proowner
  where function_row.oid = target_oid;

  select
    pg_catalog.count(*)::integer,
    (pg_catalog.array_agg(
      pg_catalog.format(
        '%s|%s|%s|%s|%s',
        trigger_owner_row.rolname,
        trigger_row.evtname,
        trigger_row.evtevent,
        trigger_row.evtenabled,
        pg_catalog.coalesce(
          (
            select pg_catalog.string_agg(tag_row.tag_name, ',' order by tag_row.tag_name)
            from pg_catalog.unnest(trigger_row.evttags) as tag_row(tag_name)
          ),
          ''
        )
      )
      order by trigger_row.oid
    ))[1]
  into event_trigger_count_before, event_trigger_contract_before
  from pg_catalog.pg_event_trigger as trigger_row
  join pg_catalog.pg_roles as trigger_owner_row
    on trigger_owner_row.oid = trigger_row.evtowner
  where trigger_row.evtfoid = target_oid;

  if event_trigger_count_before <> 1
    or event_trigger_contract_before is distinct from
      'postgres|ensure_rls|ddl_command_end|O|CREATE TABLE,CREATE TABLE AS,SELECT INTO'
  then
    raise exception
      'public.rls_auto_enable() does not match the exact expected event-trigger contract';
  end if;

  execute
    'revoke execute on function public.rls_auto_enable() from public';
  execute
    'revoke execute on function public.rls_auto_enable() from anon';
  execute
    'revoke execute on function public.rls_auto_enable() from authenticated';
  execute
    'revoke execute on function public.rls_auto_enable() from service_role';

  select pg_catalog.format(
    '%s|%s|%s|%s|%s|%s|%s|%s|%s',
    owner_row.rolname,
    function_row.prokind,
    function_row.pronargs,
    pg_catalog.pg_get_function_identity_arguments(function_row.oid),
    pg_catalog.pg_get_function_result(function_row.oid),
    language_row.lanname,
    function_row.provolatile,
    function_row.prosecdef,
    pg_catalog.array_to_string(function_row.proconfig, ',')
  )
  into function_contract_after
  from pg_catalog.pg_proc as function_row
  join pg_catalog.pg_language as language_row
    on language_row.oid = function_row.prolang
  join pg_catalog.pg_roles as owner_row
    on owner_row.oid = function_row.proowner
  where function_row.oid = target_oid;

  select
    pg_catalog.count(*)::integer,
    (pg_catalog.array_agg(
      pg_catalog.format(
        '%s|%s|%s|%s|%s',
        trigger_owner_row.rolname,
        trigger_row.evtname,
        trigger_row.evtevent,
        trigger_row.evtenabled,
        pg_catalog.coalesce(
          (
            select pg_catalog.string_agg(tag_row.tag_name, ',' order by tag_row.tag_name)
            from pg_catalog.unnest(trigger_row.evttags) as tag_row(tag_name)
          ),
          ''
        )
      )
      order by trigger_row.oid
    ))[1]
  into event_trigger_count_after, event_trigger_contract_after
  from pg_catalog.pg_event_trigger as trigger_row
  join pg_catalog.pg_roles as trigger_owner_row
    on trigger_owner_row.oid = trigger_row.evtowner
  where trigger_row.evtfoid = target_oid;

  if function_contract_after is distinct from function_contract_before
    or event_trigger_count_after <> 1
    or event_trigger_contract_after is distinct from event_trigger_contract_before
  then
    raise exception
      'public.rls_auto_enable() function or event-trigger contract changed unexpectedly';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_proc as function_row
    cross join lateral pg_catalog.aclexplode(
      pg_catalog.coalesce(
        function_row.proacl,
        pg_catalog.acldefault('f', function_row.proowner)
      )
    ) as acl_row
    where function_row.oid = target_oid
      and acl_row.privilege_type = 'EXECUTE'
      and (
        acl_row.grantee = 0
        or acl_row.grantee in (
          select role_row.oid
          from pg_catalog.pg_roles as role_row
          where role_row.rolname in (
            'anon',
            'authenticated',
            'service_role'
          )
        )
      )
  ) or pg_catalog.has_function_privilege(
    'anon',
    target_oid,
    'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'authenticated',
    target_oid,
    'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'service_role',
    target_oid,
    'EXECUTE'
  ) then
    raise exception
      'public.rls_auto_enable() retained an API-role EXECUTE privilege';
  end if;
end;
$public_function_acl_normalization$;

commit;
