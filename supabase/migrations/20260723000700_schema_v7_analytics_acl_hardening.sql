-- SkillMint ordered schema migration v7: analytics table ACL hardening.
-- Repository code only. Do not apply without a separately authorized rollout.
-- Apply after schema_v1.sql through schema_v6_analytics_aggregation.sql.

begin;

revoke all privileges
on table public.analytics_events
from public, anon, authenticated, service_role;

revoke select (
  event_id,
  event_name,
  event_version,
  occurred_at,
  received_at,
  environment,
  build_id,
  source_screen,
  owner_mode,
  properties
)
on table public.analytics_events
from public, anon, authenticated, service_role;

revoke insert (
  event_id,
  event_name,
  event_version,
  occurred_at,
  received_at,
  environment,
  build_id,
  source_screen,
  owner_mode,
  properties
)
on table public.analytics_events
from public, anon, authenticated, service_role;

revoke update (
  event_id,
  event_name,
  event_version,
  occurred_at,
  received_at,
  environment,
  build_id,
  source_screen,
  owner_mode,
  properties
)
on table public.analytics_events
from public, anon, authenticated, service_role;

revoke references (
  event_id,
  event_name,
  event_version,
  occurred_at,
  received_at,
  environment,
  build_id,
  source_screen,
  owner_mode,
  properties
)
on table public.analytics_events
from public, anon, authenticated, service_role;

grant insert
on table public.analytics_events
to service_role;

commit;
