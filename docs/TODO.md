# SkillMint TODO

**Status:** Current work index
**Authority:** [Project Status](PROJECT_STATUS.md) and [Beta v1 Build Roadmap](BETA_V1_BUILD_ROADMAP.md)

This file distinguishes current work from completed, blocked, deferred, and historical work. It is not a second roadmap and does not reopen frozen blocks.

## 1. Current authoritative status

- Blocks 1–5 are complete and frozen.
- Block 6, Privacy-safe Analytics + Founder Dashboard, has not started.
- Block 7, Beta Launch Readiness, has not started.
- Public beta is not authorized.
- Production rollout is blocked pending an approved production migration/rollback process and post-rollout verification.
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
- [x] Account saved-report deletion for resume analyses, JD matches, and career snapshots.
- [x] Protected backend account-deletion route with recent-authentication, least-privilege, stale-token, race, and cleanup evidence.

Preserve the scoring, proof, mission, Active Target, owner-partition, export, clearing, saved-report deletion, and account-deletion contracts recorded in the frozen documents.

## 3. Immediate next steps

- [x] Align repository documentation to the merged Block 5 checkpoint.
- [ ] Complete the one-to-two-day Brand & Domain Decision Gate.
- [ ] Create the bounded public-brand foundation only after a name and domain are selected.
- [ ] Re-run frozen Block 1–5 preservation checks for that public-brand change.
- [ ] Merge and synchronize the public-brand layer.
- [ ] Begin Block 6 only after the gate and preservation checks close.

## 4. Brand & Domain Gate

- [ ] Generate an initial shortlist.
- [ ] Select three finalists.
- [ ] Review domain availability and basic competitor, confusion, pronunciation, spelling, and trademark risk.
- [ ] Select one public name.
- [ ] Select one backup name.
- [ ] Reserve one usable domain.

The selected public name, backup, and domain are `Pending`. Reservation does not activate the domain. See [Brand & Domain Decision Gate](BRAND_DOMAIN_GATE.md).

## 5. Minimal public-brand foundation

- [ ] Add centralized public-brand configuration on a bounded branch.
- [ ] Change user-facing brand surfaces only.
- [ ] Preserve `skillmint:*` storage keys, TypeScript identifiers, repository/package names, environment-variable names, database/schema/function names, fixtures, commits, and frozen evidence.
- [ ] Preserve the premium light-first UI, responsive behavior, and accessibility.
- [ ] Confirm no scoring, mission, Active Target, ownership, export, deletion, schema, storage, auth, DNS, or production behavior changed.

## 6. Block 6: Privacy-safe Analytics + Founder Dashboard

- [ ] Define the minimum founder questions and event/data contract before implementation.
- [ ] Apply privacy, minimization, ownership, and retention review to every proposed event.
- [ ] Implement product-health visibility without exposing resume content, pasted JDs, credentials, or unnecessary personal data.
- [ ] Keep analytics separate from public product claims and from all scoring logic.
- [ ] Define QA for event correctness, duplication, consent/copy where required, and failure behavior.
- [ ] Evaluate privacy-safe aggregate `mission_started` and `mission_completed` events only after approving an event contract, minimization and retention rules, idempotency/duplication design, privacy review, and QA.

Mission events must not contain resume text, private mission content, email, raw identity, credentials, or tokens. They must not manipulate scores, treat a click as proof, or claim verified completion. Mission completion remains self-progress; evidence and scores change only after evidence changes and re-analysis detects them. This evaluation does not approve a provider, schema, transport, user-level reporting, public analytics, or account mission persistence.

Block 6 must not become a public analytics surface and must not overclaim beta readiness.

## 7. Block 7 and production blockers

- [ ] Inventory the actual production schema before any migration.
- [ ] Approve accountable ownership, backup/recovery, rollback, incident, and monitoring plans.
- [ ] Apply and exactly verify the locked schema sequence under production authorization.
- [ ] Verify server/public environment separation and absence of secrets from browser output.
- [ ] Verify and monitor the privacy/support contact; do not publish an invented address.
- [ ] Coordinate Vercel production branch, custom-domain mapping, Preview versus Production variables, `NEXT_PUBLIC_APP_URL`, allowed origins, Supabase Site URL, redirect allowlists, password-reset links, canonical URLs, and deletion-origin behavior.
- [ ] Run authorized production auth, resume, export, saved-report deletion, account-deletion, and smoke checks with a rollback path.
- [ ] Review provider backup/log retention claims and obtain legal review before making compliance or erasure promises.
- [ ] Complete final accessibility, responsive, copy, onboarding, and launch/no-launch review.

Domain activation belongs here, not in the Brand & Domain Gate. Public beta remains blocked until the release gate is explicitly approved.

## 8. Deferred until after Beta v1

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

## 9. Historical roadmap and completed sprint notes

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
