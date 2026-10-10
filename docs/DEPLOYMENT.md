# SkillMint deployment

This is the current operator path for deploying SkillMint. Historical rollout notes belong in release records, not here.

## Current authority

- GitHub `main` is the source of truth for releasable code.
- Vercel is the active web host. Production must resolve to the exact `main` commit that passed required checks.
- Supabase project `skillmint-beta` is the active Auth and data backend.
- Public self-service account creation is **not launch-ready** while GitHub issue #130 remains open. Do not remove controlled-admission behavior or claim open signup until that gate is closed with Production evidence.
- `/support`, `/privacy`, authentication and recovery surfaces are production-facing and must remain usable even while signup is controlled.
- A READY deployment is necessary but not sufficient. Release acceptance requires exact-head checks plus affected-route Production verification.

## Environment contract

Never commit secrets. Configure environment values in the provider and keep `.env.example` limited to non-secret names and safe examples.

Required browser-side Supabase values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

`SUPABASE_SECRET_KEY` is server-only and is required by trusted server functionality that needs administrative authority, including the protected account-deletion path. It must never use a `NEXT_PUBLIC_` prefix or enter browser bundles, logs, or test artifacts. Other required server-side values depend on the deployed feature set and are validated by the application's readiness checks. Treat a missing critical server value as a failed deployment, not as a warning to work around.

`SUPABASE_DB_URL` is operator-only for controlled migration and isolated database verification. It is not part of the deployed Next.js runtime and must not enter browser bundles, ordinary Preview/runtime configuration, logs, or repository history. Load it only for an explicitly authorized database operation after verifying the intended target; repository presence never authorizes a Production migration.

Analytics remains opt-in. Do not enable analytics or founder-only surfaces merely to make a deployment pass.

## Release path

1. Start from the latest `main` and keep the change bounded.
2. Run the repository's required checks for the affected slice. A P0/P1 fix needs a regression first where practical.
3. Open a pull request and wait for exact-head required checks. Do not merge a stale or failing head.
4. Verify the Vercel Preview when the change affects runtime or UI behavior.
5. Merge only after the PR head is green and the change is understood.
6. Confirm Vercel Production deployed the resulting `main` SHA, not merely a nearby commit.
7. Re-test the affected Production routes and inspect runtime errors. For auth/security changes, also verify the relevant Supabase/provider state.
8. Record only material release evidence. Do not turn routine deployment into ceremony.

## Production acceptance

For every production release, verify at minimum:

- deployed Git SHA matches the intended `main` SHA;
- Vercel deployment state is READY;
- required GitHub checks passed for that exact head;
- changed public routes return the expected safe behavior;
- no new unexplained 5xx/runtime error appears in the acceptance window;
- auth, RLS, persona and privacy boundaries were not weakened by unrelated changes.

For public self-service work, issue #130 adds stricter gates: server-side CAPTCHA enforcement, production-suitable recovery email, recovery expiry/replay/non-enumeration behavior, candidate/recruiter persona authorization, abuse controls, privacy/deletion/support paths, and responsive/accessibility acceptance. Do not infer these from frontend presence or a successful build.

## Pre-release workload certification (Issue #130)

These are **proposed acceptance targets**, not measured service levels. They apply to a first controlled cohort of 5–10 consented Candidate/Recruiter users; revise them after observing real consented usage. A READY deployment or passing unit tests do not certify load readiness.

### Critical journeys and workload assumptions

| Journey | Test behavior | Boundary |
| --- | --- | --- |
| Public discovery | Read `/`, `/candidates`, `/recruiters`, `/privacy`, `/support`; check status, security headers, and content | No account or analytics identifiers |
| Candidate | Sign in to a disposable isolated account; set Active Target; analyze a synthetic resume; save/reload; match one synthetic JD; recover from unavailable Jobs provider | No real resume, external job-provider traffic, or Production account |
| Collaboration | Publish/revoke a synthetic Proof Brief; authorized Recruiter reads and submits feedback; revoked/expired/wrong-owner tokens fail closed | Do not load-test token enumeration or generate public share links |
| Recruiter | Sign in to an isolated Recruiter account; review an authorized brief and role evidence map; submit/retry structured feedback | Candidate raw resume and unrelated account data must remain inaccessible |
| Negative paths | Unauthenticated API access, wrong-persona access, malformed inputs, duplicate/retry behavior, stale sessions | Small, bounded functional probes only; not repeated attack traffic |

