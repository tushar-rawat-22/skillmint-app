# SkillMint

SkillMint shows students and fresh graduates what their résumé currently
supports, which evidence matters most, what is missing for the role they want,
and what to build next. It turns the résumé into an evidence map and a focused
action loop instead of treating a document score as the outcome.

SkillMint is the internal project codename. The public brand has not been finalized.

## Why I built it

I built SkillMint because most resume tools stop at a score. A score alone does not help someone decide which roles fit their current profile, which claims have supporting evidence, which role deserves focus, or what work to complete next.

I also wanted to keep general profile fit separate from one real job description. SkillMint uses those two contexts differently, then turns the gaps into a focused roadmap instead of presenting a number as a hiring outcome.

## What the application does today

- **Offers a no-login synthetic demo:** when its server-only gate is enabled,
  `/demo` presents a fixed, unmistakably synthetic evidence analysis and a
  before/after comparison without Supabase, analytics, uploads, browser writes,
  or external requests.
- **Extracts and analyzes resumes:** PDF, DOCX, and TXT uploads are converted to text, parsed into a structured profile, and evaluated by deterministic TypeScript modules.
- **Calculates Career IQ:** a bounded, explainable readiness signal based on resume-internal profile fit, claimed-versus-backed skills, applied evidence, and scoring caps. It is not hiring probability.
- **Calculates Proof Confidence:** a measure of support visible inside the resume, including evidence candidates such as project, experience, certification, and proof-link signals. These are not independently verified claims, and missing proof means unverified rather than false.
- **Suggests Profile-fit Roles:** general role-fit results come from the active resume. They remain separate from Latest JD Match.
- **Maintains one Active Target:** a browser-local focus layer that can prioritize the ATS workflow, roadmap, missions, and candidate Jobs surface without changing any score.
- **Shows bounded authenticated Greenhouse jobs:** the candidate `/jobs` surface sends the authenticated target role to a server-side Greenhouse adapter while keeping resume evidence in the browser. Results preserve source provenance and the original application URL, explain requirements as supported versus not evidenced, and do not auto-apply, rank candidates, or claim hiring probability. Greenhouse is the only admitted provider until real Production user-value acceptance closes issue #103.
- **Compares one job description:** Latest JD Match evaluates one pasted job description against the active resume context. It does not replace Profile-fit Roles, and an old match becomes stale when its resume context changes.
- **Generates a roadmap and missions:** deterministic career paths and 30/60/90 work plans turn current gaps into actions. A user can track mission progress, but marking work complete does not create proof or inflate a score; evidence can change only after re-analysis detects it in the resume.
- **Separates active and saved reports:** the active browser report drives the current dashboard. Authenticated saved-analysis history is account-level persistence and does not silently become the active report.
- **Preserves browser ownership boundaries:** owner-aware storage partitions signed-out data and each signed-in account so one account cannot consume another account's browser workspace.
- **Provides distinct data controls:** browser export and Clear workspace cover registered browser data; account export and saved-report deletion operate on authenticated account data; protected account deletion is a separate backend operation.
- **Explains those boundaries in the Trust Center:** `/settings/data` presents browser and account controls, while `/privacy` provides the current technical privacy notice.
- **Collects structured beta feedback:** feedback uses authenticated account persistence when available and an owner-scoped browser fallback otherwise.
- **Contains a privacy-safe analytics collection runtime:** approved low-cardinality product events can use a non-blocking same-origin repository path without user/session identifiers or private resume, JD, mission, feedback, score, or proof content. Isolated migration and security verification are complete, but Production rollout and analytics activation have not occurred.

## Product flow

```text
Target role
-> Resume evidence map
-> Gap
-> Trustworthy job result
-> Supported / not-evidenced explanation
-> Original apply link
-> Next action
-> New evidence
-> Re-analysis
```

Resume Reality records what the current résumé supports. Profile-fit Roles and
one Latest JD Match remain separate contexts, while Active Target selects focus
without changing truth or scores. The authenticated Jobs surface uses that target
role to retrieve bounded Greenhouse results while resume evidence remains local
to the candidate comparison. Career IQ, Proof Confidence, ATS, and JD
calculations remain explainable supporting detail. Missions guide work, but only
later re-analysis can detect changed evidence.

## Technical architecture

The application uses the Next.js 16 App Router, React 19, TypeScript, and Tailwind CSS 4. Supabase integration uses `@supabase/supabase-js` and `@supabase/ssr` for Auth and PostgreSQL-backed account persistence. Resume extraction uses `pdf-parse` and `mammoth`; scoring, proof, role matching, targeting, missions, and roadmap generation are deterministic TypeScript modules.

