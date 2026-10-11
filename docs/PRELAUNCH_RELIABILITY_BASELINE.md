# Prelaunch Reliability Baseline

**Status:** executable local smoke and average-load gate implemented; clean exact-commit evidence is recorded below after the harness implementation commit.

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

The clean implementation SHA and measured smoke/average results are added after the executable slice is committed and replayed. The final PR head must also pass exact-head CI, including this gate, before PR #178 can be marked ready.

## Non-claims

- No Production, real user data, real email/recovery provider, Greenhouse endpoint, analytics collector, paid service, migration, provider configuration, or public-signup switch is contacted or changed.
- Virtual users are browser contexts, not human beta users.
- Local p50/p95/p99 do not predict Vercel/Supabase latency or capacity.
- Passing this baseline does not close issue #130 or authorize public launch.
