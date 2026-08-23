# SkillMint Project Status

**Last updated:** August 23, 2026

**Version 2 transition baseline:** `783e1837028b92cf1edbf29f4699acdaa50df9f8`

This is the current-state entry point for the founder and maintainers. Before planning new work, fetch the current `main` branch and confirm its HEAD; this SHA records the implementation baseline audited for this document, not a promise that it will remain current.

## Repository context

SkillMint is a proof-aware Career Operating System for students, freshers, job seekers, and early-career users. It helps a user understand current resume evidence, realistic role direction, proof gaps, one job-specific match, and the next truthful improvements.

```text
Resume Reality
-> Profile-fit Roles
-> Active Target
-> Proof Confidence
-> Career IQ
-> Latest JD Match
-> Roadmap / Missions
-> Re-analysis and Re-score
```

## Product boundaries

- Career IQ is a deterministic, proof-aware readiness signal. It is not hiring probability, a placement chance, or a job guarantee.
- Proof Confidence measures resume-internal support and evidence candidates. It is not third-party proof verification; missing proof means unverified, not false.
- Profile-fit Roles describe general resume fit. Latest JD Match applies to one pasted job description and the resume context used for that match.
- Active Target changes focus and priority, not scores. Stale JD context must not appear current.
- Mission completion is self-progress. Scores move only after evidence changes and re-analysis detects it.
- Saved analyses are immutable account history. A signed-in user may separately choose one Workspace resume for cross-device discovery. The active report remains browser-local and alone powers the current browser dashboard; Workspace selection never changes it automatically.
- Anonymous and account-owned browser state are separate owner partitions. One account must not consume another account's browser partition.
- Clear workspace removes registered SkillMint browser data only. Saved-report deletion and backend account deletion are separate operations.

## Beta v1 status

| Sequence | Status | Boundary |
| --- | --- | --- |
| Block 1: Premium Product UI System | Complete and preserved | Premium light-first UI; no broad redesign |
| Block 2: Scoring Calibration + Truth Engine | Complete and frozen | Scoring and proof contracts are locked |
| Block 3: Mission Execution + Career Path Engine | Complete and frozen | Missions do not manipulate scores |
| Block 4: Active Target + JD Workflow | Complete, hardened, merged, and frozen | Target focus, owner isolation, and JD freshness remain locked |
| Block 5: Data Controls + Trust Center | Complete, verified, merged, synchronized, and frozen | Isolated engineering proof; no production claim |
| Public brand collision gate | Reopened for the two-sided beta; collision screen complete, selection pending | Presentation-only shortlist; no domain purchase or internal rename |
| Block 6: Privacy-safe Analytics + Founder Dashboard | Engineering implementation and isolated verification complete | Production rollout and activation are deferred; no Production-readiness claim |
| Block 7: Beta Launch Readiness | Historical broad public-launch path stopped; Block 7.1 remains complete | Its former Block 7.2 sequencing is superseded as current authority by the Version 2 transition |
| Phase 1 — Resume Workspace | Complete; Phase 1A–1B local, isolated hosted, and synthetic Preview gates passed; real-user evidence remains pending during controlled early access | Phase 2 preserves the separate Workspace, browser-active report, export, and deletion contracts |
| Phase 2 — Resume Progress and Comparison | Engineering complete, merged through PR #26, deployed, and directly route-verified | Engineering/deployment closure only; no authenticated Production comparison, hosted PostgREST, real-user, scoring, mission, Active Target, or browser-key authorization |
| Phase 3 — Explainability | Read-only inspection and one bounded readiness-truth repair complete through PR #28; broader expansion deferred | The unsupported forecast was removed without a replacement prediction; recurring comprehension evidence remains pending |
| Phase 4 — Guided execution and onboarding | Read-only inspection and one bounded upload-accessibility repair complete through PR #30 | Broader Phase 4 work is deferred pending recurring controlled-user evidence; no controlled invitation or launch authorization |
| Phase 5A — Controlled Access Foundation | Engineering implementation complete | Application signup defaults closed; the later bounded inventory verified provider signup disabled and email login enabled |
| Phase 5B — Production Rollout Foundation | Offline validator, forward ACL repair, rollout authority, and deterministic repository coverage implemented | Readiness remains `NO-GO`; no Production or hosted change is authorized or claimed |
| Two-sided beta — public IA and synthetic recruiter demo | Implemented and merged through PR #45 | Both demos remain deterministic, gated, and structurally isolated from Supabase session refresh, analytics, storage, and external requests |
| Two-sided beta — candidate Proof Brief | Engineering implementation, isolated database verification, and independent security/privacy review complete | Default-private, revocable link-only sharing and V10 persona foundation; Production migration remains unapplied |