Assume **1–3 concurrent users normally** and **5–10 during a small-cohort peak** until usage evidence replaces those assumptions. A load virtual user is not a real beta participant. Do not claim 10 virtual users proves 10 real users' experience.

### Provisional service objectives

- **Correctness and isolation:** zero cross-user/cross-persona disclosure, zero unauthorized writes, zero lost acknowledged state changes, and no duplicate effects from retries. Any violation fails immediately.
- **First-party public HTML:** p95 server response time at most **2 seconds** at the proposed average load, excluding browser rendering. Separately record 1440/390/320 real-browser interaction and accessibility results.
- **First-party authenticated API:** p95 at most **2 seconds** at average load for routes not waiting on third-party services. Record p99 and identify slow endpoints rather than averaging them away.
- **Reliability:** no unexplained 5xx in smoke; at average load, fewer than **1%** failed requests over a meaningful sample (target at least 200 requests per journey), with zero auth/privacy correctness failures. HTTP 401/403/429 expected by a negative-path test are not service errors.
- **External providers and recovery:** record separate provider latency and failure rates; show a bounded, truthful fallback rather than a fabricated result. Email verification, password recovery, deletion and provider quotas are **single-journey acceptance**, never automated load traffic.

These are release candidates, not promises to customers. Adjust only from recorded baseline and resource quotas, not to make a failing run appear green.

### Execution order — isolated environment only

1. **Preflight:** pin exact tested commit, verify clean fixtures and synthetic accounts, separate database and secrets, isolated host, provider mocks, no analytics/replay, and no paid infrastructure. Establish resource/rate limits and a rollback/reset procedure. If an isolated target or free-tier capacity cannot be confirmed, **do not start**.
2. **Smoke:** 1 virtual user, 2 minutes; verify responses, privacy boundaries, error handling and metrics. Stop on any correctness failure.
3. **Average:** 3 virtual users, 10 minutes; capture p50/p95/p99, throughput, error classes, DB connection use and process memory.
4. **Stress:** increase to 5 then 10 virtual users for at most 5 minutes per step. Evaluate saturation and recovery, not just request success.
5. **Spike:** 3 → 15 → 3 virtual users within a bounded 5-minute window; verify rate limits, queueing and return to baseline.
6. **Soak:** 3 virtual users for 30 minutes; look for memory/connection growth, stale sessions and retry accumulation.
7. **Breakpoint:** isolated target only; increase in steps of 5 to a hard cap of 20 virtual users, stopping at the first objective or resource failure. Record the last safe level; **do not** seek a crash or run this against Production.

Abort immediately for tenant/privacy leakage, unauthorized state mutation, an unexplained 5xx burst, more than 1% failures over a rolling 60-second window, p95 exceeding twice its objective, resource use above 80% of a confirmed quota, unexpected paid usage, provider throttling, or loss of observability. Reset synthetic data between stages; do not repeatedly invoke account deletion, send real email, or stress third-party APIs.

### Evidence and release decision

Capture the exact SHA, environment and resource caps, synthetic data version, command/configuration, stage duration, per-journey request count, p50/p95/p99, 4xx/5xx classification, CPU/memory/DB connections, quota consumption, observed failure point, recovery behavior and a short operator verdict. Redact tokens, resume text, email addresses and personal data. Keep results with the existing #130 acceptance record, not a parallel launch authority.

Only a fully passing isolated run permits a **separately authorized, low-volume Production smoke** against the exact READY release. Production smoke must not include stress, spike, soak or breakpoint stages. Load evidence is one prerequisite among security, data recovery, accessibility, real-user validation and commercial gates; it never opens public signup by itself.

## Rollback

If a Production release introduces a P0/P1 regression:

1. contain exposure first;
2. identify the last known-good exact SHA;
3. revert or redeploy the smallest safe change through the normal protected path;
4. verify the affected Production slice again;
5. preserve evidence needed to understand the failure.

Do not bypass Auth/RLS controls, disable security checks, or mutate Production data merely to restore a green UI.

## Provider constraints

- Keep spend at zero unless the founder explicitly approves otherwise.
- Do not buy a domain or activate paid provider billing as part of routine deployment.
- A provider integration is not considered production-ready until its server-side configuration and real behavior are verified.
- Email/recovery delivery must not be described as reliable until a production-suitable sending path has been proven.

## Current launch blocker

The controlling public self-service gate is GitHub issue #130. Until it is closed with evidence, SkillMint may remain publicly viewable but signup must stay controlled and visitor-facing copy must explain the safe next step truthfully.
