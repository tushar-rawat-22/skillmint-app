# Privacy-safe Analytics Collection

**Status:** Block 6.1 and Block 6.2 are merged and frozen pending rollout. Block 6.2 passed independent review. Block 6 overall remains in progress.

The repository contains a first-party, privacy-minimized collection path and a protected founder-only aggregate Product Event Health dashboard. The fail-closed application code was automatically deployed from `main`. That deployment did not apply V5 or V6, enable collection, configure the founder UUID, add a WAF rule, or schedule retention.

The isolated `skillmint-block6-test` project exists with status `ACTIVE_HEALTHY` and has V1–V6 applied. Live verification found that `service_role` retained raw table `SELECT`; V7 is the forward ACL repair. Production was not copied or altered. Vercel Preview and Production currently share the same two public Supabase variables, so Preview is not an isolated database environment. The next gate is separately authorized isolated V7 application and repeated live-security verification, not Production activation.

## Activation

Browser delivery and server persistence are independently default-off. Browser delivery is eligible only when the public build-time value `NEXT_PUBLIC_ANALYTICS_COLLECTION_ENABLED` is exactly `"true"`; changing it requires a rebuild. Server persistence is eligible only when the server runtime value `ANALYTICS_COLLECTION_ENABLED` is exactly `"true"`. Both exact values are necessary for the future collection path, but both flags alone do not authorize rollout.

When the public flag is absent, the browser performs no analytics POST. When the server flag is absent, a direct valid endpoint request receives the fixed `not_configured` response before its body is read and cannot reach Supabase. No environment file, Vercel setting, or Production Supabase setting was changed. Collection remains disabled.

## Approved event taxonomy

The version 1 taxonomy is closed to these names:

- `career_setup_started`
- `resume_analysis_started`
- `resume_analysis_failed`
- `active_target_selected`
- `active_target_cleared`
- `jd_match_started`
- `jd_match_completed`
- `roadmap_reached`
- `mission_started`
- `mission_marked_done`
- `analysis_restored`
- `feedback_persisted`
- `product_operation_failed`

The frozen taxonomy has no resume-analysis-success event, and Block 6.2 deliberately adds none. Resume success cannot be inferred by subtracting failure events from start events because event attempts, retries, failures, and window boundaries do not establish a one-to-one outcome set. This is a closed Block 6.2 decision, not an unresolved contract question.

## Privacy contract

An accepted event contains only a random event UUID, the approved event name and version, an ISO occurrence time, server-canonical environment and build ID, an approved source-screen enum, `anonymous` or `account` owner mode, and the exact low-cardinality properties approved for that event.

There is no user or account UUID, email, name, phone, IP address, user agent, cookie value, auth token, browser owner key, visitor ID, session ID, resume text or filename, JD text, company or role name, target text, mission title or description, feedback body, URL/query/fragment, score, proof content, or arbitrary metadata. Account use is represented only by `owner_mode: "account"`; it cannot be correlated to an account record. There is no local or session storage analytics queue, offline replay, browser fingerprinting, unload beacon, retry loop, session replay, advertising identifier, cookie added by analytics, or third-party analytics provider.

## Collection and persistence path

```text
Typed product helper
-> non-blocking analytics emitter
-> fixed same-origin POST /api/analytics/events
-> strict request and event validation
-> server environment/build replacement
-> final event revalidation
-> server-only write repository
-> public.analytics_events (repository migration only)
```

The browser sink sends exactly one JSON POST to the fixed relative endpoint, uses a 2.5-second abort timeout, and does not retry. SSR, unresolved authentication, unsupported browser contexts, sink rejection, route rejection, missing server configuration, database failure, and schema absence all fail without changing the product action or exposing provider error text.

