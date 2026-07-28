-- SkillMint ordered schema migration v8: Resume Workspace account selection.
-- Apply after schema_v1.sql through schema_v7_analytics_acl_hardening.sql.
-- Saved analyses, the account Workspace selection, and the browser-active
-- report remain separate concepts.

begin;

do $v8_preflight$
declare
  resume_table_oid oid := pg_catalog.to_regclass(
    'public.resume_analyses'
  );
  active_guard_oid oid := pg_catalog.to_regprocedure(
    'public.is_active_skillmint_user()'
  );
  saved_reports_oid oid := pg_catalog.to_regprocedure(
    'public.delete_current_user_saved_reports()'
  );
  prepare_deletion_oid oid := pg_catalog.to_regprocedure(
    'public.prepare_account_deletion(uuid)'
  );
  resume_user_attnum smallint;
  resume_id_attnum smallint;
  required_table_name text;
begin
  if (
    select pg_catalog.count(*)
    from pg_catalog.pg_roles
    where rolname in ('anon', 'authenticated', 'service_role')
  ) <> 3 then
    raise exception 'Required SkillMint database roles are missing';
  end if;

  foreach required_table_name in array array[
    'auth.users',
    'public.profiles',
    'public.resume_analyses',
    'public.job_matches',
    'public.career_snapshots',
    'public.beta_feedback'
  ] loop
    if pg_catalog.to_regclass(required_table_name) is null then
      raise exception 'Required SkillMint table is missing: %',
        required_table_name;
    end if;
  end loop;

  if pg_catalog.to_regclass('public.active_resume_selections') is not null
    or pg_catalog.to_regprocedure(
      'public.enforce_active_resume_selection_write()'
    ) is not null
    or exists (
      select 1
      from pg_catalog.pg_constraint
      where conrelid = resume_table_oid
        and conname = 'resume_analyses_user_id_id_key'
    ) then
    raise exception 'V8 objects already exist or the baseline is incompatible';
  end if;

  select attnum
  into resume_user_attnum
  from pg_catalog.pg_attribute
  where attrelid = resume_table_oid
    and attname = 'user_id'
    and atttypid = 'pg_catalog.uuid'::pg_catalog.regtype
    and attnotnull
    and not attisdropped;

  select attnum
  into resume_id_attnum
  from pg_catalog.pg_attribute
  where attrelid = resume_table_oid
    and attname = 'id'
    and atttypid = 'pg_catalog.uuid'::pg_catalog.regtype
    and attnotnull
    and not attisdropped;

  if resume_user_attnum is null or resume_id_attnum is null
    or not exists (
      select 1
      from pg_catalog.pg_class
      where oid = resume_table_oid
        and relkind = 'r'
        and relrowsecurity
        and pg_catalog.pg_get_userbyid(relowner) = 'postgres'
    )
    or not exists (
      select 1
      from pg_catalog.pg_constraint
      where conrelid = resume_table_oid
        and contype = 'p'
        and conkey = array[resume_id_attnum]::smallint[]
    )
    or not exists (
      select 1
      from pg_catalog.pg_constraint
      where conrelid = resume_table_oid
        and confrelid = 'auth.users'::pg_catalog.regclass
        and contype = 'f'
        and confdeltype = 'c'
        and conkey = array[resume_user_attnum]::smallint[]
    ) then
    raise exception
      'public.resume_analyses ownership, columns, RLS, or keys are incompatible';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_index
    where indexrelid = pg_catalog.to_regclass(
        'public.resume_analyses_user_id_id_idx'
      )
      and indrelid = resume_table_oid
      and not indisunique
      and indisvalid
      and indisready
      and indnkeyatts = 2
      and indnatts = 2
      and indkey[0] = resume_user_attnum
      and indkey[1] = resume_id_attnum
      and indexprs is null
      and indpred is null
  ) or not exists (
    select 1
    from pg_catalog.pg_index
    where indexrelid = pg_catalog.to_regclass(
        'public.resume_analyses_user_id_created_at_id_idx'
      )
      and indrelid = resume_table_oid
      and not indisunique
      and indisvalid
      and indisready
      and indnkeyatts = 3
      and indnatts = 3
      and indexprs is null
      and indpred is null
  ) then
    raise exception 'public.resume_analyses indexes are incompatible';
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
  ) or pg_catalog.has_function_privilege(
    'service_role',
    active_guard_oid,
    'EXECUTE'
  ) then
    raise exception
      'public.is_active_skillmint_user() has an incompatible contract';
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
  ) or pg_catalog.has_function_privilege(
    'service_role',
    saved_reports_oid,
    'EXECUTE'
  ) then
    raise exception
      'public.delete_current_user_saved_reports() has an incompatible contract';
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
$v8_preflight$;

