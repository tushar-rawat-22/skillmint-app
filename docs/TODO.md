# SkillMint TODO

**Status:** Current work index
**Authority:** [Version 2 Transition Gate](V2_TRANSITION_GATE.md), [Version 2 Dynamic Execution Roadmap](V2_DYNAMIC_EXECUTION_ROADMAP.md), and [Project Status](PROJECT_STATUS.md). The Beta v1 roadmap is historical context.

This file distinguishes current work from completed, blocked, deferred, and historical work. It is not a second roadmap and does not reopen frozen blocks.

## 1. Current authoritative status

- Blocks 1–5 are complete and frozen.
- Block 6 engineering implementation and isolated verification are complete.
- The fail-closed application code deployed automatically from `main`; Production V5–V7 remain unapplied and analytics remains disabled.
- The isolated hosted project contains no Production copy, has V1–V8 applied, and passed migration, ACL, catalog, and live-security verification; V7 repaired inherited `service_role` raw SELECT access and the later ACL-normalization migration preceded V8.
- Environment separation is complete: Vercel Production environment-variable records were re-scoped to Production-only while preserving the Production target. During that July 27 verification, the then-live deployment was not changed and the Production Supabase database was not contacted.
- Block 7.1 resume owner isolation is complete. The former broad Beta v1 public-launch path and its Block 7.2 sequencing are superseded as current authority by the Version 2 transition.
- Phase 1 — Resume Workspace is complete. Its Phase 1A and Phase 1B records remain historical implementation and verification evidence. V8 remains unapplied to Production.
- Phase 2 engineering is complete and merged through PR #26 at `17b1167d9d01ad2e30bc3ecbab55ddbbc93ef433`; the reviewed feature head was `47f30a6300375ebdfeb48109a9ad6d82c3a67e39`.
- Pull-request CI and main push CI run `30469897446` passed. Vercel deployed the resulting `main` application, the general read-only Production smoke passed, and `/resume/compare` returned HTTP 200 with the expected visible heading.
- Authenticated Production comparison was not performed, hosted Production PostgREST pair and pagination behavior was not verified, and real-user comprehension and decision-value evidence remains pending. Phase 3 has not started.
- Real-user comprehension, repeat-use, comparison-value, score-chasing, accessibility, and onboarding evidence remains pending and is required during controlled early access.
- A controlled hosted Production launch is targeted within 15 days, but is not guaranteed and does not prove unlimited scale, permanent Production readiness, or market validation.
- Public unrestricted acquisition is not authorized.
- Controlled-user activation, Production database rollout, and payments remain behind separate gates. No further Production action follows from this documentation change.
- Publishing a privacy/support contact is blocked until ownership and monitoring are externally verified.
- Block 5 isolated engineering verification must not be described as production rollout, legal readiness, or provider-retention proof.

## 2. Completed and frozen

- [x] Block 1: Premium Product UI System.
- [x] Block 2: Scoring Calibration + Truth Engine.
- [x] Block 3: Mission Execution + Career Path Engine.
- [x] Block 4: Active Target + JD Workflow, including stale-JD and browser-owner hardening.
- [x] Block 5.1: Browser Data Safety.
- [x] Block 5.2: Export and Trust Center Reliability.
- [x] Block 5.3: Deletion, Database, Privacy, and Release Safety on the authorized isolated project.
- [x] Block 6: Privacy-safe analytics and founder dashboard engineering implementation and isolated verification.
- [x] Block 7.1: Resume owner isolation and stale-operation safety.
- [x] Account saved-report deletion for resume analyses, JD matches, and career snapshots.
- [x] Protected backend account-deletion route with recent-authentication, least-privilege, stale-token, race, and cleanup evidence.

Preserve the scoring, proof, mission, Active Target, owner-partition, export, clearing, saved-report deletion, and account-deletion contracts recorded in the frozen documents.

## 3. Block 7.1 completed

