# SkillMint release-status snapshot — 2026-09-12

> Historical snapshot. This file is retained for the September 2026 release record and is not current authority. Present-tense wording below describes the state recorded at that checkpoint. Use [Project Status](PROJECT_STATUS.md), [Production Schema Rollout Authority](PRODUCTION_SCHEMA_ROLLOUT.md), active issue #130, and merged GitHub `main` for current truth.

This was the operational release snapshot at that checkpoint. Older phase, beta, rollout, and closure documents remained historical evidence; they were not Production authority where they conflicted with this snapshot, the then-live provider state, or active GitHub issues.

## Release truth recorded at the checkpoint

- SkillMint is **launched with controlled throughput**. Public discovery is intentional; account provisioning remains deliberately gated through Request Access rather than uncontrolled signup.
- Resolve protected `main`, exact-head CI/security, and Vercel Production again before every release decision. This file does not pin the moving branch SHA.
- Issue #130 is the controlling launch-quality lane. Public discovery and Request Access foundations are shipped; remaining work is bounded adversarial acceptance and launch reliability, not a return to private-beta positioning.
- Issues #103 and #105 are **CLOSED/PASS**. Do not reopen them without a fresh regression.
- At this checkpoint, issue #117 was the next product-depth lane. It could advance only when it did not dilute unresolved #130 auth, persona, ownership, deployment, or reliability gates.
- Public candidate and recruiter discovery surfaces are intended to be canonical, crawlable, and indexable. Authenticated workspaces, auth routes, and private APIs remain non-indexable and fail closed.
- Public signup remains disabled. Request Access distinguishes Candidate and Recruiter intent, requires no resume, and does not create an account or persona automatically.
- Candidate and Recruiter persona authority is immutable and server-owned. Cross-persona workspace and API access must fail closed; RLS and owner scoping must not be weakened to make acceptance pass.

## Production providers recorded at the checkpoint

- Vercel is the current zero-cash web host. Match the active Production deployment to freshly resolved GitHub `main` on every acceptance run.
- Supabase project `skillmint-beta` is the current Production data/auth provider on the Free plan. Availability is monitored rather than assumed; do not generate artificial keepalive traffic.
- Production migration history is verified from V1 through V15 (`20260911001350_schema_v15_oauth_deletion_reauthentication`).
- V15 is applied and catalog-verified in Production. Its intent table is empty and the expected RLS and server-only function boundary are present.
- At this checkpoint, V14 (`20260912001400_schema_v14_candidate_job_lifecycle`) was repository work for #117 and remained **pending**. Founder authority dated October 1 permitted exact-version execution only after the corrected authority merged and its recorded fresh preflight was green.
- The V14 authority model is server-only mutation: authenticated browser sessions may read owner-scoped Candidate rows, while lifecycle writes and provider provenance remain trusted-server responsibilities. Both ACL grants and RLS policies must preserve that boundary.

## Launch acceptance

Each material release must re-establish exact provenance rather than carry old pass state forward:

1. Fetch current protected `main` and any open PR exact head.
2. Require exact-head `quality`, Public OAuth contract, applicable CodeQL/security checks, and Vercel Preview before merge.
3. Verify matching Vercel Production after merge, plus `/api/health/config` and representative public/private route behavior.
4. Recheck Supabase health and migration history before schema work; never infer migration state from an old manifest.
5. Preserve Candidate/Recruiter persona isolation, owner/IDOR boundaries, hostile-upload handling, replay/idempotency controls, CSP/security headers, and sanitized provider failures.

## Historical #117 lifecycle boundary

The first #117 slice is durable Candidate-owned job lifecycle state, not a broad tracker UI. The intended sequence is Save -> reload -> Applied -> optional follow-up -> fresh-session restore.

Provider availability is separate from Candidate-owned workflow state. Preserve provider/source identity and the original apply URL. Do not infer employer outcomes, auto-apply, add hidden ranking, or persist resume content in the lifecycle table. Deletion and export obligations must remain owner-complete.

## Historical notes

Earlier documents that describe SkillMint as a private beta/pilot, describe V3–V13 as pending, or keep #103/#105 open are superseded operationally. Preserve those dated documents as history rather than rewriting their original evidence.
