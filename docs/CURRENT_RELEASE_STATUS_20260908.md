# SkillMint current release status — 2026-09-08

This note is the current release gate snapshot. Older phase documents remain historical evidence and must not be read as current Production authority when they conflict with this file or the active GitHub release-gate issues.

## Verified current state

- `main`: `e9054b407f2456623aace2694a49b2a387efe3ef`.
- Vercel Production is READY on that exact GitHub SHA and remains independent of the founder Mac.
- Supabase project `skillmint-beta` is `ACTIVE_HEALTHY` on the Free plan. Availability is therefore monitored, not guaranteed; do not generate artificial traffic to prevent inactivity pausing.
- Exact-head GitHub quality, Public OAuth contract, and CodeQL workflows are green.
- Public signup remains closed. External cohort expansion remains `NO-GO`.

## Issue #105 release gate

The original Production 503 defect is fixed. PR #107 restored the required Production server configuration and added fail-closed configuration health coverage. The real authenticated candidate Production extraction/analysis path passed after that repair.

The remaining positive recruiter acceptance gate is **EXTERNALLY BLOCKED**, not code-blocked: there is no separate immutable Production recruiter identity yet.

The only manual prerequisite is to create a dedicated Production recruiter account, sign in once, and complete first-login persona setup as `RECRUITER`. Do not weaken auth, persona authority, RLS, same-origin, or ownership checks to bypass that prerequisite.

Until the recruiter acceptance path passes, the external cohort remains `NO-GO`.

## Issue #103 source federation

Greenhouse is the only admitted bounded source experiment. Its current contract preserves source-native posting identity, original apply URL, provenance, content hash, freshness timestamps, dedupe identity, explicit missing fields, failure states, and cross-refresh stale/reappearance semantics. A failed upstream refresh does not mutate prior state.

Issue #103 is not complete. The next value gate is candidate-facing: target role + resume evidence -> one trustworthy job result -> human-readable fit explanation -> original source/apply link. Do not broaden to a second adapter merely to increase source count.

## Availability and release truth

- Vercel Hobby is the current non-paid web host; do not represent commercial hosting as solved.
- Supabase Free can become unavailable through inactivity pausing; maintain truthful health monitoring and recovery evidence rather than fake keepalive traffic.
- Historical rollout documents that say Production migrations are wholly unapplied or that the old 503 is the active defect are superseded by the verified state above.
- No billing-enabled service, paid API, broad public acquisition, or public-beta authorization is implied by this snapshot.
