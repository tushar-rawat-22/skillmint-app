\set ON_ERROR_STOP on

begin read only;

do $verification$
declare
  api_role text;
  forbidden_privilege text;
begin
  if exists (
    select 1
    from pg_catalog.pg_class as relation
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    cross join lateral pg_catalog.aclexplode(
      coalesce(
        relation.relacl,
        pg_catalog.acldefault('r', relation.relowner)
      )
    ) as acl
    where namespace.nspname = 'public'
      and relation.relname = 'analytics_events'
      and acl.grantee = 0
  ) then
    raise exception 'PUBLIC retains an analytics_events table privilege';
  end if;

  foreach api_role in array array['anon', 'authenticated']
  loop
    foreach forbidden_privilege in array array[
      'SELECT',
      'INSERT',
      'UPDATE',
      'DELETE',
      'TRUNCATE',
      'REFERENCES',
      'TRIGGER'
    ]
    loop
      if pg_catalog.has_table_privilege(
        api_role,
        'public.analytics_events',
        forbidden_privilege
      ) then
        raise exception '% retains analytics_events %', api_role, forbidden_privilege;
      end if;
    end loop;
  end loop;

  if not pg_catalog.has_table_privilege(
    'service_role',
    'public.analytics_events',
    'INSERT'
  ) then
    raise exception 'service_role lacks analytics_events INSERT';
  end if;

  foreach forbidden_privilege in array array[
    'SELECT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'REFERENCES',
    'TRIGGER'
  ]
  loop
    if pg_catalog.has_table_privilege(
      'service_role',
      'public.analytics_events',
      forbidden_privilege
    ) then
      raise exception 'service_role retains analytics_events %', forbidden_privilege;
    end if;
  end loop;

  foreach api_role in array array[
    'public',
    'anon',
    'authenticated',
    'service_role'
  ]
  loop
    if api_role = 'public' then
      if exists (
        select 1
        from pg_catalog.pg_attribute as attribute
        join pg_catalog.pg_class as relation
          on relation.oid = attribute.attrelid
        join pg_catalog.pg_namespace as namespace
          on namespace.oid = relation.relnamespace
        cross join lateral pg_catalog.aclexplode(attribute.attacl) as acl
        where namespace.nspname = 'public'
          and relation.relname = 'analytics_events'
          and attribute.attnum > 0
          and not attribute.attisdropped
          and acl.grantee = 0
          and acl.privilege_type = 'SELECT'
      ) then
        raise exception 'PUBLIC retains column-level analytics_events SELECT';
      end if;
    elsif pg_catalog.has_any_column_privilege(
      api_role,
      'public.analytics_events',
      'SELECT'
    ) then
      raise exception '% retains column-level analytics_events SELECT', api_role;
    end if;
  end loop;

  if not pg_catalog.has_function_privilege(
    'service_role',
    'public.get_founder_analytics_summary(text,text)',
    'EXECUTE'
  ) then
    raise exception 'service_role lacks founder summary EXECUTE';
  end if;

  foreach api_role in array array['anon', 'authenticated']
  loop
    if pg_catalog.has_function_privilege(
      api_role,
      'public.get_founder_analytics_summary(text,text)',
      'EXECUTE'
    ) then
      raise exception '% retains founder summary EXECUTE', api_role;
    end if;
  end loop;

  if exists (
    select 1
    from pg_catalog.pg_proc as procedure
    cross join lateral pg_catalog.aclexplode(
      coalesce(
        procedure.proacl,
        pg_catalog.acldefault('f', procedure.proowner)
      )
    ) as acl
    where procedure.oid =
      'public.get_founder_analytics_summary(text,text)'::pg_catalog.regprocedure
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ) then
    raise exception 'PUBLIC retains founder summary EXECUTE';
  end if;

  foreach api_role in array array[
    'anon',
    'authenticated',
    'service_role'
  ]
  loop
    if pg_catalog.has_function_privilege(
      api_role,
      'public.purge_expired_analytics_events()',
      'EXECUTE'
    ) then
      raise exception '% retains purge EXECUTE', api_role;
    end if;
  end loop;

  if exists (
    select 1
    from pg_catalog.pg_proc as procedure
    cross join lateral pg_catalog.aclexplode(
      coalesce(
        procedure.proacl,
        pg_catalog.acldefault('f', procedure.proowner)
      )
    ) as acl
    where procedure.oid =
      'public.purge_expired_analytics_events()'::pg_catalog.regprocedure
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ) then
    raise exception 'PUBLIC retains purge EXECUTE';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'analytics_events'
  ) then
    raise exception 'analytics_events has an unexpected RLS policy';
  end if;
end
$verification$;

rollback;