Block 5 feature commit: `5a8364b25f3f0ae657f55a9a354158d6181f1083`

Block 5 merge commit: `3cb5e28050cf93e42e53405f0f2be9d12e756e27`

Blocks 1–5 are frozen. Future work may extend the product only while preserving their behavior, evidence, identities, and non-claims.

Block 6 engineering implementation and isolated verification are complete. The isolated hosted migration and ACL verification passed, including the V7 additive ACL repair, and the isolated live-security gate passed. These results do not prove Production behavior or authorize Production rollout.

Post-Block-6 maintenance completed the founder invalid-token repair and the data-control provider-status and account-reauthentication repairs. PostCSS CVE-2026-45623 / GHSA-6g55-p6wh-862q was patched. As verified on July 24, 2026, GitHub reported zero open Dependabot alerts; this is a dated observation, not a permanent guarantee.

Launch-critical repository hardening now shares a 4 MiB resume-upload contract
across client and server, rejects scanned PDFs with a typed 422 response,
bounds file and DOCX archive validation, sanitizes password-recovery failures,
serves a static security-header baseline, reduces the health response to a
coarse no-store status, and runs those contracts in CI. This work does not
configure a hosted WAF or CAPTCHA provider, authorize or contact Production, or
begin Phase 2.

Block 7.1 confirmed and repaired a resume owner-isolation race. Account A data can no longer be rebound to Account B at persistence or publication time, and an already Account-A-authenticated request may finish only as Account A. The repair merged through PR #17 at `2401db7b8613879119a000b4a5019f7f68d88ef4` and received the independent verdict `PASS_SAFE_FOR_COMMIT_GATE`. See [Block 7.1 Closure](BLOCK_7_1_CLOSURE.md).

Version 2 Phase 1A implements Resume Workspace v1 as a separate account-owned selection over immutable saved analyses. Explicit set/change/clear actions do not change the browser-active report; a fresh browser gets an offer that must be accepted. V8 uses a one-row owner key, composite owner/source foreign key, active-user RLS, least-privilege column grants, and database-controlled selection timestamps. Account count/export, individual and bulk saved-report deletion, protected account deletion, and Account A/B stale-result guards include the selection without changing their existing public boundaries.

The July 28 Phase 1A local gate replayed V1–V8 from empty, matched the catalog and generated types, passed transactional positive/negative ownership and lifecycle probes, local schema lint, deterministic preservation suites, affected cross-browser tests, source lint, build, and diff checks.

Phase 1B then applied the ACL-normalization migration and V8 exactly once to isolated staging, aligned migration history through V8 with a zero-pending dry run, and passed hosted lint, catalog verification, an 18/18 rollback-contained behavior probe, and protected-Preview target verification. Synthetic signed-in Preview checks preserved the separation among saved history, account Workspace selection, and the browser-active report; the final fresh-browser slice passed 8/8. Temporary credentials were revoked, disposable data returned to zero, Preview protection was restored, and Production was not contacted. See [Version 2 Resume Workspace Phase 1B Closure](V2_RESUME_WORKSPACE_PHASE_1B_CLOSURE.md).