The route requires an `application/json` same-origin POST with a valid `Origin`, rejects cross-origin `Sec-Fetch-Site` values when that header is present, applies strict decimal `Content-Length` parsing when present, and incrementally enforces the 1,024-byte event ceiling even when that header is absent or false. It fatally rejects malformed UTF-8, parses one event, rejects unknown keys, and never calls Auth or reads identity. Cookies, authorization headers, request IP, user agent, and raw/query URLs are not used or persisted. Duplicate `event_id` is idempotent success. Unconfigured or unavailable persistence returns a fixed failure and is never reported as accepted.

The route discards browser-provided `environment` and `build_id`. Environment comes from allowlisted Vercel/server runtime values. Build ID comes from a valid Vercel Git commit SHA; fixed `local-test`, `local-development`, or `server-build-unavailable` values are used when that context is unavailable. The canonical event is validated again before insertion.

## Database boundary

`supabase/schema_v5_analytics_events.sql` is the source for the byte-identical timestamped V5 migration. V5 defines only `event_id`, `event_name`, `event_version`, `occurred_at`, server `received_at`, `environment`, `build_id`, `source_screen`, `owner_mode`, and `properties`.

The table constrains every envelope enum, the current event version, build-ID shape/length, JSON object shape, and property size. Its operational indexes use database-generated `received_at`: descending receipt time, event name plus descending receipt time, and environment plus descending receipt time. Row Level Security is enabled and forced. V5 revokes table access from `public`, `anon`, and `authenticated` and grants INSERT to `service_role`, but it does not revoke pre-existing `service_role` privileges. There is no browser policy, account foreign key, read/list repository, public view, dashboard query function, or retention job.

No migration command was run and no live Supabase project was contacted by Block 6.1.

## Founder aggregation and authorization

`supabase/schema_v6_analytics_aggregation.sql` is the source for the byte-identical timestamped V6 migration after V5. The functions use plain `CREATE FUNCTION`, intentionally aborting the transaction if either function already exists unexpectedly instead of preserving an unknown owner or ACL.

The aggregate function accepts only `24h`, `7d`, or `30d`, runs with `SECURITY DEFINER`, an empty `search_path`, and a two-second statement timeout, and returns one exact versioned aggregate row. Its one database `as_of` instant is aligned to millisecond precision. Database-generated `received_at` uses closed-open `[window_start, as_of)` windows of exact elapsed 24, 168, or 720 hours—not calendar-day boundaries. The browser cannot provide an environment, date, dimension, identifier, ordering, or limit; the API supplies only the current server-canonical environment.

The function returns fixed event-name counts, the approved operation/error-code matrix, approved feedback persistence-path counts, total events, last received event time, and events overdue for the exact elapsed 1,080-hour deletion threshold. It cannot return raw events, raw event timestamps, or excluded dimensions. Function execution is revoked from `public`, `anon`, and `authenticated` and granted only to `service_role`. That function grant does not grant raw table access or remove a pre-existing table privilege.

`public.purge_expired_analytics_events()` selects event IDs strictly older than the exact elapsed 1,080-hour threshold in deterministic `received_at, event_id` order, deletes at most 10,000 selected rows per invocation, and returns only the deleted count. If more than 10,000 events are overdue, repeated scheduled runs may be needed. Execution is revoked from `public`, `anon`, `authenticated`, and `service_role`; it is not called or scheduled. Any future `pg_cron` scheduling requires separate explicit authorization, rollout, monitoring, and rollback planning.

`supabase/schema_v7_analytics_acl_hardening.sql` is the byte-identical source for the forward V7 migration. It removes inherited or default table and column privileges from every API role, then restores table-level INSERT only to `service_role`. Raw table access and aggregate RPC execution are separate privileges: V7 does not change either function, and the purge function remains unavailable to every API role. This repair does not enable analytics. Production V5–V7 remain unapplied and require separate authorization; the applied V1–V6 history is immutable.

The unlinked `/founder/analytics` page is isolated from ordinary user navigation and the feedback workflow. It sends its current browser Auth access token only to the same-origin `GET /api/founder/analytics/summary` endpoint. The API requires one exact Bearer header, verifies the token with Supabase Auth `getUser(token)`, and compares the authentic Auth UUID with the one valid server-only `ANALYTICS_FOUNDER_USER_ID` configuration value. Supabase-rejected JWTs return the fixed `401 not_authenticated` response, while genuine Auth transport or provider failures return the fixed `503 temporarily_unavailable` response.

