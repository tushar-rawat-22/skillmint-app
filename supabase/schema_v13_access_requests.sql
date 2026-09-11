create table if not exists public.access_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  intent text not null,
  request_key text not null unique,
  status text not null default 'PENDING',
  request_count integer not null default 1,
  first_requested_at timestamptz not null default now(),
  last_requested_at timestamptz not null default now(),
  retention_expires_at timestamptz not null default (now() + interval '90 days'),
  constraint access_requests_email_length_check
    check (char_length(email) between 3 and 254),
  constraint access_requests_email_normalized_check
    check (email = lower(btrim(email))),
  constraint access_requests_intent_check
    check (intent in ('CANDIDATE', 'RECRUITER')),
  constraint access_requests_status_check
    check (status in ('PENDING', 'CONTACTED', 'ADMITTED', 'DECLINED')),
  constraint access_requests_request_key_check
    check (request_key ~ '^[0-9a-f]{64}$'),
  constraint access_requests_request_count_check
    check (request_count between 1 and 50),
  constraint access_requests_retention_check
    check (retention_expires_at > first_requested_at)
);

create index if not exists access_requests_status_created_at_idx
  on public.access_requests(status, first_requested_at asc);

create index if not exists access_requests_retention_expires_at_idx
  on public.access_requests(retention_expires_at);

alter table public.access_requests enable row level security;

revoke all on table public.access_requests from public, anon, authenticated;
grant select, insert, update, delete on table public.access_requests to service_role;

comment on table public.access_requests is
  'Minimal controlled-throughput access requests. Server-only; never creates auth users or personas.';
comment on column public.access_requests.retention_expires_at is
  'Operational deletion deadline. Requests should be deleted or re-justified before this timestamp.';
