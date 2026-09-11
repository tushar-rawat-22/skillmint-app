# SkillMint current release status — 2026-09-12

This is the current operational release snapshot. Older phase, beta, rollout, and closure documents remain historical evidence; they are not current Production authority where they conflict with this file, the live provider state, or active GitHub issues.

## Current release truth

- SkillMint is **launched with controlled throughput**. Public discovery is intentional; account provisioning remains deliberately gated through Request Access rather than uncontrolled signup.
- Resolve protected `main`, exact-head CI/security, and Vercel Production again before every release decision. This file does not pin the moving branch SHA.
- Issue #130 is the controlling launch-quality lane. Public discovery and Request Access foundations are shipped; remaining work is bounded adversarial acceptance and launch reliability, not a return to private-beta positioning.
- Issues #103 and #105 are **CLOSED/PASS**. Do not reopen them without a fresh regression.
- Issue #117 is the next product-depth lane. It may advance only when it does not dilute unresolved #130 auth, persona, ownership, deployment, or reliability gates.
- Public candidate and recruiter discovery surfaces are intended to be canonical, crawlable, and indexable. Authenticated workspaces, auth routes, and private APIs remain non-indexable and fail closed.
- Public signup remains disabled. Request Access distinguishes Candidate and Recruiter intent, requires no resume, and does not create an account or persona automatically.
- Candidate and Recruiter persona authority is immutable and server-owned. Cross-persona workspace and API access must fail closed; RLS and owner scoping must not be weakened to make acceptance pass.

## Production providers

- Vercel is the current zero-cash web host. Match the active Production deployment to freshly resolved GitHub `main` on every acceptance run.
- Supabase project `skillmint-beta` is the current Production data/auth provider on the Free plan. Availability is monitored rather than assumed; do not generate artificial keepalive traffic.
- Production migration history is verified from V1 through V13 (`20260911001300_schema_v13_access_requests`).
- V14 (`20260912001400_schema_v14_candidate_job_lifecycle`) is repository work for #117 and remains **pending**. Its presence in a PR does not authorize or imply Production execution.
- The V14 authority model is server-only mutation: authenticated browser sessions may read owner-scoped Candidate rows, while lifecycle writes and provider provenance remain trusted-server responsibilities. Both ACL grants and RLS policies must preserve that boundary.

## Launch acceptance

Each material release must re-establish exact provenance rather than carry old pass state forward:

1. Fetch current protected `main` and any open PR exact head.
2. Require exact-head `quality`, Public OAuth contract, applicable CodeQL/security checks, and Vercel Preview before merge.
3. Verify matching Vercel Production after merge, plus `/api/health/config` and representative public/private route behavior.
4. Recheck Supabase health and migration history before schema work; never infer migration state from an old manifest.
5. Preserve Candidate/Recruiter persona isolation, owner/IDOR boundaries, hostile-upload handling, replay/idempotency controls, CSP/security headers, and sanitized provider failures.

## #117 lifecycle boundary

The first #117 slice is durable Candidate-owned job lifecycle state, not a broad tracker UI. The intended sequence is Save -> reload -> Applied -> optional follow-up -> fresh-session restore.

Provider availability is separate from Candidate-owned workflow state. Preserve provider/source identity and the original apply URL. Do not infer employer outcomes, auto-apply, add hidden ranking, or persist resume content in the lifecycle table. Deletion and export obligations must remain owner-complete.

## Historical notes

Earlier documents that describe SkillMint as a private beta/pilot, describe V3–V13 as pending, or keep #103/#105 open are superseded operationally. Preserve those dated documents as history rather than rewriting their original evidence.