```text
Browser UI (Next.js App Router + React)
  -> pages and presentation components
  -> feature modules, repositories, and selected pure contracts
  -> deterministic intelligence, resume parsing, and PDF utilities
  -> owner-aware browser storage
     or authenticated Supabase repositories where configured

Authenticated candidate Jobs request
  -> target role + bearer session only
  -> server-confirmed Supabase identity
  -> bounded Greenhouse public Job Board API fetch with no stale fallback
  -> source/provenance + original apply URL returned
  -> resume evidence comparison remains in the browser

Protected administrative operation
  -> Next.js server route
  -> server-confirmed Supabase identity and recent-auth checks
  -> account-owned deletion orchestration

Privacy-safe analytics observation
  -> typed, non-blocking browser helpers
  -> strict same-origin server ingestion and canonicalization
  -> server-only insert contract (not rolled out to Production)
```

App Router pages compose feature modules and, in some places, pure intelligence or storage contracts directly. Business rules live in `src/intelligence`, `src/modules`, and `src/lib`, rather than inside presentation components.

Browser persistence is versioned and owner-aware. Account operations re-confirm
the Supabase identity. The database schemas define Row Level Security policies
for account-owned tables, while Trust Center requests use owner, context-epoch,
and request-token checks to reject stale results after an account change.

The repository includes deterministic Node fixture scripts and Playwright tests for Chromium, Firefox, and WebKit projects. GitHub Actions defines the required `quality` job for pull requests and pushes to `main`. Deployment guidance targets Vercel while keeping Preview and Production configuration, origins, backend credentials, schema state, and rollout approval as separate concerns. Browser failure evidence from the controlled candidate journey is retained in GitHub Actions so cloud-reproducible failures do not depend on a founder laptop for diagnosis.

## Important engineering decisions

1. **Scores are deterministic.** The same normalized input follows versioned rules, weights, and caps. This makes a result inspectable and fixture-testable instead of allowing generated text to invent a score.
2. **Active Target changes focus, not truth.** Selecting a role can reorder recommended work and the candidate Jobs query, but it cannot make the resume stronger or alter Career IQ, Proof Confidence, role fit, or JD Match math. Newer explicit user intent wins over stale asynchronous account hydration.
3. **Mission completion is self-progress.** A click records what the user says they completed. It becomes an evidence signal only if later resume analysis finds matching support.
4. **Browser workspace and account history have different authority.** The browser's active report controls the current experience; saved account rows remain history until the user explicitly restores a report.
5. **Deletion derives identity from a validated session.** The protected account-deletion route rejects client-supplied identity fields, validates the bearer session, and performs deletion for the server-confirmed user.
6. **Missing backend configuration fails safely.** Eligible browser-local behavior can remain available, while authentication, account persistence, administrative deletion, and candidate Jobs dependencies report an unavailable or unconfigured state instead of fabricating success.
7. **Async results are owner-bound.** Owner keys, epochs, request tokens, provider-identity checks, and target-role authority guards prevent stale account or hydration results from publishing into a newer signed-in/user-intent context.

## Repository structure

```text
src/app/                App Router pages and protected API routes
src/components/         presentation components and UI primitives
src/modules/            feature orchestration, hooks, repositories, and contracts
src/intelligence/       deterministic scoring, proof, roles, targets, missions, and paths
src/lib/parser/         resume-to-profile parsing
src/lib/pdf/            resume text extraction client utility
src/lib/storage/        owner-aware browser persistence and registry
src/lib/accountDeletion protected deletion contracts and orchestration
src/lib/supabase/       browser, server, and admin clients plus database types
scripts/                deterministic fixtures and release diagnostics
e2e/                    Playwright browser, ownership, and accessibility coverage
supabase/               ordered PostgreSQL schema and RLS definitions
docs/                   current contracts, frozen evidence, and historical plans
.github/workflows/      required repository quality workflow
```

The intended direction for new business logic is:

```text
UI -> Modules -> Intelligence -> Parser/PDF utilities
```

## Local development

Use the committed lockfile for reproducible dependency installation:

```bash
npm ci
npm run dev
```

Eligible browser-local flows can run without Supabase configuration. Copying `.env.example` to `.env.local` is required only when configuring Supabase authentication and account persistence. The public synthetic demo remains disabled unless `SKILLMINT_PUBLIC_DEMO_ENABLED` is the exact case-insensitive value `true`; public signup remains independently closed by default. Do not display or commit real environment values.