A missing, malformed, or invalid configured UUID disables the dashboard. There is no email allowlist, metadata role, hardcoded UUID, authorization table, or identity field in analytics. The configured UUID is authorization configuration only and remains completely outside analytics data and responses.

The API has two process-local fixed-window backstops: a coarse global allowance of 60 syntactically valid Bearer requests per 60 seconds before Auth, followed after authentic founder authorization by a separate ten aggregate requests per 60 seconds and at most one query in flight. Neither limiter stores a token, UUID, IP address, account identifier, or derived identifier. This is defense in depth, not distributed enforcement: serverless instances do not share counters or query locks. A configured Vercel WAF rule remains a mandatory activation prerequisite. There is no automatic dashboard refresh, automatic retry, or analytics export.

## Approved observed event ratios

The server validates the RPC result as one exact `founder_analytics_summary.v1` DTO before calculating three ratios in TypeScript:

1. `resume_analysis_failed / resume_analysis_started`;
2. `jd_match_completed / jd_match_started`;
3. feedback-persistence `product_operation_failed` events divided by `feedback_persisted +` feedback-persistence failure events.

Each result returns its numerator, denominator, and ratio. A zero denominator produces `null`; ratios are not capped at 100%. These are observed event ratios, not person-level outcomes or conversion rates. Retries, duplicates at the action level, failures spanning a window boundary, and different event attempt counts can affect them. The contract does not calculate a mission completion ratio, does not infer resume success, and exposes no owner mode, source screen, build ID, duration, file type, target source, path source, mission category, or feedback type.

## Metric limitations

`owner_mode` records client-observed resolved Auth presence. It is not server-authenticated identity proof, cannot be correlated to an account, and a crafted direct request can claim either allowed owner-mode enum. `source_screen` and `properties` are strictly allowlisted, but they still originate from the instrumented client.

Events are not people. The schema has no identity analytics and cannot calculate unique people, active-account metrics, person-level retention, cohorts, sessions, or person-level funnels. It supports only fixed aggregate event counts and the three approved observed event ratios. Event totals must never be described as people or accounts.

`occurred_at` is client supplied and is only client occurrence context, not authoritative operational chronology. Database-generated `received_at` must drive any future ingestion-window metric.

## Instrumentation matrix

| Event | Source screen | Exact transition | Approved property source | Owner mode source | Duplicate behavior | Status |
| --- | --- | --- | --- | --- | --- | --- |
| `career_setup_started` | Career setup | Valid form submission begins, before browser/profile persistence | Existing setup determines `create` or `edit` | Resolved Auth presence only | Invalid submits emit none; the form's saving guard prevents concurrent submits | Implemented |
| `resume_analysis_started` | Resume upload | Valid selected-file analysis action begins | File extension/MIME mapped to enum | Resolved Auth presence only | Existing loading guard rejects repeat clicks | Implemented |
| `resume_analysis_failed` | Resume upload | The real analysis/browser-report workflow throws | File-type enum, fixed error mapping, duration bucket | Resolved Auth presence only | One catch boundary per started action | Implemented |
| `active_target_selected` | JD Match | Existing Active Target storage write returns success | Selected source and whether an existing target was replaced | Resolved Auth presence only | Failed/invalid writes emit none; existing workflow guards apply | Implemented |
| `active_target_cleared` | JD Match | Existing Active Target removal returns success | Prior target source enum | Resolved Auth presence only | No event when no target exists or clear fails | Implemented |
| `jd_match_started` | JD Match | Resume exists and the pasted JD passes the existing minimum-length guard | No properties | Resolved Auth presence only | Invalid/aborted input emits none | Implemented |
| `jd_match_completed` | JD Match | Deterministic match and both required browser writes succeed | Duration bucket only | Resolved Auth presence only | Existing action/persistence boundary emits once | Implemented |
| `roadmap_reached` | Roadmap | One available selected path is genuinely rendered for the page lifecycle | Selected track's path-source enum | Resolved Auth presence only | A lifecycle ref allows one reach event | Implemented |
| `mission_started` | Roadmap | Mission status changes to `started` and storage returns success | Existing mission category and source path | Resolved Auth presence only | Same-status changes and failed writes emit none | Implemented |
| `mission_marked_done` | Roadmap | Mission status changes to `done_by_user` and storage returns success | Existing mission category and source path | Resolved Auth presence only | Same-status changes and failed writes emit none | Implemented |
| `analysis_restored` | Dashboard / Resume report | Existing saved-analysis-to-active-report operation returns success | Explicit latest button or selected saved report | Resolved Auth presence only | Failed/no-analysis restores emit none | Implemented |
| `feedback_persisted` | Current approved source screen | Account insert, signed-out browser save, or account fallback browser save succeeds | Feedback type enum and actual persistence path enum | Resolved Auth presence only | Existing request identity prevents duplicate concurrent submissions | Implemented |
| `product_operation_failed` | Relevant approved source screen | Selected real storage/persistence boundaries fail after valid actions | Fixed operation and error enums, optional duration bucket | Resolved Auth presence only | Invalid/aborted actions emit none; failure event itself is best effort | Implemented |