- [x] Reproduced the account-switch owner-isolation defect deterministically.
- [x] Repaired resume persistence and publication so Account A data cannot create Account B state.
- [x] Proved that an already Account-A-authenticated request may finish only as Account A.
- [x] Passed targeted cross-browser, repeated Chromium, race, ownership, analytics, Block 5, Block 6, lint, build, and diff verification.
- [x] Merged PR #17 at `2401db7b8613879119a000b4a5019f7f68d88ef4`.

The independent verdict was `PASS_SAFE_FOR_COMMIT_GATE`. See [Block 7.1 Closure](BLOCK_7_1_CLOSURE.md). This completion does not resolve the broader release blockers or satisfy the complete Block 7 launch-readiness gate.

## 4. Current Version 2 direction

- [x] Complete the bounded local engineering gate for [Resume Workspace v1](RESUME_WORKSPACE_V1_ARCHITECTURE.md), including V1–V8 replay, catalog/RLS/lifecycle proof, generated types, ownership/race fixtures, affected browser coverage, lint, and build.
- [x] Publish Phase 1A through PR #21 at merge commit `9eb2318269f835a7f9cc249e8ab014c73a9271ae`; publish the lifecycle ACL normalization through PR #22 at baseline `9db3a832e5ffd2c806a787a8438dfb3946fea879`.
- [x] Complete [Phase 1B](V2_RESUME_WORKSPACE_PHASE_1B_CLOSURE.md) isolated-staging migration/catalog/behavior verification, protected-Preview target proof, synthetic signed-in flow checks, and credential/data cleanup without contacting Production.
- [x] Treat Phase 1 — Resume Workspace as complete.
- [x] Commit the accepted Phase 2 Core and UI locally with exactly two explicit same-owner saved reports, deterministic sanitized evidence, source-deletion invalidation, account-switch and stale-result safety, and no scoring or persistent comparison history.
- [x] Accept, commit, push, independently review, check, and merge bounded Phase 2 through [PR #26](V2_RESUME_PROGRESS_COMPARISON_ARCHITECTURE.md) at `17b1167d9d01ad2e30bc3ecbab55ddbbc93ef433`.
- [x] Record successful main CI run `30469897446`, the general read-only Production smoke, and direct `/resume/compare` HTTP 200 verification with the expected visible heading.
- [ ] Perform a read-only Phase 3 — Explainability architecture inspection before authorizing implementation.
- [ ] Implement only the minimum separately authorized Phase 3 — Explainability needed to make comparison truthful and useful. Phase 3 has not started.
- [ ] Add only the minimum Phase 4 — Guided execution and onboarding work needed for the controlled launch.
- [ ] During controlled early access, evaluate comprehension of saved analyses, the account Workspace resume, and the browser-active report; repeat use; comparison decision value; score-chasing risk; accessibility; and onboarding confusion. Use the evidence to preserve, revise, defer, or remove Phase 1 or Phase 2.
- [ ] Keep unrelated capability expansion, unrestricted acquisition, payments, subscriptions, AI chat, résumé rewriting, auto-apply, job scraping, recruiter tools, and institution dashboards deferred.
- [ ] After the Production-readiness gate passes, invite approximately 20 users; expand toward 50, 100, and 200 only after explicit stability, comprehension, support-load, and material privacy/security review.

## 5. Parallel Brand & Domain Gate

- [ ] Generate an initial shortlist.
- [ ] Select three finalists.
- [ ] Review domain availability and basic competitor, confusion, pronunciation, spelling, and trademark risk.
- [ ] Select one public name.
- [ ] Select one backup name.
- [ ] Reserve one usable domain early after selection and review; do not connect it to Production yet.
- [ ] During the separately authorized launch-integration window, connect the selected domain and coordinate DNS, Vercel assignment, Supabase URLs, authentication and password-recovery URLs, and SMTP.

`SkillMint` remains the internal working name. The selected public name, backup, and domain are `Pending`; screening continues separately after Phase 2. Reservation does not activate the domain. Domain purchase, DNS, Vercel assignment, Supabase URL changes, and SMTP configuration require separate explicit execution approval. A public-brand change must not rename repository, package, storage, schema, migration, function, fixture, or environment-variable identifiers. See [Brand & Domain Decision Gate](BRAND_DOMAIN_GATE.md).

## 6. Historical minimal public-brand foundation

- [ ] Add centralized public-brand configuration on a bounded branch.
- [ ] Change user-facing brand surfaces only.
- [ ] Preserve `skillmint:*` storage keys, TypeScript identifiers, repository/package names, environment-variable names, database/schema/function names, fixtures, commits, and frozen evidence.
- [ ] Preserve the premium light-first UI, responsive behavior, and accessibility.
- [ ] Confirm no scoring, mission, Active Target, ownership, export, deletion, schema, storage, auth, DNS, or production behavior changed.

## 7. Historical Block 6: Privacy-safe Analytics + Founder Dashboard

Engineering implementation and isolated verification are complete. Unchecked items below are deferred Production activation work, not unfinished repository implementation.

- [x] Define and implement the frozen privacy-minimized Block 6.1 event/data contract locally.
- [x] Apply privacy, minimization, ownership, and exact 1,080-hour deletion-threshold review to the repository contracts.
- [x] Implement current-environment aggregate product-event visibility without identity analytics, resume content, pasted JDs, credentials, unique people, cohorts, sessions, or person-level retention.
- [x] Protect the unlinked, user-navigation/feedback-isolated founder dashboard with one server-only configured Auth UUID that remains authorization configuration, not analytics data.
- [x] Define exactly three observed event ratios, including zero-denominator and uncapped behavior; do not add mission completion or inferred resume-success ratios.
- [x] Keep analytics separate from public product claims and all scoring, mission, Active Target, ownership, export, deletion, and password-recovery behavior.
- [x] Add deterministic exact HTTP parser, two-tier limiter, exact DTO, fail-closed SQL, millisecond/exact-hour, bounded-purge, privilege, ratio, privacy, and cross-browser presentation coverage.
- [x] Complete the independent terminal review of Block 6.2.
- [x] Merge and freeze Block 6.2 pending rollout.
- [x] Run the separately authorized isolated V7 migration and repeated live-security verification gate.
- [ ] Prove the Production V1–V4 baseline catalog before any migration-history repair.
- [ ] Authorize the separate Production V5–V7 rollout with rollback and monitoring.
- [ ] Configure distributed Vercel WAF enforcement; the coarse 60-per-minute pre-Auth allowance and separate ten-per-minute founder limiter/one-query lock are process-local only.
- [ ] Separately authorize and implement `pg_cron` scheduling for the exact 1,080-hour purge contract; each run deletes at most 10,000 overdue events, so repeated runs may be needed. It is currently unapplied, uncallable by API roles, and unscheduled.
- [ ] Configure the founder Auth UUID and enable collection only as part of an authorized rollout.

The frozen taxonomy already contains `mission_started` and `mission_marked_done`. No new mission event, mission-completion ratio, inferred proof, or taxonomy change is approved. These events must not manipulate scores, treat a click as proof, or claim verified completion. Mission completion remains self-progress; evidence and scores change only after evidence changes and re-analysis detects them.

Block 6 must not become a public analytics surface and must not overclaim beta readiness. Plain V6 `CREATE FUNCTION` declarations intentionally fail if either function exists unexpectedly. The aggregate `as_of` is millisecond-aligned; windows use exact elapsed 24/168/720 hours, not calendar days.

The automatic fail-closed application deployment did not apply a Production migration or activate analytics. Persistent Production founder configuration, the WAF rule, and the purge schedule are unconfigured. No Production database or setting was changed. These activation tasks remain deferred and do not reopen the completed Block 6 engineering and isolated-verification status. See the [Block 6 Rollout Runbook](BLOCK_6_ROLLOUT_RUNBOOK.md).

## 8. Historical Block 7 and retained future Production blockers

- [ ] Historical: run Block 7.2 as a read-only beta-release decision gate. This is no longer a current task; see the Version 2 transition authority.
- [ ] Inventory the actual production schema before any migration.
- [ ] Approve accountable ownership, backup/recovery, rollback, incident, and monitoring plans.
- [ ] Apply and exactly verify the locked schema sequence under production authorization.
- [ ] Verify server/public environment separation and absence of secrets from browser output.
- [ ] Verify and monitor the privacy/support contact; do not publish an invented address.
- [ ] Configure and verify custom SMTP, abuse and rate controls, logging and monitoring, and operational support ownership.
- [ ] Coordinate Vercel production branch, custom-domain mapping, Preview versus Production variables, `NEXT_PUBLIC_APP_URL`, allowed origins, Supabase Site URL, redirect allowlists, password-reset links, canonical URLs, and deletion-origin behavior.
- [ ] Complete privacy, legal, security, accessibility, and launch/no-launch review.
- [ ] Run controlled authorized Production auth, resume, comparison, export, saved-report deletion, account-deletion, and smoke checks with a reviewed migration and rollback path.
- [ ] Review provider backup/log retention claims and obtain legal review before making compliance or erasure promises.
- [ ] Confirm the controlled approximately 20-user cohort, support capacity, pause conditions, and escalation owners before invitations.

Domain integration belongs here, not in the screening and reservation work. Controlled invitations remain blocked until the release gate is explicitly approved.

The retained release-blocker register is:

- `privacy_contact_missing`
- `production_schema_rollout_pending`
- `external_privacy_contact_ownership_unverified`
- `legal_review_unresolved`
- `provider_backup_log_retention_unverified`
- `operational_ownership_unresolved`

Block 7.1 did not resolve these broader release blockers.

## 9. Deferred beyond the former Beta v1 plan

- [ ] Payments, checkout, entitlements, subscriptions, and hard paywalls.
- [ ] AI chat or a generic career coach layer.
- [ ] Job board, scraping, auto-apply, or multi-job tracking expansion.
- [ ] External GitHub, LinkedIn, LeetCode, portfolio, or certificate verification.
- [ ] Backend mission-state persistence. It remains deferred and is not part of Block 6 unless separately approved.
- [ ] Account-level Active Target persistence and broader saved-JD workflow.
- [ ] Public proof profiles, recruiter products, and institution dashboards.
- [ ] Career score history beyond the current saved-analysis/active-report contract.
- [ ] Evaluate a future scoring-calibration set and versioned score update only after consented beta feedback and reviewer-labeled resume cases exist; preserve historical report semantics and do not silently replace the frozen Beta v1 scoring contract.
- [ ] Evaluate Proof Engine v2 and stronger proof-source validation after Beta v1; evidence candidates remain unverified unless an explicit external-validation contract is implemented and tested.
- [ ] True PNG/image export for Shareable Snapshot if later justified without risky dependency or bundle impact.
- [ ] Salary calibration before presenting salary as a core trusted metric.

## 10. Historical roadmap and completed sprint notes

The original architecture-to-launch phases and Sprint 5–7/RC-1A–RC-1E checklists are historical execution records. Git history and release documents preserve the detailed chronology. They must not be read as open tasks.

Historical milestones include:

- Architecture Freeze v1.0;
- Resume Intelligence Freeze v1.1;
- Account Persistence Freeze v1.2;
- Sprint 7 onboarding, beta UX, feedback, deployment preparation, activation, visual direction, password recovery, proof-aware scoring, doctrine, and hierarchy work;
- RC-1A explainability, RC-1B role/roadmap clarity, RC-1C/D workspace/mobile state, and RC-1E closeout;
- Phase 2A explicit saved-analysis restore and active-report selection;
- Blocks 1–5 and the final Block 5 repaired-runtime closure.

Historical decisions still worth preserving:

- deterministic scoring before AI reasoning;
- no fake proof, deletion, privacy, or launch claims;
- saved account history is not automatically the browser's active report;
- clear workspace is browser-only;
- mission status and Active Target never manipulate scores;
- production operations require separate authorization and evidence.