Administrative account deletion also requires the documented server-only configuration and the expected database contract. A local UI running without those prerequisites must fail safely; it does not provide operational account deletion.

## Quality checks

```bash
npm run lint
npm run build
```

The required GitHub Actions `quality` job installs from the lockfile, verifies the dependency tree, runs lint and build, and executes the deterministic offline fixture suite plus controlled browser gates. The fixtures cover scoring truth, missions, Active Target behavior, browser ownership, exports, data controls, feedback reliability, candidate target-role authority, Jobs request privacy, confirmation-dialog accessibility, and Trust Center reliability.

Playwright is an additional browser-testing layer with Chromium, Firefox, and WebKit projects. A WebKit pass is not Safari certification, structural accessibility checks are not screen-reader certification, and these checks do not establish production readiness. Controlled candidate-loop coverage is still synthetic until the same authenticated Production route is accepted against live Greenhouse data.

## Current status

For current operational truth, read [Current Release Status — 2026-09-08](docs/CURRENT_RELEASE_STATUS_20260908.md) before older phase documents.

- Protected `main` contains PR #113's authenticated candidate Greenhouse Jobs integration. Greenhouse remains the only admitted job provider; issue #103 stays open until the real authenticated Production Jobs route passes the live user-value gate.
- The private-pilot homepage and synthetic public demo use an evidence-first hierarchy. Real résumé analysis requires a server-confirmed account; public signup, analytics, and external verification claims remain off.
- Resume Progress and Comparison reuses the deterministic analysis contracts to show evidence change across user-selected reports. It does not claim that a score change predicts a hiring outcome.
- GitHub CI and `main` branch protection are active; the required repository check is the `quality` job.
- Vercel is the current Mac-independent public web host. Supabase `skillmint-beta` is a Free-plan data dependency and can pause after inactivity, so current health is monitored rather than represented as a 24/7 availability guarantee. Artificial keepalive traffic is not used.
- The original #105 Production 503 is fixed and candidate Production extraction/analysis passes. Positive recruiter acceptance remains externally blocked until a separate immutable Production recruiter identity exists and completes first-login setup as `RECRUITER`; external cohort remains `NO-GO`.
- Block 6 implementation and isolated verification are complete. Analytics collection remains disabled.
- Block 7.1 resume owner isolation is complete and records a confirmed, repaired account-switch defect. The former broad Beta v1 public-launch path is superseded by current controlled-release authority.
- Public beta and unrestricted acquisition are not authorized.
- Payments remain deferred; the public brand, logo, and domain remain undecided.
- Legal review, verified privacy/support operations, provider backup/log-retention evidence, and accountable Production operations remain unresolved.

Current release truth is recorded in [Current Release Status — 2026-09-08](docs/CURRENT_RELEASE_STATUS_20260908.md). Longer-lived authority and historical context remain in the [Two-sided Public Beta Authority](docs/TWO_SIDED_PUBLIC_BETA.md), [Version 2 Dynamic Execution Roadmap](docs/V2_DYNAMIC_EXECUTION_ROADMAP.md), [Project Status](docs/PROJECT_STATUS.md), [Deployment Safety Guide](docs/DEPLOYMENT.md), and [documentation map](docs/README.md).

## Known limitations

- SkillMint does not guarantee hiring, interviews, placement, or employability.
- Resume evidence candidates are not third-party verification of every user claim.
- The candidate Jobs surface does not auto-apply or predict hiring probability, and the live same-session Production Greenhouse acceptance required by issue #103 is still pending.
- Public beta is not authorized; external cohort remains `NO-GO` while recruiter Production acceptance is externally blocked.
- There is no payment or subscription system.
- There is no production LLM career adviser.
- The final public brand has not been selected.
- Supabase Free availability can pause after inactivity; current service health is not a 24/7 guarantee.
- Privacy/support monitoring, legal review, and broader Production operations remain open work.

## Documentation

Use the [documentation map](docs/README.md) to find the current release snapshot, product and data contracts, frozen verification evidence, deployment guidance, and historical planning material. Those categories are intentionally separate: implementation and current contracts describe what exists, frozen evidence records bounded past verification, and historical documents preserve context without proving shipped functionality.

## License

No open-source license is currently granted. Unless stated otherwise, all rights are reserved.

## Maintainer

SkillMint is built and maintained by Tushar Rawat.
