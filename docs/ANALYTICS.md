# Privacy-safe Analytics Collection

**Status:** Block 6.1 local engineering is implemented in the repository and pending independent review. Block 6 remains in progress.

The repository contains a first-party, privacy-minimized collection path for aggregate product-health events. It is not a production-operation claim: the analytics migration has not been applied to any Supabase project, live collection is not enabled or verified, operational monitoring does not exist, and the Founder Dashboard is deferred to Block 6.2.

## Activation

Browser delivery and server persistence are independently default-off. Browser delivery is eligible only when the public build-time value `NEXT_PUBLIC_ANALYTICS_COLLECTION_ENABLED` is exactly `"true"`; changing it requires a rebuild. Server persistence is eligible only when the server runtime value `ANALYTICS_COLLECTION_ENABLED` is exactly `"true"`. Both exact values are necessary for the future collection path, but both flags alone do not authorize rollout.

When the public flag is absent, the browser performs no analytics POST. When the server flag is absent, a direct valid endpoint request receives the fixed `not_configured` response before its body is read and cannot reach Supabase. No environment file, Vercel setting, or Supabase setting was changed. The analytics migration remains unapplied, and collection remains disabled.

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

The taxonomy has no resume-analysis success event. Block 6.1 does not invent one; whether a low-cardinality success event is needed is a Block 6.2 contract-review item.

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

`supabase/schema_v5_analytics_events.sql` is an ordered, unapplied repository migration. It defines only `event_id`, `event_name`, `event_version`, `occurred_at`, server `received_at`, `environment`, `build_id`, `source_screen`, `owner_mode`, and `properties`.

The table constrains every envelope enum, the current event version, build-ID shape/length, JSON object shape, and property size. Its operational indexes use database-generated `received_at`: descending receipt time, event name plus descending receipt time, and environment plus descending receipt time. Row Level Security is enabled and forced. All table access is revoked from `public`, `anon`, and `authenticated`; only `service_role` receives insert. There is no browser policy, account foreign key, read/list repository, public view, dashboard query function, or retention job.

No migration command was run and no live Supabase project was contacted by Block 6.1.

## Metric limitations

`owner_mode` records client-observed resolved Auth presence. It is not server-authenticated identity proof, cannot be correlated to an account, and a crafted direct request can claim either allowed owner-mode enum. `source_screen` and `properties` are strictly allowlisted, but they still originate from the instrumented client.

This schema cannot calculate unique-user or active-user metrics, retention, cohorts, per-user conversion, or session funnels. It initially supports only bounded event counts and aggregate event rates whose definitions and denominators must be approved separately. Event totals must never be described as people or users.

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

Every approved Block 6.1 event has a trustworthy existing transition and is implemented. No approved event is intentionally unwired. The absent resume-analysis success event is not approved and therefore remains a Block 6.2 contract-review question rather than an implementation gap.

## Failure isolation and test boundary

Analytics calls are fire-and-forget. They are never awaited to authorize navigation, resume analysis, JD Match, target writes, mission changes, restore, or feedback persistence. Analytics cannot change scoring, proof semantics, missions, Active Target behavior, JD freshness, browser ownership, exports, deletion, password recovery, or user-facing product errors.

Offline fixtures cover the HTTP request contract, timeout, non-2xx behavior, strict validation, server canonicalization, fixed repository errors, idempotency, privacy keys, server-only imports, and SQL/RLS/grant constraints. Playwright route interception covers anonymous and account owner modes, exact representative event counts, invalid-action suppression, content exclusion, absence of analytics-caused anonymous Auth lookup, and product continuation after transport failure. These checks do not prove live collection, production schema state, operational monitoring, retention operations, privacy law compliance, or production readiness.

## Rollout blockers

Collection must remain disabled until separately approved work covers exact production schema inventory and rollout; abuse and rate controls; retention and deletion operations; monitoring and alerting; metric definitions and denominator rules; founder authorization and dashboard access; incident response and rollback; privacy and support operational review; and live verification.

The Founder Dashboard, aggregate query contract, and Block 6 closure are not part of Block 6.1. No public analytics page or fake metrics exist. Block 6 remains in progress, and Block 6.1 remains pending final independent review.