alter table public.resume_analyses
  add constraint resume_analyses_user_id_id_key
  unique (user_id, id);

-- The new unique constraint creates the same leading (user_id, id) btree, so
-- the older non-unique index is redundant. The history-order index remains.
drop index public.resume_analyses_user_id_id_idx;

create table public.active_resume_selections (
  user_id uuid not null,
  resume_analysis_id uuid not null,
  selected_at timestamptz not null default pg_catalog.now(),
  constraint active_resume_selections_pkey
    primary key (user_id),
  constraint active_resume_selections_user_id_fkey
    foreign key (user_id)
    references auth.users(id)
    on delete cascade,
  constraint active_resume_selections_user_id_resume_analysis_id_fkey
    foreign key (user_id, resume_analysis_id)
    references public.resume_analyses(user_id, id)
    on delete cascade
);

alter table public.active_resume_selections owner to postgres;
alter table public.active_resume_selections enable row level security;

create function public.enforce_active_resume_selection_write()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  if tg_op = 'INSERT' then
    new.selected_at := pg_catalog.statement_timestamp();
  elsif tg_op = 'UPDATE' then
    if new.user_id is distinct from old.user_id then
      raise exception 'active_resume_selections.user_id is immutable'
        using errcode = '22023';
    end if;

    if new.resume_analysis_id is distinct from old.resume_analysis_id then
      new.selected_at := pg_catalog.statement_timestamp();
    else
      new.selected_at := old.selected_at;
    end if;
  else
    raise exception 'Unsupported active resume selection trigger operation'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

alter function public.enforce_active_resume_selection_write()
owner to postgres;
revoke all on function public.enforce_active_resume_selection_write()
from public, anon, authenticated, service_role;

create trigger enforce_active_resume_selection_write
before insert or update on public.active_resume_selections
for each row
execute function public.enforce_active_resume_selection_write();

revoke all privileges
on table public.active_resume_selections
from public, anon, authenticated, service_role;
revoke select (user_id, resume_analysis_id, selected_at)
on table public.active_resume_selections
from public, anon, authenticated, service_role;
revoke insert (user_id, resume_analysis_id, selected_at)
on table public.active_resume_selections
from public, anon, authenticated, service_role;
revoke update (user_id, resume_analysis_id, selected_at)
on table public.active_resume_selections
from public, anon, authenticated, service_role;
revoke references (user_id, resume_analysis_id, selected_at)
on table public.active_resume_selections
from public, anon, authenticated, service_role;

grant select (user_id, resume_analysis_id, selected_at)
on table public.active_resume_selections
to authenticated;
grant insert (user_id, resume_analysis_id)
on table public.active_resume_selections
to authenticated;
grant update (resume_analysis_id)
on table public.active_resume_selections
to authenticated;
grant delete
on table public.active_resume_selections
to authenticated;

create policy "Users can select their own active resume selection"
on public.active_resume_selections
for select
to authenticated
using (
  public.is_active_skillmint_user()
  and auth.uid() = user_id
);

create policy "Users can insert their own active resume selection"
on public.active_resume_selections
for insert
to authenticated
with check (
  public.is_active_skillmint_user()
  and auth.uid() = user_id
);

