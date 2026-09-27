-- SkillMint ordered schema migration v15: one-time, purpose-bound OAuth
-- reauthentication proof for protected account deletion.

create table if not exists public.oauth_deletion_reauth_intents (
  nonce_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider = 'google'),
  purpose text not null check (purpose = 'account_deletion'),
  created_at timestamptz not null default statement_timestamp(),
  expires_at timestamptz not null,
  returned_at timestamptz,
  consumed_at timestamptz,
  constraint oauth_deletion_reauth_expiry_bounded check (
    expires_at > created_at and expires_at <= created_at + interval '10 minutes'
  ),
  constraint oauth_deletion_reauth_lifecycle_order check (
    (returned_at is null or returned_at >= created_at) and
    (consumed_at is null or consumed_at >= created_at)
  ),
  unique (user_id, purpose)
);

comment on table public.oauth_deletion_reauth_intents is
  'Server-only, one-time Google OAuth proof state for account deletion. Stores only a SHA-256 nonce hash; no provider tokens or credentials.';

alter table public.oauth_deletion_reauth_intents enable row level security;
alter table public.oauth_deletion_reauth_intents force row level security;
revoke all on table public.oauth_deletion_reauth_intents from public, anon, authenticated;
grant select, insert, update, delete on table public.oauth_deletion_reauth_intents to service_role;

create index if not exists oauth_deletion_reauth_user_expiry_idx
  on public.oauth_deletion_reauth_intents (user_id, expires_at);

create or replace function public.create_oauth_deletion_reauth_intent(
  expected_user_id uuid,
  requested_nonce_hash text,
  requested_provider text,
  requested_purpose text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  if expected_user_id is null
     or requested_nonce_hash !~ '^[0-9a-f]{64}$'
     or requested_provider <> 'google'
     or requested_purpose <> 'account_deletion' then
    return false;
  end if;

  delete from public.oauth_deletion_reauth_intents
  where user_id = expected_user_id
    and purpose = requested_purpose;

  insert into public.oauth_deletion_reauth_intents (
    nonce_hash,
    user_id,
    provider,
    purpose,
    created_at,
    expires_at
  ) values (
    requested_nonce_hash,
    expected_user_id,
    requested_provider,
    requested_purpose,
    statement_timestamp(),
    statement_timestamp() + interval '10 minutes'
  );

  return true;
exception
  when foreign_key_violation or unique_violation or check_violation then
    return false;
end;
$$;

create or replace function public.mark_oauth_deletion_reauth_returned(
  requested_nonce_hash text,
  returned_user_id uuid,
  returned_provider text,
  requested_purpose text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  marked boolean := false;
begin
  update public.oauth_deletion_reauth_intents
  set returned_at = statement_timestamp()
  where nonce_hash = requested_nonce_hash
    and user_id = returned_user_id
    and provider = returned_provider
    and purpose = requested_purpose
    and expires_at > statement_timestamp()
    and returned_at is null
    and consumed_at is null
  returning true into marked;

  if coalesce(marked, false) then
    return true;
  end if;

  update public.oauth_deletion_reauth_intents
  set consumed_at = statement_timestamp()
  where nonce_hash = requested_nonce_hash
    and consumed_at is null;

  return false;
end;
$$;

create or replace function public.consume_oauth_deletion_reauth_intent(
  requested_nonce_hash text,
  expected_user_id uuid,
  expected_provider text,
  requested_purpose text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  consumed boolean := false;
begin
  update public.oauth_deletion_reauth_intents
  set consumed_at = statement_timestamp()
  where nonce_hash = requested_nonce_hash
    and user_id = expected_user_id
    and provider = expected_provider
    and purpose = requested_purpose
    and expires_at > statement_timestamp()
    and returned_at is not null
    and consumed_at is null
  returning true into consumed;

  if coalesce(consumed, false) then
    return true;
  end if;

  update public.oauth_deletion_reauth_intents
  set consumed_at = statement_timestamp()
  where nonce_hash = requested_nonce_hash
    and consumed_at is null;

  return false;
end;
$$;

create or replace function public.invalidate_oauth_deletion_reauth_intent(
  requested_nonce_hash text
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  invalidated boolean := false;
begin
  update public.oauth_deletion_reauth_intents
  set consumed_at = statement_timestamp()
  where nonce_hash = requested_nonce_hash
    and consumed_at is null
  returning true into invalidated;

  return coalesce(invalidated, false);
end;
$$;

alter function public.create_oauth_deletion_reauth_intent(uuid, text, text, text) owner to postgres;
alter function public.mark_oauth_deletion_reauth_returned(text, uuid, text, text) owner to postgres;
alter function public.consume_oauth_deletion_reauth_intent(text, uuid, text, text) owner to postgres;
alter function public.invalidate_oauth_deletion_reauth_intent(text) owner to postgres;

revoke all on function public.create_oauth_deletion_reauth_intent(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.mark_oauth_deletion_reauth_returned(text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.consume_oauth_deletion_reauth_intent(text, uuid, text, text) from public, anon, authenticated;
revoke all on function public.invalidate_oauth_deletion_reauth_intent(text) from public, anon, authenticated;

grant execute on function public.create_oauth_deletion_reauth_intent(uuid, text, text, text) to service_role;
grant execute on function public.mark_oauth_deletion_reauth_returned(text, uuid, text, text) to service_role;
grant execute on function public.consume_oauth_deletion_reauth_intent(text, uuid, text, text) to service_role;
grant execute on function public.invalidate_oauth_deletion_reauth_intent(text) to service_role;
