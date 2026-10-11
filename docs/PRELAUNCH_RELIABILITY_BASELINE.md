# Prelaunch Reliability Baseline

**Status:** executable local smoke and average-load gate passed on the clean implementation commit `71ad7a35010ec706141cfb76c09cbe6c7971c9b9` on October 12, 2026 (IST). Exact-head GitHub CI remains a separate merge gate.

This is the bounded zero-cost reliability slice for GitHub issue #130 and PR #178. It is isolated browser evidence against a local production build and repository provider mocks. It is not Production load evidence, a hosted-capacity result, a customer SLO, or human beta evidence.

## Why the original draft was narrowed

The draft assumed one to three normal concurrent users, five to ten peak users, 200 requests per journey, a two-second p95 objective, and automatic stress/spike/soak/breakpoint stages. None of those values came from measured SkillMint usage or known isolated resource quotas.

The implemented baseline therefore answers a smaller release question: can real public, Candidate and Recruiter browser journeys run sequentially and at three-way mixed concurrency without breaking authorization, privacy, acknowledged state, retry idempotency, expected error classification, or recovery? Latencies are measured before any hosted threshold is adopted.

## Executable boundary

- `playwright.reliability.config.ts` starts the existing synthetic Auth/PostgREST server and an optimized local Next.js build on loopback only.
- `e2e/prelaunch-reliability.spec.ts` blocks unexpected browser egress, uses synthetic identities and resume/JD data, and exercises public discovery, Candidate resume analysis and account isolation, Recruiter authorized review, cross-persona denial, duplicate retry behavior, Proof Brief revocation and recovery.
- `npm run test:reliability:baseline` runs the synthetic build, one-VU smoke, then the three-VU average stage.
- CI runs smoke before average and restores the ordinary release build afterward so later bundle checks do not inspect the synthetic build.
- Certifying runs require a clean worktree. Development runs may explicitly opt into dirty-tree output, which is always labeled non-certifying.

## Stop conditions

The stage fails on any cross-user/persona leak, unauthorized mutation, state loss, duplicate retry effect, unexpected local 4xx/5xx or transport/console/journey error, external browser request, failed revocation, or failed return to a one-user baseline. Expected negative probes are exact: wrong owner `409`, wrong persona `403`, revoked share `404`, and duplicate review `409`.

Target CPU, target memory and database-connection utilization are unavailable on the local mocked target. The harness records harness RSS and host memory as diagnostic context only. This missing target quota observability is why heavier stages are not authorized by this baseline.

## Clean measurement record

The clean run used Node `v24.17.0`, Chromium, macOS/Darwin `25.6.0`, eight logical CPUs and 8 GiB host memory. The target was the optimized loopback build at `127.0.0.1`; analytics, signup and public demo were disabled, browser egress was blocked, and the synthetic provider had no database or external provider connection.

| Stage | Workload | Samples / requests | Aggregate p50 / p95 / p99 | HTTP classification | Recovery | Verdict |
| --- | --- | --- | --- | --- | --- | --- |
| Smoke | 1 sequential VU; one public, Candidate, Recruiter, negative/retry and recovery pass | 52 / 28 | 14.82 / 619.21 / 689.99 ms | 22×200, 1×201, expected 2×403, 1×404, 2×409; 0×5xx | 200 in 3.81 ms | PASS |
| Average | 3 concurrent mixed VUs; 5 iterations each, then one-user recovery | 164 / 92 | 18.71 / 615.65 / 718.69 ms | 86×200, 1×201, expected 2×403, 1×404, 2×409; 0×5xx | 200 in 3.66 ms | PASS |

The aggregate distributions combine observed application document/API response samples and completed journey-step timings; they are not server-only response time. The average stage lasted 20.33 seconds and observed about 4.52 application requests per second. Its per-journey distributions were:

| Journey | Samples | p50 | p95 | p99 |
| --- | ---: | ---: | ---: | ---: |
| Public | 60 | 22.58 ms | 615.65 ms | 718.69 ms |
| Candidate | 50 | 20.93 ms | 638.14 ms | 742.47 ms |
| Recruiter | 49 | 15.65 ms | 607.89 ms | 698.83 ms |
| Revocation/recovery | 5 | 8.57 ms | 51.05 ms | 51.05 ms |

All 14 correctness gates passed, including owner/persona denial, absence of unrelated candidate data from recruiter/public output, one stored review after an identical retry, revoked-token rejection and fixture recovery. The average run recorded zero unexpected request, transport, console, journey or server errors.

Peak harness RSS was 296,796,160 bytes in smoke and 313,704,448 bytes in average. These are test-runner diagnostics, not target memory. Target CPU, target memory, database connections and service quota consumption were unavailable by construction and are recorded as unavailable rather than zero. The final PR head must pass exact-head CI, including this gate, before PR #178 can be marked ready.

## Non-claims

- No Production, real user data, real email/recovery provider, Greenhouse endpoint, analytics collector, paid service, migration, provider configuration, or public-signup switch is contacted or changed.
- Virtual users are browser contexts, not human beta users.
- Local p50/p95/p99 do not predict Vercel/Supabase latency or capacity.
- Passing this baseline does not close issue #130 or authorize public launch.
