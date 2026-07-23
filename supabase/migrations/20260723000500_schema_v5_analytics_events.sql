-- SkillMint ordered schema migration v5: privacy-safe analytics collection.
-- Repository code only. Do not apply without a separately authorized rollout.
-- Apply after schema_v1.sql through schema_v4_account_deletion_security.sql.

begin;

create table public.analytics_events (
  event_id uuid primary key,
  event_name text not null,
  event_version smallint not null,
  occurred_at timestamptz not null,
  received_at timestamptz not null default now(),
  environment text not null,
  build_id text not null,
  source_screen text not null,
  owner_mode text not null,
  properties jsonb not null,
  constraint analytics_events_event_name_check check (event_name in (
    'career_setup_started',
    'resume_analysis_started',
    'resume_analysis_failed',
    'active_target_selected',
    'active_target_cleared',
    'jd_match_started',
    'jd_match_completed',
    'roadmap_reached',
    'mission_started',
    'mission_marked_done',
    'analysis_restored',
    'feedback_persisted',
    'product_operation_failed'
  )),
  constraint analytics_events_event_version_check check (event_version = 1),
  constraint analytics_events_environment_check check (
    environment in ('development', 'test', 'preview', 'production')
  ),
  constraint analytics_events_build_id_check check (
    char_length(build_id) between 1 and 64 and build_id ~ '^[A-Za-z0-9._-]+$'
  ),
  constraint analytics_events_source_screen_check check (source_screen in (
    'home', 'login', 'signup', 'forgot_password', 'reset_password',
    'career_setup', 'resume_upload', 'resume_report', 'dashboard', 'jd_match',
    'roadmap', 'profile', 'settings', 'data_controls', 'privacy'
  )),
  constraint analytics_events_owner_mode_check check (
    owner_mode in ('anonymous', 'account')
  ),
  constraint analytics_events_properties_object_check check (
    jsonb_typeof(properties) = 'object'
  ),
  constraint analytics_events_properties_size_check check (
    octet_length(properties::text) <= 512
  )
);

alter table public.analytics_events enable row level security;
alter table public.analytics_events force row level security;

revoke all on table public.analytics_events from public, anon, authenticated;
grant insert on table public.analytics_events to service_role;

create index analytics_events_received_at_idx
on public.analytics_events(received_at desc);

create index analytics_events_event_name_received_at_idx
on public.analytics_events(event_name, received_at desc);

create index analytics_events_environment_received_at_idx
on public.analytics_events(environment, received_at desc);

commit;