Version 2 Phase 2 engineering is complete. Core commit `02501543fdb39a7ad51d08a29adb15a175844f15`, UI commit `4f777b0e149bb148319c4c38cd1e9cb51d91e4e8`, and reviewed feature head `47f30a6300375ebdfeb48109a9ad6d82c3a67e39` merged through PR #26 at `17b1167d9d01ad2e30bc3ecbab55ddbbc93ef433`. The evidence-only comparison uses exactly two explicit same-owner saved reports, refetches only that pair, derives sanitized evidence in memory, and creates no score comparison, URL selection state, browser-storage key, comparison persistence, export record, Workspace change, browser-active report change, resume-sync change, or analytics event. See [Version 2 Resume Progress and Comparison Architecture](V2_RESUME_PROGRESS_COMPARISON_ARCHITECTURE.md).

Pull-request CI run #49 passed, and main push CI run `30469897446` passed at the exact merge commit. Vercel deployed the resulting `main` application. The general read-only Production smoke passed, and a direct request to `/resume/compare` returned HTTP 200, remained on that route, returned HTML, and displayed “Compare saved report evidence” without a visible application, internal-server, or not-found error. Phase 2 is operationally closed for engineering and deployment. Authenticated Production comparison was not performed, hosted Production PostgREST pair and pagination behavior was not verified, and real-user comprehension and decision-value evidence remains pending. This closure is not controlled-launch authorization, market validation, or permanent Production-readiness proof.

Phase 3 began with a read-only explainability architecture inspection that completed without repository changes and returned `IMPLEMENT_A_BOUNDED_SLICE`. It found one demonstrated repository truth defect: the dashboard's unsupported numeric “Projected Readiness Path” used synthetic 30/60/90-day Career IQ gains that implied completing the next mission predicted score movement. The frozen contract instead treats mission completion as self-progress; Career IQ changes only when underlying evidence changes and a later analysis detects it.

The accepted bounded repair removed the unsupported numeric “Projected Readiness Path” from the dashboard. Implementation commit `2b772d8ccefd1f1484baa727e6f230318ab3288c` and reviewed head `98ec7eaa4dbbae824d48d6b29958c022cbe6a22e` merged through PR #28 at `2f443d4c595e01523015aae3b9b2072eebfba9c6`. Initial pull-request CI run `30513546806` failed because the protected integration fixture retained a stale protected-fixture hash for the changed mission-path fixture; the second commit updated only that exact hash pin, not runtime behavior. Replacement pull-request CI run `30514124663` and main push CI run `30514466459` passed. Vercel reported a successful Production deployment, and the general read-only Production smoke passed. The feature branch was then removed locally and remotely, with local `main` and `origin/main` synchronized at the merge commit.

The repair added no replacement forecast, probability, confidence range, timeline, estimated score gain, or future-readiness claim. Current Career IQ, Readiness Signals, mission guidance, scoring formulas, mission semantics, Active Target, roadmap, storage, ownership, Workspace, browser-active report, analytics, export, deletion, schema, migrations, dependencies, and lockfile contracts were preserved. Broad Phase 3 explainability expansion remains deferred pending demonstrated recurring comprehension evidence; this bounded engineering, deployment, and operational result does not establish user comprehension, market validation, broad Phase 3 value, unrestricted Production readiness, or controlled-launch authorization.

The completed read-only Phase 4 inspection covered guided execution and onboarding, made no repository changes, and returned `IMPLEMENT_A_BOUNDED_SLICE`; it did not authorize a broad onboarding redesign. It found one demonstrated launch-relevant defect on the canonical resume-upload surface: `display:none` removed the native file input from keyboard interaction, processing lacked bounded status/live semantics, visible failure lacked alert semantics, and “Drop your resume here” inaccurately claimed an interaction that did not exist. Other onboarding, signup-sequencing, dashboard-hierarchy, and guided-flow concerns remain plausible risks rather than demonstrated user behavior.

