# SkillMint Project Status

**Last updated:** July 30, 2026

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
| Pre-Block-6 Brand & Domain Decision Gate | Paused by founder decision; still required before external beta | One to two focused working days; not a roadmap block |
| Block 6: Privacy-safe Analytics + Founder Dashboard | Engineering implementation and isolated verification complete | Production rollout and activation are deferred; no Production-readiness claim |
| Block 7: Beta Launch Readiness | Historical broad public-launch path stopped; Block 7.1 remains complete | Its former Block 7.2 sequencing is superseded as current authority by the Version 2 transition |
| Phase 1 — Resume Workspace | Complete; Phase 1A–1B local, isolated hosted, and synthetic Preview gates passed; real-user evidence remains pending during controlled early access | Phase 2 preserves the separate Workspace, browser-active report, export, and deletion contracts |
| Phase 2 — Resume Progress and Comparison | Engineering complete, merged through PR #26, deployed, and directly route-verified | Engineering/deployment closure only; no authenticated Production comparison, hosted PostgREST, real-user, scoring, mission, Active Target, or browser-key authorization |
| Phase 3 — Explainability | Read-only inspection and one bounded readiness-truth repair complete through PR #28; broader expansion deferred | The unsupported forecast was removed without a replacement prediction; recurring comprehension evidence remains pending |
| Phase 4 — Guided execution and onboarding | Not started and separately gated | No implementation, controlled invitation, or launch authorization |

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

The repair added no replacement forecast, probability, confidence range, timeline, estimated score gain, or future-readiness claim. Current Career IQ, Readiness Signals, mission guidance, scoring formulas, mission semantics, Active Target, roadmap, storage, ownership, Workspace, browser-active report, analytics, export, deletion, schema, migrations, dependencies, and lockfile contracts were preserved. Broad Phase 3 explainability expansion remains deferred pending demonstrated recurring comprehension evidence; this bounded engineering, deployment, and operational result does not establish user comprehension, market validation, broad Phase 3 value, unrestricted Production readiness, or controlled-launch authorization. Phase 4 has not started. Controlled-user invitations remain unauthorized, Production migrations remain unauthorized, and public beta, analytics activation, and unrestricted acquisition remain unauthorized.

Analytics collection remains disabled. The Phase 2 application deployment did not perform a Production database rollout, enable analytics, or satisfy the broader Production-readiness gate. Persistent Production founder configuration, Vercel WAF configuration, retention scheduling, legal approval, and operational ownership approval remain deferred. Environment separation was independently verified on July 27, 2026: Preview is staging-scoped and Production is Production-scoped. Vercel Production environment-variable records were re-scoped to Production-only while preserving the Production target; that earlier environment-separation action did not redeploy the then-live application or contact the Production Supabase database.

The supplied fresh Preview verification found zero Production-reference hits. Counts describe events, never people; there is no identity, unique-person, active-user, retention, cohort, or session metric contract. See [Version 2 Transition Gate](V2_TRANSITION_GATE.md), [Privacy-safe Analytics Collection](ANALYTICS.md), and the [Block 6 Rollout Runbook](BLOCK_6_ROLLOUT_RUNBOOK.md).

## Release boundary

Public beta is not authorized. Blocks 5 and 6 passed their applicable isolated engineering gates, but those results are not Production rollout or Production-readiness evidence. The former Beta v1 public-launch sequence is not the current work authority; Version 2 preparation is authorized instead.

The retained future Production-readiness boundary is:

```text
Production rollout
+ externally verified and monitored privacy/support contact operations
```

Production schema inventory and rollout, environment/origin coordination, operational ownership, incident and rollback handling, legal review, and provider backup/log retention claims remain outside the verified repository closure. A Vercel deployment or successful build does not by itself satisfy this boundary.

The automatic fail-closed deployment is not a Production database rollout claim. Production V5, V6, and V7 remain unapplied; Production V8 also remains unapplied, while V8 is applied only to isolated staging. No collection flag is enabled.

## Current approved sequence

**Sequencing override — 2026-07-19:** The Brand & Domain Gate remains paused by founder decision. This override permitted Block 6 to proceed using brand-neutral internal identifiers. Final public branding remains required before external beta or public-launch configuration.

1. Follow the [Version 2 Transition Gate](V2_TRANSITION_GATE.md) and [Version 2 Dynamic Execution Roadmap](V2_DYNAMIC_EXECUTION_ROADMAP.md).
2. Preserve the completed Phase 2 engineering/deployment closure and the completed Phase 3 inspection and bounded truth repair. Do not expand Phase 3 without demonstrated recurring comprehension evidence; Phase 4 has not started and remains separately gated.
3. During controlled early access, review comprehension, repeat use, comparison decision value, score-chasing risk, accessibility, and onboarding confusion; the evidence may cause Phase 1 or Phase 2 to be preserved, revised, deferred, or removed.
4. Invite an approximately 20-user controlled cohort only after every applicable Production-readiness gate passes.
5. Keep public beta, unrestricted acquisition, Production activation, and payments separately gated and unauthorized until their applicable evidence gates explicitly pass.
6. Treat the former Block 7.2 and Beta v1 public-launch ordering as historical planning material, not an active instruction.

The public name, backup name, and domain are all pending. The later July 28 amendment authorizes only bounded Phase 2 repository implementation; it does not authorize Production, DNS, hosted Supabase or Vercel configuration, authentication-origin or public-package changes, public beta, payments, deployment, or other launch execution.

## Question-specific authority

Use the evidence relevant to the question instead of one universal ranking:

- **Implementation truth:** inspect fetched Git chronology, current source, tests, schemas and configuration, and current implementation contracts. Code proves implementation, not strategy; tests prove only exercised behavior; build or deployment success does not prove release readiness.
- **Frozen verification evidence:** use SHA-pinned closure, QA, and frozen contract documents for the result and scope they record. Do not rewrite historical evidence, combine separate test layers, or claim that historical `/tmp` artifacts remain available.
- **Current product intent:** use explicit founder decisions durably recorded in the repository, beginning with the [Version 2 Transition Gate](V2_TRANSITION_GATE.md), then the current approved roadmap and decision documents, then constitution, vision, strategy, and compatible product requirements that have not been superseded. A conversation-only decision must be recorded in the repository before implementation. Code cannot silently cancel founder-approved strategy, and product documents do not prove implementation.
- **Historical material:** older UX, UI, architecture, API, database, AI, sprint, and launch documents preserve rationale when clearly classified. They do not prove implementation or grant current authorization when superseded.
- **Conflict rule:** identify the question and its relevant authority, record the contradiction, do not reinterpret a frozen contract, and obtain and document a founder decision when sequencing remains unresolved.

## Authoritative references

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
- [Block 7.1 Closure](BLOCK_7_1_CLOSURE.md)
- [Version 2 Resume Workspace Phase 1B Closure](V2_RESUME_WORKSPACE_PHASE_1B_CLOSURE.md)
- [Release Notes](RELEASE_NOTES.md)
- [Documentation Map](README.md)
