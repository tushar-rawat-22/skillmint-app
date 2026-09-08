# SkillMint current release status — 2026-09-08

This note is the current release gate snapshot. Older phase documents remain historical evidence and must not be read as current Production authority when they conflict with this file or the active GitHub release-gate issues.

## Verified current state

- `main`: `2fa278bd82640a9ca547cc96a6dc7987df69b204` (PR #113).
- Vercel Production is READY on that exact GitHub SHA and remains independent of the founder Mac. The canonical public alias remains `skillmint-app-three.vercel.app`.
- Supabase project `skillmint-beta` is currently `ACTIVE_HEALTHY` on the Free plan. Availability is monitored, not guaranteed; do not generate artificial traffic to prevent inactivity pausing.
- PR #113 exact-head `quality`, Public OAuth contract, CodeQL, and Vercel Preview gates passed before merge. Post-merge OAuth and CodeQL are green on the exact merge SHA; the post-merge `quality` replay must also be green before calling the merge SHA fully release-accepted.
- Live `/`, `/recruiters`, `/jobs`, and `/api/health/config` routes respond from the new Production deployment. `/api/health/config` reports `{"status":"healthy"}`. The unauthenticated `/jobs` shell remains session-gated and does not itself prove the authenticated candidate journey.
- Public signup remains closed. External cohort expansion remains `NO-GO`.

## Issue #105 release gate

The original Production 503 defect is fixed. PR #107 restored the required Production server configuration and added fail-closed configuration health coverage. The real authenticated candidate Production extraction/analysis path passed after that repair.

The remaining positive recruiter acceptance gate is **EXTERNALLY BLOCKED**, not code-blocked: there is no separate immutable Production recruiter identity yet.

The only manual prerequisite is to create a dedicated Production recruiter account, sign in once, and complete first-login persona setup as `RECRUITER`. Do not weaken auth, persona authority, RLS, same-origin, or ownership checks to bypass that prerequisite.

Until the recruiter acceptance path passes, the external cohort remains `NO-GO`.

## Issue #103 candidate jobs

Greenhouse remains the only admitted job source. PR #110 added deterministic explainable-fit semantics, PR #112 added the candidate job-result projection, and PR #113 wired the bounded Greenhouse path into the real authenticated candidate workspace.

The shipped Jobs path preserves the candidate target role as the authority, keeps resume evidence in the browser, authenticates the server request, uses live Greenhouse data with `no-store`, shows supported versus not-evidenced requirements, preserves source provenance and the original application URL, and does not add auto-apply, hidden candidate ranking, or hiring probability. The target-role authority regression discovered during PR #113 was fixed so newer user intent wins over stale asynchronous account hydration. Playwright failure artifacts are retained in CI for cloud diagnosis.

Issue #103 is **not complete**. The remaining user-value gate is a real authenticated Production candidate session on the same `/jobs` route against live Greenhouse data, proving:

- target role + owned resume -> truthful current job result;
- human-readable supported vs not-evidenced explanation;
- original apply link;
- truthful stale/unavailable behavior;
- no auto-apply or hidden hiring probability/ranking;
- resume text absent from the server request.

Do not broaden to Lever, USAJOBS, O*NET, or another provider until that same-route/session/dependency gate passes.

## Availability and release truth

- Vercel Hobby is the current non-paid web host; do not represent commercial hosting as solved.
- Supabase Free can become unavailable through inactivity pausing; maintain truthful health monitoring and recovery evidence rather than fake keepalive traffic.
- Historical rollout documents that say Production migrations are wholly unapplied or that the old 503 is the active defect are superseded by the verified state above.
- No billing-enabled service, paid API, broad public acquisition, or public-beta authorization is implied by this snapshot.