The bounded upload-accessibility repair made the native input the keyboard-reachable native chooser and kept it as the sole chooser authority. Opacity now keeps it visually unobtrusive without removing it from interaction, the surface shows visible focus treatment, and “Choose your resume file” removed the inaccurate drag-and-drop wording; no drag-and-drop implementation was added. The exact `.pdf`, `.docx`, `.txt`, and 4 MiB contracts are unchanged. Indeterminate processing gained a concise polite announcement through processing status and busy semantics without fabricated percentages, while sanitized failures gained failure alert semantics. Retry behavior and successful `/resume` routing remain preserved.

Implementation commit `0eb4cd94e1a5e642ab9dd6350bfa4153197dd45c` merged through PR #30, “Make resume upload keyboard accessible,” at `6793c946de045d7c1fe3cf45e84d8ed25fe23d5f`. Launch-hardening fixtures passed 30/30; Chromium launch-hardening passed 7/7; the focused regression passed 1/1 in Firefox and 1/1 in WebKit; and Chromium accessibility/responsive coverage passed 3/3. Affected authentication, ownership, Resume Workspace, and Resume Comparison browser suites, the complete CI offline-contract sequence, lint, and the 24-route Production build passed. Pull-request CI run `30522914931` passed against the reviewed head, and main push CI run `30523438736` passed at the merge commit. Vercel reported a successful Production deployment, and the general read-only Production smoke passed. The feature branch was removed locally and remotely, and local `main` and `origin/main` synchronized at the merge commit.

The slice added no new onboarding state, browser-storage key, analytics event, scoring or mission change, ownership or persistence change, schema, migration, dependency, lockfile, or CI change. Local and CI browser semantics do not prove identical audible output across every screen-reader/browser combination, so real assistive-technology evidence remains pending. The general Phase 4 smoke proved route availability only and was not authenticated functional accessibility validation of the Production upload flow, keyboard behavior, screen-reader output, or other assistive technology.

No controlled user was invited, and no real-user onboarding, abandonment,
comprehension, or accessibility evidence was collected during that phase. At
that closure, broader Phase 4 guided-execution and onboarding work is deferred pending recurring controlled-user evidence. Its
then-current invitation and public-beta restrictions are historical and were
superseded by the August 23 founder authority. At that closure,
**Controlled-user invitations remain unauthorized** and **Production migrations remain unauthorized** recorded the applicable boundary; Production migrations
and hosted activation still require their current gates.

Phase 5A adds a server-only `SKILLMINT_PUBLIC_SIGNUP_ENABLED` application gate. Public signup defaults closed unless the trimmed, case-insensitive value is exactly `true`; the closed state renders no signup form or account-creation controls, collects no prospective-user data, and directs existing users to login. The shared auth submission path independently refuses disabled signup while preserving existing-user login and sanitized errors.

This is an application-level public-registration gate, not an invitation system or authorization boundary. The hosted control was unverified and unchanged during Phase 5A. The bounded July 30 Production inventory later verified provider signup disabled and existing email login enabled; both states must be preserved. Enabling registration, changing hosted configuration, controlled invitations, public launch, Production schema work, and migrations remain separately authorized gates. Merge or deployment alone does not authorize controlled access.

Phase 5B records a verified Production exact V1+V2 versioned catalog baseline plus the known untracked `public.rls_auto_enable()` drift, with unknown migration-history and table-grant visibility. Its offline validator keeps `CATALOG_BASELINE=V1+V2`, separately reports `CATALOG_DRIFT=public.rls_auto_enable`, returns `NO-GO`, and reports the zero-backup, no-PITR, disabled SSL enforcement, absent custom SMTP, disabled CAPTCHA, enabled email auto-confirm, six-character password minimum, unknown table-grant visibility, and untracked-function blockers.

The inventory did not capture that function's live owner, exact event-trigger contract, or body. The forward migration after V8 therefore fails closed unless an authorized preflight matches the exact repository function-owner and event-trigger-owner contract, including `postgres` ownership for both; it snapshots that contract across the ACL-only change but intentionally does not inspect the body. Exact body verification remains an authorized rehearsal and postflight requirement. See [Production Schema Rollout Authority](PRODUCTION_SCHEMA_ROLLOUT.md).

