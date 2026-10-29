# SkillMint deployment

This is the current operator path for deploying SkillMint. Historical rollout notes belong in release records, not here.

## Current authority

- GitHub `main` is the source of truth for releasable code.
- Vercel is the active web host. Production must resolve to the exact `main` commit that passed required checks.
- Supabase project `skillmint-beta` is the active Auth and data backend.
- Public self-service account creation is **not launch-ready** while GitHub issue #130 remains open. Do not remove controlled-admission behavior or claim open signup until that gate is closed with Production evidence.
- `/support`, `/privacy`, authentication and recovery surfaces are production-facing and must remain usable even while signup is controlled.
- The October 15 V16 database preflight and isolated restore are technically ready for a separate founder decision. V16 remains unapplied and unauthorized; use the exact evidence, expiry, runbook, abort criteria, and unsigned authorization record in [Production Schema Rollout Authority](PRODUCTION_SCHEMA_ROLLOUT.md).
- A READY deployment is necessary but not sufficient. Release acceptance requires exact-head checks plus affected-route Production verification.

## Environment contract

Never commit secrets. Configure environment values in the provider and keep `.env.example` limited to non-secret names and safe examples.

Required browser-side Supabase values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

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

This gate is an executable regression baseline, not a customer service level or a prediction about human usage. It runs only against a loopback production build with the repository synthetic Auth/PostgREST provider, analytics and signup disabled, and unexpected browser egress blocked. A READY deployment, passing unit tests, or virtual-user count do not certify hosted load readiness.

### Critical journeys and workload assumptions

| Journey | Test behavior | Boundary |
| --- | --- | --- |
| Public discovery | Read `/`, `/candidates`, `/recruiters`, `/privacy`, `/support`, and one synthetic candidate-authorized brief; check status, content and identifier absence | No account or analytics identifiers |
| Candidate | Sign in to a disposable isolated Candidate account; analyze a synthetic resume through the real upload UI and parser route; read dashboard/resume/JD surfaces | No real resume, external job-provider traffic, or Production account |
| Collaboration | Read/revoke/recover a seeded synthetic Proof Brief; one authorized Recruiter submits feedback and retries the same review | Do not load-test token enumeration or generate a real public share link |
| Recruiter | Sign in to an isolated Recruiter account; read its role evidence workspace and the authorized brief/review flow | Candidate raw resume and unrelated account data must remain inaccessible |
| Negative paths | Wrong-owner and wrong-persona API access, duplicate/retry behavior, revoked-token access | Small, bounded functional probes only; not repeated attack traffic |

The initial implemented workload is one sequential smoke virtual user followed by three concurrent mixed virtual users: one public reader, one Candidate journey, and one Recruiter journey. The average stage runs five journey iterations per virtual user by default. These are deliberately small regression workloads selected to exercise concurrency and Product boundaries at zero cash; they are **not observed concurrency**, capacity estimates, cohort sizes, or evidence that three virtual users represent three people.

### Provisional service objectives

- **Correctness and isolation:** zero cross-user/cross-persona disclosure, zero unauthorized writes, zero lost acknowledged state changes, and no duplicate effects from retries. Any violation fails immediately.
- **Latency observation:** record p50/p95/p99 for the aggregate and each journey. The earlier two-second p95 proposal was not derived from hosted resource limits or user evidence, so the local baseline records it rather than treating it as a launch SLO. Any later hosted objective must separate server response, browser completion, and provider latency.
- **Reliability:** smoke and the deterministic local average stage require zero unexpected request, transport, browser-console, journey, and 5xx errors. Expected 403/404/409 results from named negative probes are classified separately and must match exactly. The earlier target of 200 requests per journey is not a statistical reliability claim and would add synthetic repetition without known quota value; preserve request counts and expand only for a stated question.
- **External providers and recovery:** record separate provider latency and failure rates; show a bounded, truthful fallback rather than a fabricated result. Email verification, password recovery, deletion and provider quotas are **single-journey acceptance**, never automated load traffic.

These are regression rules, not promises to customers. Adjust workload or objectives only from recorded evidence and known resource quotas, not to make a failing run appear green.