Every approved Block 6.1 event has a trustworthy existing transition and is implemented. No approved event is intentionally unwired. The absent resume-analysis-success event remains deliberately absent and cannot be inferred from the existing event counts.

## Failure isolation and test boundary

Analytics calls are fire-and-forget. They are never awaited to authorize navigation, resume analysis, JD Match, target writes, mission changes, restore, or feedback persistence. Analytics cannot change scoring, proof semantics, missions, Active Target behavior, JD freshness, browser ownership, exports, deletion, password recovery, or user-facing product errors.

Offline fixtures cover the HTTP request contract, timeout, non-2xx behavior, strict validation, server canonicalization, fixed repository errors, idempotency, privacy keys, server-only imports, and SQL/RLS/grant constraints. Playwright route interception covers anonymous and account owner modes, exact representative event counts, invalid-action suppression, content exclusion, absence of analytics-caused anonymous Auth lookup, and product continuation after transport failure. These checks do not prove live collection, production schema state, operational monitoring, retention operations, privacy law compliance, or production readiness.

## Block 6.2 verification boundary

Offline fixtures cover founder configuration, strict Bearer and query parsing, authentic and non-founder identities, the exact shared HTTP response parser, fixed headers/errors, all windows using only the server environment, both process-local limiter tiers, concurrency, exact DTO validation, ratio rules, forbidden output fields, fail-closed V6 creation, millisecond/exact-hour boundaries, bounded purge SQL and privileges, and byte-for-byte preservation of V5. Playwright interception covers the isolated page's loading, signed-out, unauthorized, disabled, rate-limited, unavailable, empty, and ready presentation states, malformed-response failure, absent ordinary navigation/feedback, keyboard-accessible window controls, and responsive aggregate tables. Interception proves presentation behavior only; it does not prove server authorization, live database behavior, or production enforcement.

No migration was run, no environment value changed, no live collection occurred, and no Supabase or Vercel service was contacted during Block 6.2 implementation. The later automatic code deployment remained fail-closed.

## Rollout blockers

Collection must remain disabled until separately approved work covers isolated V7 verification, exact Production schema inventory and ordered rollout, distributed abuse controls including Vercel WAF, retention scheduling, monitoring, founder configuration, incident response, privacy and support operations, and live verification.

The Founder Dashboard remains an unlinked protected internal surface, not a public analytics page. A passing isolated gate will not prove Production behavior. Follow the [Block 6 Rollout Runbook](BLOCK_6_ROLLOUT_RUNBOOK.md); no Production readiness or database rollout is claimed.