This repository foundation does not resolve a blocker, apply V3–V8, normalize the live function, repair migration history, change Auth, enable analytics, contact a hosted service, or authorize invitations. Production rollout remains `NO-GO`.

The pending V10 foundation adds owner-qualified candidate Proof Briefs and a
server-owned account persona. Proof Brief mutations use an authenticated
same-origin server route that reloads the exact account-owned saved analysis
and derives the public payload; browsers retain owner-only read access and
cannot supply payloads or token hashes. Client-writable saved-profile labels are
not publication authority; only server-owned canonical skill labels can enter
the public payload. Proof Briefs contain only a strict derived
evidence payload, default to `PRIVATE`, and can be shared through a revocable
`LINK_ONLY` token whose raw value is never stored. Public lookup exposes no
table access and returns only the payload and sharing timestamp. Account export
v4 includes the persona and brief without the owner or token hash; saved-report
and account deletion remove the new records without changing their frozen
public return contracts. This is repository and synthetic-browser evidence,
not a Production schema claim.

The August 23 isolated database rehearsal replayed V1 through V10 from an empty
local PostgreSQL database. Ten rollback-contained probes then confirmed owner
read isolation, denial of browser DML and token-hash reads, denial of anonymous
table reads, exact allowlisted public RPC projection, revocation, and cascade
deletion. No hosted database was contacted; V10 remains unapplied to Production.

Analytics collection remains disabled. The Phase 2 application deployment did not perform a Production database rollout, enable analytics, or satisfy the broader Production-readiness gate. Persistent Production founder configuration, Vercel WAF configuration, retention scheduling, legal approval, and operational ownership approval remain deferred. Environment separation was independently verified on July 27, 2026: Preview is staging-scoped and Production is Production-scoped. Vercel Production environment-variable records were re-scoped to Production-only while preserving the Production target; that earlier environment-separation action did not redeploy the then-live application or contact the Production Supabase database.

The supplied fresh Preview verification found zero Production-reference hits. Counts describe events, never people; there is no identity, unique-person, active-user, retention, cohort, or session metric contract. See [Version 2 Transition Gate](V2_TRANSITION_GATE.md), [Privacy-safe Analytics Collection](ANALYTICS.md), and the [Block 6 Rollout Runbook](BLOCK_6_ROLLOUT_RUNBOOK.md).

## Release boundary

**Founder override — 2026-08-23:** the company objective is now a public
two-sided product beta for candidates and recruiters. The
[Two-sided Public Beta Authority](TWO_SIDED_PUBLIC_BETA.md) supersedes the former
investor-only deployment sequence and the earlier statement that public-beta
product work was unauthorized. Blocks 1–5, evidence truth, ownership, privacy,
and synthetic-demo isolation remain preserved.

This authority permits repository implementation, reviewed branches and pull
requests, and isolated verification. It does not by itself authorize a
Production migration, OAuth-provider switch, analytics activation, public
signup switch, domain change, or deployment before the applicable gates pass.

The retained future Production-readiness boundary is:

```text
Production rollout
+ externally verified and monitored privacy/support contact operations
```

Production schema inventory and rollout, environment/origin coordination, operational ownership, incident and rollback handling, legal review, and provider backup/log retention claims remain outside the verified repository closure. A Vercel deployment or successful build does not by itself satisfy this boundary.

The automatic fail-closed deployment is not a Production database rollout claim. The July 30 inventory verified only the V1+V2 Production catalog; V3–V8 remain catalog-pending, while V8 is applied only to isolated staging. The new post-V8 ACL repair is also unapplied. No collection flag is enabled.

## Current approved sequence

