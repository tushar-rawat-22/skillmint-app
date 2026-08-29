begin;

-- Account personas are business state. Authenticated browser sessions may read
-- their own value, but only trusted server code may create or remove it.
revoke insert, update, delete on table public.account_personas from authenticated;

drop policy if exists account_personas_insert_own on public.account_personas;
drop policy if exists account_personas_update_own on public.account_personas;
drop policy if exists account_personas_delete_own on public.account_personas;

create or replace function public.reject_account_persona_identity_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id
     or new.persona is distinct from old.persona then
    raise exception 'account persona identity is immutable';
  end if;

  return new;
end;
$$;

revoke all on function public.reject_account_persona_identity_change() from public, anon, authenticated;

drop trigger if exists account_personas_identity_immutable on public.account_personas;
create trigger account_personas_identity_immutable
before update of user_id, persona on public.account_personas
for each row
execute function public.reject_account_persona_identity_change();

comment on function public.reject_account_persona_identity_change() is
  'Prevents account persona identity or role changes after creation. Persona transitions require an explicit future migration, not a browser claim.';

commit;