create policy "Users can update their own active resume selection"
on public.active_resume_selections
for update
to authenticated
using (
  public.is_active_skillmint_user()
  and auth.uid() = user_id
)
with check (
  public.is_active_skillmint_user()
  and auth.uid() = user_id
);

create policy "Users can delete their own active resume selection"
on public.active_resume_selections
for delete
to authenticated
using (
  public.is_active_skillmint_user()
  and auth.uid() = user_id
);

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

  if exists (
    select 1
    from public.active_resume_selections
    where user_id = current_user_id
  ) then
    raise exception 'Workspace resume selection cleanup verification failed'
      using errcode = 'P0001';
  end if;

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
    select 1
    from public.active_resume_selections
    where user_id = current_user_id
  ) then
    raise exception 'Workspace resume selection cleanup verification failed'
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

drop function public.prepare_account_deletion(uuid);

create function public.prepare_account_deletion(target_user_id uuid)
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

  with deleted as (
    delete from public.active_resume_selections
    where user_id = target_user_id
    returning 1
  )
  select pg_catalog.count(*)::integer
  into active_resume_selections_deleted
  from deleted;

  with deleted as (
    delete from public.resume_analyses
    where user_id = target_user_id
    returning 1
  )
  select pg_catalog.count(*)::integer
  into resume_analyses_deleted
  from deleted;

  with deleted as (
    delete from public.job_matches
    where user_id = target_user_id
    returning 1
  )
  select pg_catalog.count(*)::integer
  into job_matches_deleted
  from deleted;

  with deleted as (
    delete from public.career_snapshots
    where user_id = target_user_id
    returning 1
  )
  select pg_catalog.count(*)::integer
  into career_snapshots_deleted
  from deleted;

  with deleted as (
    delete from public.profiles
    where id = target_user_id
    returning 1
  )
  select pg_catalog.count(*)::integer
  into profiles_deleted
  from deleted;

  with deleted as (
    delete from public.beta_feedback
    where user_id = target_user_id
    returning 1
  )
  select pg_catalog.count(*)::integer
  into beta_feedback_deleted
  from deleted;

  verified_absent := not exists (
    select 1
    from public.active_resume_selections
    where user_id = target_user_id
    union all
    select 1
    from public.profiles
    where id = target_user_id
    union all
    select 1
    from public.resume_analyses
    where user_id = target_user_id
    union all
    select 1
    from public.job_matches
    where user_id = target_user_id
    union all
    select 1
    from public.career_snapshots
    where user_id = target_user_id
    union all
    select 1
    from public.beta_feedback
    where user_id = target_user_id
  );

  if not verified_absent then
    raise exception 'Account data cleanup verification failed'
      using errcode = 'P0001';
  end if;

  return next;
end;
$$;

alter function public.prepare_account_deletion(uuid) owner to postgres;
revoke all on function public.prepare_account_deletion(uuid)
from public, anon, authenticated, service_role;
grant execute on function public.prepare_account_deletion(uuid)
to service_role;

do $v8_postflight$
declare
  active_table_oid oid := pg_catalog.to_regclass(
    'public.active_resume_selections'
  );
  trigger_function_oid oid := pg_catalog.to_regprocedure(
    'public.enforce_active_resume_selection_write()'
  );
  saved_reports_oid oid := pg_catalog.to_regprocedure(
    'public.delete_current_user_saved_reports()'
  );
  prepare_deletion_oid oid := pg_catalog.to_regprocedure(
    'public.prepare_account_deletion(uuid)'
  );
  authenticated_oid oid;
  active_user_attnum smallint;
  active_resume_attnum smallint;
  active_selected_attnum smallint;
  auth_id_attnum smallint;
  resume_user_attnum smallint;
  resume_id_attnum smallint;
  required_role_name text;