### Execution order — isolated environment only

1. **Preflight:** pin the exact Git commit and require a clean worktree for certifying runs. Build with explicit synthetic loopback values; keep analytics, public signup, public demo, Production services and third-party providers off. The harness refuses non-loopback targets.
2. **Smoke:** run `npm run test:reliability:smoke` after `npm run build:reliability`. One virtual user executes public, Candidate, Recruiter, negative/retry, revocation and recovery journeys sequentially. Stop on any correctness failure.
3. **Average:** only after smoke passes, run `npm run test:reliability:average`. Three mixed virtual users execute concurrently for five iterations each by default, then return to a one-user recovery probe. Capture p50/p95/p99, status classes, 5xx, correctness and available host/harness memory.
4. **Stress/spike/soak/breakpoint:** deferred. Do not infer safe limits from the local synthetic target. A later stage requires an isolated hosted target, explicit free quota/resource caps, target CPU/memory/connection observability, provider mocks, and a stated decision question. Do not seek a crash.

`npm run test:reliability:baseline` builds the isolated target and runs smoke before average. Set `SKILLMINT_RELIABILITY_AVERAGE_ITERATIONS` only to an integer from 1 through 20 for a bounded diagnostic variation. Certifying runs refuse a dirty worktree; `SKILLMINT_RELIABILITY_ALLOW_DIRTY=true` exists only for non-certifying harness development.

Abort immediately for tenant/privacy leakage, unauthorized state mutation, acknowledged-state loss, duplicate retry effects, any unexplained local error or 5xx, unexpected egress, provider throttling, paid-usage risk, or missing request/correctness observability. For a later hosted stage, also stop above 80% of a confirmed quota or the stage's predeclared latency/error abort line. Reset synthetic data between stages; do not repeatedly invoke account deletion, send real email, or stress third-party APIs.

### Evidence and release decision

The harness writes sanitized JSON to `test-results/prelaunch-reliability/<sha>-<stage>.json` and attaches it to Playwright output. It captures exact SHA/tree/cleanliness, environment, workload, journey/request counts, p50/p95/p99, 4xx/5xx classification, correctness gates, recovery, harness RSS, and explicit unavailable resource fields. Tokens and email-shaped values are redacted. `test-results` remains ignored; durable results belong in the [Prelaunch Reliability Baseline](PRELAUNCH_RELIABILITY_BASELINE.md) and the existing #130 acceptance record, not a parallel launch authority.

Only a fully passing isolated run permits a **separately authorized, low-volume Production smoke** against the exact READY release. Production smoke must not include stress, spike, soak or breakpoint stages. Load evidence is one prerequisite among security, data recovery, accessibility, real-user validation and commercial gates; it never opens public signup by itself.

## Rollback

If a Production release introduces a P0/P1 regression:

1. contain exposure first;
2. identify the last known-good exact SHA;
3. revert or redeploy the smallest safe change through the normal protected path;
4. verify the affected Production slice again;
5. preserve evidence needed to understand the failure.

Do not bypass Auth/RLS controls, disable security checks, or mutate Production data merely to restore a green UI.

For V16, the tested logical database path has an approximately 0.41-second local restore step, but that is not a full-service RTO. The dump excludes Storage object bytes and separately managed credentials, hosted Auth/OAuth/SMTP/provider settings, Edge Functions/secrets, Vercel, DNS, and firewall state. Use a reviewed forward repair after a committed defect unless incident command explicitly chooses restoration; never repair migration history or treat an older application deployment as schema rollback.

## Provider constraints

- Keep spend at zero unless the founder explicitly approves otherwise.
- Do not buy a domain or activate paid provider billing as part of routine deployment.
- A provider integration is not considered production-ready until its server-side configuration and real behavior are verified.
- Email/recovery delivery must not be described as reliable until a production-suitable sending path has been proven.

## Current launch blocker

The controlling public self-service gate is GitHub issue #130. Until it is closed with evidence, SkillMint may remain publicly viewable but signup must stay controlled and visitor-facing copy must explain the safe next step truthfully.