1. Follow the [Two-sided Public Beta Authority](TWO_SIDED_PUBLIC_BETA.md).
2. Build candidate and recruiter public entry points and isolated synthetic demos.
3. Build default-private, candidate-authorized Proof Brief sharing and the
   smallest recruiter evidence-review workflow without ranking or hiring
   predictions.
4. Prepare OAuth and server-owned persona boundaries, structured feedback, and
   privacy-safe first-party analytics while keeping hosted activation off.
5. Independently review security and privacy changes, then rehearse the
   Production schema and operational launch gates before any public switch.
6. Keep payments, candidate discovery, automated decisions, broad rebranding,
   domain purchase, and third-party analytics outside this beta.

The public name, backup name, and domain remain pending. SkillMint is now a
collision-screened internal codename, not an approved broad public brand.

## Question-specific authority

Use the evidence relevant to the question instead of one universal ranking:

- **Implementation truth:** inspect fetched Git chronology, current source, tests, schemas and configuration, and current implementation contracts. Code proves implementation, not strategy; tests prove only exercised behavior; build or deployment success does not prove release readiness.
- **Frozen verification evidence:** use SHA-pinned closure, QA, and frozen contract documents for the result and scope they record. Do not rewrite historical evidence, combine separate test layers, or claim that historical `/tmp` artifacts remain available.
- **Current product intent:** use explicit founder decisions durably recorded in the repository, beginning with the [Version 2 Transition Gate](V2_TRANSITION_GATE.md), then the current approved roadmap and decision documents, then constitution, vision, strategy, and compatible product requirements that have not been superseded. A conversation-only decision must be recorded in the repository before implementation. Code cannot silently cancel founder-approved strategy, and product documents do not prove implementation.
- **Historical material:** older UX, UI, architecture, API, database, AI, sprint, and launch documents preserve rationale when clearly classified. They do not prove implementation or grant current authorization when superseded.
- **Conflict rule:** identify the question and its relevant authority, record the contradiction, do not reinterpret a frozen contract, and obtain and document a founder decision when sequencing remains unresolved.

## Authoritative references

- [Two-sided Public Beta Authority](TWO_SIDED_PUBLIC_BETA.md)
- [Beta v1 Build Roadmap](BETA_V1_BUILD_ROADMAP.md)
- [Version 2 Transition Gate](V2_TRANSITION_GATE.md)
- [Version 2 Dynamic Execution Roadmap](V2_DYNAMIC_EXECUTION_ROADMAP.md)
- [Resume Workspace v1 Architecture](RESUME_WORKSPACE_V1_ARCHITECTURE.md)
- [Version 2 Resume Progress and Comparison Architecture](V2_RESUME_PROGRESS_COMPARISON_ARCHITECTURE.md)
- [Brand & Domain Decision Gate](BRAND_DOMAIN_GATE.md)
- [Scoring System](SCORING_SYSTEM.md)
- [Mission System](MISSION_SYSTEM.md)
- [Career Path Engine](CAREER_PATH_ENGINE.md)
- [Active Target Workflow](ACTIVE_TARGET_WORKFLOW.md)
- [JD Workflow](JD_WORKFLOW.md)
- [Data Controls](DATA_CONTROLS.md)
- [Data Export](DATA_EXPORT.md)
- [Data Map](DATA_MAP.md)
- [Account Deletion](ACCOUNT_DELETION.md)
- [Trust Center](TRUST_CENTER.md)
- [Block 5 Closure](BLOCK_5_CLOSURE.md)
- [Deployment Safety Guide](DEPLOYMENT.md)
- [Block 6 Rollout Runbook](BLOCK_6_ROLLOUT_RUNBOOK.md)
- [Production Schema Rollout Authority](PRODUCTION_SCHEMA_ROLLOUT.md)
- [Block 7.1 Closure](BLOCK_7_1_CLOSURE.md)
- [Version 2 Resume Workspace Phase 1B Closure](V2_RESUME_WORKSPACE_PHASE_1B_CLOSURE.md)
- [Release Notes](RELEASE_NOTES.md)
- [Documentation Map](README.md)