begin
  select oid
  into authenticated_oid
  from pg_catalog.pg_roles
  where rolname = 'authenticated';

  select attnum
  into active_user_attnum
  from pg_catalog.pg_attribute
  where attrelid = active_table_oid
    and attname = 'user_id'
    and atttypid = 'pg_catalog.uuid'::pg_catalog.regtype
    and attnotnull
    and not attisdropped;

  select attnum
  into active_resume_attnum
  from pg_catalog.pg_attribute
  where attrelid = active_table_oid
    and attname = 'resume_analysis_id'
    and atttypid = 'pg_catalog.uuid'::pg_catalog.regtype
    and attnotnull
    and not attisdropped;

  select attnum
  into active_selected_attnum
  from pg_catalog.pg_attribute
  where attrelid = active_table_oid
    and attname = 'selected_at'
    and atttypid = 'pg_catalog.timestamptz'::pg_catalog.regtype
    and attnotnull
    and not attisdropped;

  select attnum into auth_id_attnum
  from pg_catalog.pg_attribute
  where attrelid = 'auth.users'::pg_catalog.regclass
    and attname = 'id'
    and not attisdropped;

  select attnum into resume_user_attnum
  from pg_catalog.pg_attribute
  where attrelid = 'public.resume_analyses'::pg_catalog.regclass
    and attname = 'user_id'
    and not attisdropped;

  select attnum into resume_id_attnum
  from pg_catalog.pg_attribute
  where attrelid = 'public.resume_analyses'::pg_catalog.regclass
    and attname = 'id'
    and not attisdropped;

  if active_table_oid is null
    or authenticated_oid is null
    or active_user_attnum is null
    or active_resume_attnum is null
    or active_selected_attnum is null
    or (
      select pg_catalog.count(*)
      from pg_catalog.pg_attribute
      where attrelid = active_table_oid
        and attnum > 0
        and not attisdropped
    ) <> 3
    or not exists (
      select 1
      from pg_catalog.pg_class
      where oid = active_table_oid
        and relkind = 'r'
        and relrowsecurity
        and pg_catalog.pg_get_userbyid(relowner) = 'postgres'
    )
    or not exists (
      select 1
      from pg_catalog.pg_attrdef
      where adrelid = active_table_oid
        and adnum = active_selected_attnum
        and pg_catalog.pg_get_expr(adbin, adrelid)
          in ('now()', 'pg_catalog.now()')
    ) then
    raise exception
      'public.active_resume_selections table verification failed';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = active_table_oid
      and conname = 'active_resume_selections_pkey'
      and contype = 'p'
      and conkey = array[active_user_attnum]::smallint[]
  ) or not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = active_table_oid
      and conname = 'active_resume_selections_user_id_fkey'
      and contype = 'f'
      and confrelid = 'auth.users'::pg_catalog.regclass
      and confdeltype = 'c'
      and conkey = array[active_user_attnum]::smallint[]
      and confkey = array[auth_id_attnum]::smallint[]
  ) or not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = active_table_oid
      and conname =
        'active_resume_selections_user_id_resume_analysis_id_fkey'
      and contype = 'f'
      and confrelid = 'public.resume_analyses'::pg_catalog.regclass
      and confdeltype = 'c'
      and conkey =
        array[active_user_attnum, active_resume_attnum]::smallint[]
      and confkey = array[resume_user_attnum, resume_id_attnum]::smallint[]
  ) or exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = active_table_oid
      and contype = 'f'
      and conkey = array[active_resume_attnum]::smallint[]
  ) then
    raise exception
      'public.active_resume_selections constraint verification failed';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.resume_analyses'::pg_catalog.regclass
      and conname = 'resume_analyses_user_id_id_key'
      and contype = 'u'
      and conkey = array[resume_user_attnum, resume_id_attnum]::smallint[]
  ) or pg_catalog.to_regclass(
    'public.resume_analyses_user_id_id_idx'
  ) is not null or pg_catalog.to_regclass(
    'public.resume_analyses_user_id_created_at_id_idx'
  ) is null then
    raise exception
      'public.resume_analyses V8 key or index verification failed';
  end if;

  if trigger_function_oid is null
    or (
      select pg_catalog.count(*)
      from pg_catalog.pg_trigger
      where tgrelid = active_table_oid
        and not tgisinternal
        and tgname = 'enforce_active_resume_selection_write'
        and tgfoid = trigger_function_oid
        and tgenabled = 'O'
    ) <> 1
    or not exists (
      select 1
      from pg_catalog.pg_proc
      where oid = trigger_function_oid
        and pg_catalog.pg_get_userbyid(proowner) = 'postgres'
        and not prosecdef
        and proconfig is not distinct from
          array['search_path=pg_catalog']::text[]
        and pg_catalog.pg_get_function_result(oid) = 'trigger'
        and pg_catalog.strpos(
          pg_catalog.lower(prosrc),
          'new.user_id is distinct from old.user_id'
        ) > 0
        and pg_catalog.strpos(
          pg_catalog.lower(prosrc),
          'new.resume_analysis_id is distinct from old.resume_analysis_id'
        ) > 0
    )
    or exists (
      select 1
      from pg_catalog.pg_proc
      cross join lateral pg_catalog.aclexplode(coalesce(
        proacl,
        pg_catalog.acldefault('f', proowner)
      )) as acl_row
      where oid = trigger_function_oid
        and acl_row.privilege_type = 'EXECUTE'
        and acl_row.grantee <> proowner
    ) then
    raise exception
      'Workspace selection trigger verification failed';
  end if;

  if (
    select pg_catalog.count(*)
    from pg_catalog.pg_policy
    where polrelid = active_table_oid
  ) <> 4
    or (
      select pg_catalog.count(distinct polcmd)
      from pg_catalog.pg_policy
      where polrelid = active_table_oid
        and polroles = array[authenticated_oid]::oid[]
        and (
          pg_catalog.strpos(
            pg_catalog.lower(coalesce(
              pg_catalog.pg_get_expr(polqual, polrelid),
              ''
            )),
            'auth.uid()'
          ) > 0
          or pg_catalog.strpos(
            pg_catalog.lower(coalesce(
              pg_catalog.pg_get_expr(polwithcheck, polrelid),
              ''
            )),
            'auth.uid()'
          ) > 0
        )
        and (
          pg_catalog.strpos(
            pg_catalog.lower(coalesce(
              pg_catalog.pg_get_expr(polqual, polrelid),
              ''
            )),
            'is_active_skillmint_user'
          ) > 0
          or pg_catalog.strpos(
            pg_catalog.lower(coalesce(
              pg_catalog.pg_get_expr(polwithcheck, polrelid),
              ''
            )),
            'is_active_skillmint_user'
          ) > 0
        )
    ) <> 4 then
    raise exception
      'public.active_resume_selections policy verification failed';
  end if;

  foreach required_role_name in array array['anon', 'service_role'] loop
    if pg_catalog.has_table_privilege(
      required_role_name,
      active_table_oid,
      'SELECT'
    ) or pg_catalog.has_table_privilege(
      required_role_name,
      active_table_oid,
      'INSERT'
    ) or pg_catalog.has_table_privilege(
      required_role_name,
      active_table_oid,
      'UPDATE'
    ) or pg_catalog.has_table_privilege(
      required_role_name,
      active_table_oid,
      'DELETE'
    ) or pg_catalog.has_table_privilege(
      required_role_name,
      active_table_oid,
      'TRUNCATE'
    ) or pg_catalog.has_table_privilege(
      required_role_name,
      active_table_oid,
      'REFERENCES'
    ) or pg_catalog.has_table_privilege(
      required_role_name,
      active_table_oid,
      'TRIGGER'
    ) or pg_catalog.has_any_column_privilege(
      required_role_name,
      active_table_oid,
      'SELECT'
    ) or pg_catalog.has_any_column_privilege(
      required_role_name,
      active_table_oid,
      'INSERT'
    ) or pg_catalog.has_any_column_privilege(
      required_role_name,
      active_table_oid,
      'UPDATE'
    ) or pg_catalog.has_any_column_privilege(
      required_role_name,
      active_table_oid,
      'REFERENCES'
    ) then
      raise exception
        'Role % retained an active-resume-selection privilege',
        required_role_name;
    end if;
  end loop;

  if not pg_catalog.has_table_privilege(
    'authenticated',
    active_table_oid,
    'DELETE'
  ) or pg_catalog.has_table_privilege(
    'authenticated',
    active_table_oid,
    'SELECT'
  ) or pg_catalog.has_table_privilege(
    'authenticated',
    active_table_oid,
    'INSERT'
  ) or pg_catalog.has_table_privilege(
    'authenticated',
    active_table_oid,
    'UPDATE'
  ) or pg_catalog.has_table_privilege(
    'authenticated',
    active_table_oid,
    'TRUNCATE'
  ) or pg_catalog.has_table_privilege(
    'authenticated',
    active_table_oid,
    'REFERENCES'
  ) or pg_catalog.has_table_privilege(
    'authenticated',
    active_table_oid,
    'TRIGGER'
  ) or not pg_catalog.has_column_privilege(
    'authenticated', active_table_oid, 'user_id', 'SELECT'
  ) or not pg_catalog.has_column_privilege(
    'authenticated', active_table_oid, 'resume_analysis_id', 'SELECT'
  ) or not pg_catalog.has_column_privilege(
    'authenticated', active_table_oid, 'selected_at', 'SELECT'
  ) or not pg_catalog.has_column_privilege(
    'authenticated', active_table_oid, 'user_id', 'INSERT'
  ) or not pg_catalog.has_column_privilege(
    'authenticated', active_table_oid, 'resume_analysis_id', 'INSERT'
  ) or pg_catalog.has_column_privilege(
    'authenticated', active_table_oid, 'selected_at', 'INSERT'
  ) or pg_catalog.has_column_privilege(
    'authenticated', active_table_oid, 'user_id', 'UPDATE'
  ) or not pg_catalog.has_column_privilege(
    'authenticated', active_table_oid, 'resume_analysis_id', 'UPDATE'
  ) or pg_catalog.has_column_privilege(
    'authenticated', active_table_oid, 'selected_at', 'UPDATE'
  ) then
    raise exception
      'authenticated active-resume-selection privileges are incompatible';
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
      and pg_catalog.strpos(
        pg_catalog.lower(prosrc),
        'delete from public.active_resume_selections'
      ) > 0
      and pg_catalog.strpos(
        pg_catalog.lower(prosrc),
        'workspace resume selection cleanup verification failed'
      ) > 0
  ) or pg_catalog.has_function_privilege(
    'anon', saved_reports_oid, 'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'authenticated', saved_reports_oid, 'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'service_role', saved_reports_oid, 'EXECUTE'
  ) then
    raise exception
      'Saved-report lifecycle function verification failed';
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
        'TABLE(profiles_deleted integer, resume_analyses_deleted integer, job_matches_deleted integer, career_snapshots_deleted integer, beta_feedback_deleted integer, active_resume_selections_deleted integer, verified_absent boolean)'
      )
      and pg_catalog.strpos(
        pg_catalog.lower(prosrc),
        'delete from public.active_resume_selections'
      ) > 0
      and pg_catalog.strpos(
        pg_catalog.lower(prosrc),
        'from public.active_resume_selections'
      ) > 0
  ) or pg_catalog.has_function_privilege(
    'anon', prepare_deletion_oid, 'EXECUTE'
  ) or pg_catalog.has_function_privilege(
    'authenticated', prepare_deletion_oid, 'EXECUTE'
  ) or not pg_catalog.has_function_privilege(
    'service_role', prepare_deletion_oid, 'EXECUTE'
  ) then
    raise exception
      'Protected account-deletion function verification failed';
  end if;
end;
$v8_postflight$;

commit;
