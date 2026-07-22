-- SkillMint ordered schema migration v6: privacy-safe founder aggregation.
-- Repository code only. Do not apply without a separately authorized rollout.
-- Apply after schema_v1.sql through schema_v5_analytics_events.sql.

begin;

create function public.get_founder_analytics_summary(
  requested_window text,
  canonical_environment text
)
returns table(summary jsonb)
language plpgsql
security definer
set search_path = ''
set statement_timeout = '2s'
as $$
declare
  as_of_time timestamptz := date_trunc('milliseconds', statement_timestamp());
  window_start_time timestamptz;
begin
  if requested_window = '24h' then
    window_start_time := as_of_time - interval '24 hours';
  elsif requested_window = '7d' then
    window_start_time := as_of_time - interval '168 hours';
  elsif requested_window = '30d' then
    window_start_time := as_of_time - interval '720 hours';
  else
    raise exception using errcode = '22023', message = 'invalid analytics window';
  end if;

  if canonical_environment not in ('development', 'test', 'preview', 'production') then
    raise exception using errcode = '22023', message = 'invalid analytics environment';
  end if;

  return query
  with window_events as materialized (
    select
      analytics.event_name,
      analytics.received_at,
      analytics.properties
    from public.analytics_events as analytics
    where analytics.environment = canonical_environment
      and analytics.received_at >= window_start_time
      and analytics.received_at < as_of_time
  ),
  event_totals as (
    select
      count(*)::bigint as total_event_count,
      max(window_events.received_at) as last_received_at,
      count(*) filter (where window_events.event_name = 'career_setup_started')::bigint as career_setup_started,
      count(*) filter (where window_events.event_name = 'resume_analysis_started')::bigint as resume_analysis_started,
      count(*) filter (where window_events.event_name = 'resume_analysis_failed')::bigint as resume_analysis_failed,
      count(*) filter (where window_events.event_name = 'active_target_selected')::bigint as active_target_selected,
      count(*) filter (where window_events.event_name = 'active_target_cleared')::bigint as active_target_cleared,
      count(*) filter (where window_events.event_name = 'jd_match_started')::bigint as jd_match_started,
      count(*) filter (where window_events.event_name = 'jd_match_completed')::bigint as jd_match_completed,
      count(*) filter (where window_events.event_name = 'roadmap_reached')::bigint as roadmap_reached,
      count(*) filter (where window_events.event_name = 'mission_started')::bigint as mission_started,
      count(*) filter (where window_events.event_name = 'mission_marked_done')::bigint as mission_marked_done,
      count(*) filter (where window_events.event_name = 'analysis_restored')::bigint as analysis_restored,
      count(*) filter (where window_events.event_name = 'feedback_persisted')::bigint as feedback_persisted,
      count(*) filter (where window_events.event_name = 'product_operation_failed')::bigint as product_operation_failed
    from window_events
  ),
  operation_values(operation) as (
    values
      ('career_setup'::text),
      ('resume_analysis'::text),
      ('active_target_selection'::text),
      ('active_target_clear'::text),
      ('jd_match'::text),
      ('roadmap_load'::text),
      ('mission_status'::text),
      ('analysis_restore'::text),
      ('feedback_persistence'::text)
  ),
  error_values(error_code) as (
    values
      ('invalid_input'::text),
      ('not_configured'::text),
      ('not_authenticated'::text),
      ('account_changed'::text),
      ('network_failure'::text),
      ('permission_denied'::text),
      ('schema_unavailable'::text),
      ('invalid_response'::text),
      ('owner_unresolved'::text),
      ('storage_unavailable'::text),
      ('storage_read_failed'::text),
      ('storage_corrupted'::text),
      ('storage_write_failed'::text),
      ('stale_context'::text),
      ('operation_unavailable'::text),
      ('unknown'::text)
  ),
  observed_operation_errors as (
    select
      window_events.properties ->> 'operation' as operation,
      window_events.properties ->> 'error_code' as error_code,
      count(*)::bigint as event_count
    from window_events
    where window_events.event_name = 'product_operation_failed'
    group by
      window_events.properties ->> 'operation',
      window_events.properties ->> 'error_code'
  ),
  operation_error_objects as (
    select
      operation_values.operation,
      jsonb_object_agg(
        error_values.error_code,
        coalesce(observed_operation_errors.event_count, 0)
        order by error_values.error_code
      ) as error_counts
    from operation_values
    cross join error_values
    left join observed_operation_errors
      on observed_operation_errors.operation = operation_values.operation
      and observed_operation_errors.error_code = error_values.error_code
    group by operation_values.operation
  ),
  operation_error_totals as (
    select jsonb_object_agg(
      operation_error_objects.operation,
      operation_error_objects.error_counts
      order by operation_error_objects.operation
    ) as counts
    from operation_error_objects
  ),
  feedback_totals as (
    select jsonb_build_object(
      'account', count(*) filter (
        where window_events.event_name = 'feedback_persisted'
          and window_events.properties ->> 'persistence_path' = 'account'
      )::bigint,
      'browser', count(*) filter (
        where window_events.event_name = 'feedback_persisted'
          and window_events.properties ->> 'persistence_path' = 'browser'
      )::bigint,
      'browser_fallback', count(*) filter (
        where window_events.event_name = 'feedback_persisted'
          and window_events.properties ->> 'persistence_path' = 'browser_fallback'
      )::bigint
    ) as counts
    from window_events
  ),
  retention_totals as (
    select count(*)::bigint as overdue_count
    from public.analytics_events as analytics
    where analytics.environment = canonical_environment
      and analytics.received_at < as_of_time - interval '1080 hours'
  )
  select jsonb_build_object(
    'contract_version', 'founder_analytics_summary.v1',
    'as_of', to_char(as_of_time at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'window_name', requested_window,
    'window_start', to_char(window_start_time at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'window_end', to_char(as_of_time at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'canonical_environment', canonical_environment,
    'total_event_count', event_totals.total_event_count,
    'last_received_at', case
      when event_totals.last_received_at is null then null
      else to_jsonb(to_char(event_totals.last_received_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'))
    end,
    'event_counts', jsonb_build_object(
      'career_setup_started', event_totals.career_setup_started,
      'resume_analysis_started', event_totals.resume_analysis_started,
      'resume_analysis_failed', event_totals.resume_analysis_failed,
      'active_target_selected', event_totals.active_target_selected,
      'active_target_cleared', event_totals.active_target_cleared,
      'jd_match_started', event_totals.jd_match_started,
      'jd_match_completed', event_totals.jd_match_completed,
      'roadmap_reached', event_totals.roadmap_reached,
      'mission_started', event_totals.mission_started,
      'mission_marked_done', event_totals.mission_marked_done,
      'analysis_restored', event_totals.analysis_restored,
      'feedback_persisted', event_totals.feedback_persisted,
      'product_operation_failed', event_totals.product_operation_failed
    ),
    'operation_error_counts', operation_error_totals.counts,
    'feedback_persistence_counts', feedback_totals.counts,
    'retention_overdue_count', retention_totals.overdue_count
  )
  from event_totals
  cross join operation_error_totals
  cross join feedback_totals
  cross join retention_totals;
end;
$$;

revoke all on function public.get_founder_analytics_summary(text, text) from public;
revoke all on function public.get_founder_analytics_summary(text, text) from anon;
revoke all on function public.get_founder_analytics_summary(text, text) from authenticated;
grant execute on function public.get_founder_analytics_summary(text, text) to service_role;

create function public.purge_expired_analytics_events()
returns table(deleted_count bigint)
language sql
security definer
set search_path = ''
set statement_timeout = '2s'
as $$
  with purge_clock as (
    select date_trunc('milliseconds', statement_timestamp()) as as_of_time
  ),
  expired_event_ids as materialized (
    select analytics.event_id
    from public.analytics_events as analytics
    cross join purge_clock
    where analytics.received_at < purge_clock.as_of_time - interval '1080 hours'
    order by analytics.received_at, analytics.event_id
    limit 10000
  ),
  deleted as (
    delete from public.analytics_events as analytics
    using expired_event_ids
    where analytics.event_id = expired_event_ids.event_id
    returning 1
  )
  select count(*)::bigint as deleted_count
  from deleted;
$$;

revoke all on function public.purge_expired_analytics_events() from public;
revoke all on function public.purge_expired_analytics_events() from anon;
revoke all on function public.purge_expired_analytics_events() from authenticated;
revoke all on function public.purge_expired_analytics_events() from service_role;

commit;
