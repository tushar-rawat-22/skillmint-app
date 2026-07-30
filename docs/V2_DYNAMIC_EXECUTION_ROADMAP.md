# Version 2 Dynamic Execution Roadmap

This is a company-building sequence, not a feature quota. A phase may be preserved, revised, deferred, or removed as evidence develops; passing a build or a checklist is not enough. The common invariant is that no phase may weaken frozen Blocks 1–5, Block 7.1 owner isolation, truthful product language, owner partitions, allowlisted export, or separate deletion controls.

## Operating rules

Work proceeds through the four named product phases below. Phase 2 is complete at the engineering/deployment level; the Phase 3 inspection plus one bounded truth repair are complete; and the Phase 4 inspection plus one bounded upload-accessibility repair are complete while broader guided execution remains deferred. Phase 5A is a bounded launch-readiness subphase, not the optional capability described in roadmap Phase 5. Brand/domain screening and separately authorized launch-readiness work remain separate. Broad backend work, UI redesign, branding execution, AI assistant, applications, interview preparation, payments, and integrations remain outside the launch scope. A proposed exception needs a written dependency, an owner, a test plan, and a reason it cannot wait. The completed slices and read-only Production verification do not authorize authenticated Production data-flow work or controlled invitations.

Each phase uses the same decision rule: expand only when the evidence demonstrates repeatable value and safe operation; preserve when the smallest solution is working but evidence is incomplete; revise when users can articulate a correctable gap; defer when value or capacity is unproved; remove when the problem is not important enough to justify its privacy, support, or maintenance cost. On a failed assumption, stop new scope, preserve user data and frozen behavior, record the finding, and return to the smallest preceding usable state.

## Current 15-day controlled-launch sequence

SkillMint targets, but does not guarantee, a controlled hosted Production launch within 15 days. Phase 1 is complete, Phase 2 is operationally closed for engineering and deployment after merge through PR #26, the Phase 3 read-only inspection and bounded readiness-truth repair are complete after merge through PR #28, and the completed read-only Phase 4 inspection and bounded upload-accessibility repair are complete after merge through PR #30. Broader Phase 3 expansion is deferred pending recurring comprehension evidence, and broader Phase 4 guided-execution and onboarding work is deferred pending recurring controlled-user evidence. The next work is separately gated launch-readiness and controlled-user preparation, not another automatic Phase 4 runtime slice. Separately, screen the pending public brand and domain and prepare only authorized Production-readiness work.

Phase 5A engineering implementation is complete. It makes public registration default closed through the server-only `SKILLMINT_PUBLIC_SIGNUP_ENABLED` setting, preserves existing-user login, removes open-registration claims from the default runtime, and adds a second guard around signup submission. Supabase Auth's hosted **Allow new users to sign up** setting remains unverified and unchanged; the application gate does not replace it. Enabling registration, changing hosted configuration, controlled invitations, public launch, Production schema work, and migrations remain separately authorized gates. Merge or deployment alone does not authorize controlled access.

The Phase 3 read-only explainability architecture inspection completed without repository changes and returned `IMPLEMENT_A_BOUNDED_SLICE`. The accepted slice removed the unsupported numeric “Projected Readiness Path” without a replacement forecast. Initial pull-request CI run `30513546806` failed on a stale protected-fixture hash; the follow-up changed only that exact hash pin. Replacement pull-request CI run `30514124663` and main push CI run `30514466459` passed at merge commit `2f443d4c595e01523015aae3b9b2072eebfba9c6`. Vercel reported a successful Production deployment, and the general read-only Production smoke passed. Controlled-user invitations remain unauthorized, Production migrations remain unauthorized, and no hosted data-flow or launch action follows from this result.

The completed read-only Phase 4 inspection made no repository changes and returned `IMPLEMENT_A_BOUNDED_SLICE`. It found one demonstrated defect on the canonical upload surface: the hidden native input was not keyboard reachable, processing lacked status/live and busy semantics, visible failure lacked alert semantics, and the inaccurate drag-and-drop wording claimed an interaction that did not exist. The bounded upload-accessibility repair at implementation commit `0eb4cd94e1a5e642ab9dd6350bfa4153197dd45c` made the native input the keyboard-reachable native chooser and sole chooser authority, removed the inaccurate drag-and-drop wording with no drag-and-drop implementation, and added processing status and busy semantics plus failure alert semantics. It added no new onboarding state, telemetry, storage, or broad journey change. PR #30 merged at `6793c946de045d7c1fe3cf45e84d8ed25fe23d5f`; pull-request CI run `30522914931` passed against the reviewed head, and main push CI run `30523438736` passed at the merge commit. Vercel reported a successful Production deployment, the general read-only Production smoke passed, and the feature branch was removed locally and remotely.

Automated browser semantics do not prove identical screen-reader output, so real assistive-technology evidence remains pending. The Phase 4 Production smoke proved route availability only and was not authenticated functional accessibility validation. Controlled-user invitations remain unauthorized, Production migrations remain unauthorized, and no public-beta, analytics-activation, unrestricted-acquisition, or hosted data-flow authority follows from the bounded repair.

Real-user evidence has not been completed and remains required during controlled early access. It must assess comprehension of saved analyses, the account Workspace resume, and the browser-active report; repeat use; comparison decision value; score-chasing risk; accessibility; and onboarding confusion. That evidence may cause Phase 1 or Phase 2 to be preserved, revised, deferred, or removed; it is not market validation.

Invitations begin with approximately 20 users only after all mandatory Production, domain, SMTP, monitoring, rollback, security, privacy, legal, accessibility, operational-ownership, and support gates pass. Expansion toward 50, 100, and 200 users requires an explicit review of stability, comprehension, support load, and material privacy or security issues at each step. This target does not authorize unrestricted acquisition, payments, subscriptions, AI chat, résumé rewriting, auto-apply, job scraping, recruiter tools, institution dashboards, or unrelated feature expansion.

## 0. Supporting platform foundation — complete

**Objective.** Keep staging and Production independently scoped before Version 2 work.

**Evidence required.** The July 27, 2026 independently verified separation record: staging V1–V7 alignment and lint success; Preview compiled against staging; zero compiled Production-reference hits; no Production deployment or database contact.

**Smallest complete solution.** `skillmint-block6-test` is the Version 2 staging database and Preview receives only Preview-scoped public configuration; `skillmint-beta` remains Production-only.

**Dependencies and non-goals.** This phase is complete and precedes all implementation. It does not authorize migrations, deployments, or Production testing.

**Security, ownership, export, deletion, and tests.** Preserve environment scoping, secret absence from browser output, account ownership, and all data-control contracts. Re-run non-secret configuration-target and compiled-output checks only when a future authorized configuration change needs them.

**Stop condition and decision.** Any mixed target, Production reference in Preview output, pending staging migration, or unresolved lint error stops the affected work. Preserve the closure; revise only under separately authorized remediation. **Contingency:** suspend deployment-related activity and use local deterministic work until separation is re-proved.

## 1. Phase 1 — Resume Workspace — complete

**Objective.** Let a signed-in person deliberately identify one saved resume analysis as the account workspace selection without conflating it with browser-local active report state.

**Current evidence.** The July 28, 2026 Phase 1A local engineering gate passed clean V1–V8 replay, exact catalog/ACL/RLS and lifecycle probes, generated-type provenance, deterministic frozen-contract fixtures, repeated owner/race coverage, affected Chromium suites, and critical Firefox/WebKit paths. Phase 1B then applied and verified V8 only on isolated staging, passed hosted catalog and 18/18 rollback-contained behavior checks, proved the protected Preview targeted staging, and passed synthetic signed-in flows including a final 8/8 fresh-browser slice. Cleanup returned staging data to zero and revoked temporary credentials; Production was not contacted. Phase 1A and Phase 1B remain historical implementation and verification records, not current phase names. Real-user product evidence remains pending and moves into controlled early access.

**Smallest complete solution.** The architecture in [Resume Workspace v1 Architecture](RESUME_WORKSPACE_V1_ARCHITECTURE.md): one owner-enforced selection for a saved analysis, explicit set/change/clear actions, a cross-device prompt to use the selected account analysis, and no automatic browser activation.

**Dependencies and non-goals.** Depends on the completed platform foundation and frozen saved-analysis, storage, export, deletion, and owner-isolation contracts. It excludes resume editing, generated resumes, comparison, target/JD persistence, mission persistence, broad dashboard redesign, AI, payments, and integrations.

**Security and ownership checks.** Enforce same-owner selection at the database boundary, RLS, repository identity checks, owner/epoch/request-token stale guards, and browser partition preservation. Account A must not read, select, clear, delete, or publish Account B state.

**Export and deletion effects.** Account export must expose only a bounded active-analysis reference, never owner identifiers; browser export behavior remains unchanged. Deleting the selected saved analysis clears the account selection while preserving a local active report as local. Bulk saved-report and full account deletion must remove the selection safely.

**Tests.** Deterministic schema/RLS/repository/export/deletion fixtures; browser tests for explicit selection, clearing, cross-device offer, Account A/B switching, stale operations, selected-analysis deletion, browser reset, and accessibility.

**Stop condition and decision.** The isolated same-owner enforcement and synthetic Preview gates are satisfied, so Phase 1 is complete; Phase 2 subsequently reached engineering/deployment closure. During controlled early access, stop or revise if users misread the selection as a score change, a resume editor, or automatic cross-device dashboard replacement. Evidence may still cause Phase 1 to be preserved, revised, deferred, or removed. **Contingency:** retain saved history plus browser-local restore with no account selection.

## 2. Phase 2 — Resume Progress and Comparison — engineering/deployment closed

**Objective.** Help users compare truthful changes between selected saved analyses and understand progress without pretending that scores are a hiring forecast.

**Current evidence.** Core commit `02501543fdb39a7ad51d08a29adb15a175844f15`, UI commit `4f777b0e149bb148319c4c38cd1e9cb51d91e4e8`, and reviewed feature head `47f30a6300375ebdfeb48109a9ad6d82c3a67e39` merged through PR #26 at `17b1167d9d01ad2e30bc3ecbab55ddbbc93ef433`. Pull-request CI and main CI run `30469897446` passed. Vercel deployed the resulting `main` application, the general read-only Production smoke passed, and `/resume/compare` returned HTTP 200 with the expected visible heading. This is engineering/deployment closure, not authenticated Production data-flow or user validation. Authenticated Production comparison was not performed, hosted Production PostgREST pair and pagination behavior was not verified, and real-user comprehension and decision-value evidence remains pending. See [Version 2 Resume Progress and Comparison Architecture](V2_RESUME_PROGRESS_COMPARISON_ARCHITECTURE.md).

**Evidence required.** During controlled early access, establish whether people use comparison to make a useful improvement decision rather than merely chase a number, and whether comparison labels are understood. This evidence may revise, defer, or remove Phase 2, but its absence does not reopen the engineering/deployment closure.

**Smallest complete solution.** A bounded, side-by-side comparison of exactly two explicitly selected saved reports owned by the same account, derived deterministically from stored results, with saved-time context, truthful missing-version metadata, and evidence-first explanations.

**Dependencies and non-goals.** Depends on the completed Phase 1 workspace selection, immutable saved analyses, and frozen scoring semantics. No scoring-formula change, AI résumé rewriting, hiring-probability claim, social ranking, external validation, or persistent comparison history unless separately justified.

**Security and ownership checks.** Both comparison IDs must be same-owner, validated at query and publication time; stale/changed account contexts discard results. Do not expose raw resume data beyond current account authorization.

**Export and deletion effects.** Preserve current export, saved-report deletion, and protected account-deletion contracts. Export can continue to export source analyses; a derived comparison is not a new account record unless separately approved. Deleting either source invalidates or removes the comparison rather than retaining a misleading artifact.

**Tests.** The closure fixture preserves the full accepted Core behavior suite while pinning Core runtime paths to the accepted commit. Focused browser coverage exercises bounded selection, truncation disclosure, missing/malformed sources, owner and request races, logout, URL/storage/persistence preservation, keyboard and focus behavior, announcements, alerts, reduced motion, a 320-pixel viewport, and serious/critical Axe findings. CI remains Chromium-only; three critical flows remain available locally in Firefox and WebKit.

**Stop condition and decision.** Stop if comparison invites unsupported causal claims, creates score-chasing risk, or does not change a user's next action. Expand only with demonstrated decision value; otherwise preserve source history, revise the explanation, defer Phase 2, or remove comparison. **Contingency:** provide a non-persistent “what changed” view tied to exactly two explicit selections.

## 3. Phase 3 — Explainability — bounded truth repair complete; broader expansion deferred

**Objective.** Make existing deterministic signals easier to interpret and act on without changing frozen math or collapsing distinct concepts.

**Current evidence.** The read-only explainability architecture inspection completed without repository changes and returned `IMPLEMENT_A_BOUNDED_SLICE`. It identified one demonstrated truth defect: synthetic 30/60/90-day Career IQ gains in the unsupported numeric “Projected Readiness Path” implied that completing the next mission predicted score movement, contrary to the frozen rule that mission completion records self-progress and Career IQ changes only after evidence changes and later re-analysis detects them. The bounded implementation commit `2b772d8ccefd1f1484baa727e6f230318ab3288c` and reviewed head `98ec7eaa4dbbae824d48d6b29958c022cbe6a22e` merged through PR #28 at `2f443d4c595e01523015aae3b9b2072eebfba9c6`. Initial pull-request CI run `30513546806` failed because of a stale protected-fixture hash, and the follow-up changed only that exact hash pin. Replacement pull-request CI run `30514124663` and main push CI run `30514466459` passed. Vercel reported a successful Production deployment, and the general read-only Production smoke passed.

**Evidence required.** Any broader expansion requires recurring comprehension evidence from Phases 1–2 and proof that revised explanations improve correct interpretation of score, proof, role fit, and one-JD match. The absence of broader user evidence prevents further Phase 3 scope; it does not invalidate the completed truth repair.

**Smallest complete solution.** For the demonstrated defect, remove the unsupported forecast and preserve the current deterministic signals. The repair added no replacement forecast, probability, confidence range, timeline, estimated score gain, or future-readiness claim. Contextual explanations and evidence-first next actions that cite existing inputs, caps, freshness, and uncertainty remain candidates only if recurring comprehension evidence justifies them; Profile-fit Roles and Latest JD Match must remain separate.

**Dependencies and non-goals.** Depends on current scoring, proof, target, and JD contracts. No recalibration, model/LLM judgment, keyword stuffing advice, job guarantee, external proof verification, saved JD history, job board, or auto-application.

**Security and ownership checks.** Explanations operate only on the current owned/browser-active report and valid current JD context; stale results fail closed. Do not add telemetry that captures resume or JD content.

**Export and deletion effects.** Explanations are derived presentation, not a new source of truth; export and deletion retain their existing source-data contracts unless a bounded derived-data contract is separately approved.

**Tests.** Deterministic wording/data fixtures covering missing proof, scoring caps, stale JD, target isolation, and no-score-change invariants; browser comprehension/accessibility tests.

**Stop condition and decision.** The actual decision is to preserve the current deterministic signals after removing the unsupported forecast and defer broader explanation work until recurring comprehension evidence exists. Stop if an explanation increases overclaiming or cannot be tied to deterministic evidence. Expand only when comprehension improves without false confidence; otherwise preserve existing signals, revise copy, defer, or remove the addition. This bounded repair does not establish user comprehension, market validation, or broad Phase 3 value. **Contingency:** return to concise static trust copy and document the unresolved confusion.

## 4. Phase 4 — bounded upload-accessibility repair complete; broader guided execution deferred

**Objective.** Reduce first-session uncertainty and make the next truthful action apparent, while retaining the premium light-first system.

**Current evidence.** The completed read-only Phase 4 inspection made no repository changes and returned `IMPLEMENT_A_BOUNDED_SLICE`; it did not authorize a broad onboarding redesign. The demonstrated canonical upload defect combined a native input removed from keyboard interaction through `display:none`, missing processing status/live and busy semantics, missing failure alert semantics, and inaccurate drag-and-drop wording. The bounded upload-accessibility repair at implementation commit `0eb4cd94e1a5e642ab9dd6350bfa4153197dd45c` kept the native input as the keyboard-reachable native chooser and sole chooser authority, replaced the inaccurate drag-and-drop wording with accurate chooser copy, added processing status and busy semantics and failure alert semantics, and preserved retry plus successful `/resume` routing. No drag-and-drop implementation or new onboarding state was added.

PR #30, “Make resume upload keyboard accessible,” merged at `6793c946de045d7c1fe3cf45e84d8ed25fe23d5f`. Launch-hardening fixtures passed 30/30; Chromium launch-hardening passed 7/7; the focused regression passed 1/1 in Firefox and 1/1 in WebKit; and Chromium accessibility/responsive coverage passed 3/3. Affected authentication, ownership, Resume Workspace, and Resume Comparison suites, the CI offline-contract sequence, lint, and the 24-route Production build passed. Pull-request CI run `30522914931` passed against the reviewed head, and main push CI run `30523438736` passed at the merge commit. Vercel reported a successful Production deployment, the general read-only Production smoke passed, and local and remote branch cleanup completed.

**Evidence required.** Broader Phase 4 guided-execution and onboarding work is deferred pending recurring controlled-user evidence from funnel observation or moderated sessions that demonstrates repeated abandonment, processing-confidence, comprehension, or accessibility problems. Automated accessibility semantics do not substitute for real use: real assistive-technology evidence remains pending, and the Phase 4 Production smoke was not authenticated functional accessibility validation.

**Smallest complete solution.** Preserve the existing routes and hierarchy, correct the canonical upload interaction and status truth, and defer broader guidance. The completed slice made the native chooser keyboard reachable, used accurate chooser copy, kept processing indeterminate without fabricated percentages, and exposed bounded processing and failure semantics. It added no telemetry, storage, new onboarding state, or broad journey change.

**Dependencies and non-goals.** Depends on completed Phase 1–2 behavior, any separately authorized Phase 3 language, and existing accessibility/responsive foundations. Broader Phase 4 remains separately gated. It is not a redesign, gamification layer, AI coach, new backend program, applications tracker, interview prep suite, or payment funnel.

**Security and ownership checks.** Guided state stays owner-partitioned where personal; processing state does not reveal another account's data or publish stale work after a switch.

**Export and deletion effects.** Any persisted personal guidance state must join the storage registry and browser export/clear rules before release; no hidden account data may be created. Existing saved-report and account deletion behavior remains separate.

**Tests.** Deterministic state-transition fixtures; browser tests for processing failure/retry, owner switches, keyboard/focus/reduced motion, small screens, and truthful empty states.

**Stop condition and decision.** The demonstrated upload defect is repaired; preserve the existing routes and hierarchy and defer broader guidance. Stop if guidance masks uncertainty, requires a broad UI rewrite, or lacks recurring real-user evidence. Expand only with observed benefit; otherwise preserve hierarchy, revise one flow, defer, or remove. This bounded repair does not establish broad Phase 4 value, market validation, unrestricted Production readiness, or controlled-launch authorization. Controlled-user invitations remain unauthorized, and Production migrations remain unauthorized. **Contingency:** retain the current routes and the corrected static status/copy.

## Phase 5A — Controlled Access Foundation — engineering complete

**Objective.** Make the application truthfully closed to public account creation by default while preserving login for existing users.

**Current evidence.** The implementation adds a server-only `SKILLMINT_PUBLIC_SIGNUP_ENABLED` configuration that enables signup only for a trimmed, case-insensitive exact `true`. The closed signup route renders no form or enabled credential controls, collects no prospective-user data, and provides an existing-user login path. The shared auth submission service separately refuses disabled signup.

**Boundary.** This is a small application gate, not an invitation system, waitlist, authorization boundary, or substitute for Supabase Auth provider controls. The hosted **Allow new users to sign up** setting is unverified and unchanged and must be verified before controlled access is authorized. Existing-user login must remain enabled. Enabling registration, changing hosted configuration, controlled invitations, public launch, Production schema work, and migrations remain separately authorized gates. Merge or deployment alone does not authorize controlled access.

**Tests.** Deterministic configuration and submission fixtures cover default-closed parsing, enabled parsing, login continuity, zero disabled signup calls, sanitized failures, and server/client separation. Focused Chromium runs cover both closed and explicitly enabled runtime behavior.

**Stop condition and decision.** Do not merge if a signup entry point bypasses the guard, the server-only setting enters a client bundle, login regresses, closed copy invites applications or waitlist enrollment, or documentation implies hosted or Production readiness. Provider-level verification and Production schema inventory/rollout remain separate release gates.

## 5. One optional capability, selected by evidence

**Objective.** Test at most one capability that is demonstrably the next constraint after the four core slices.

**Evidence required.** Repeated demand from the intended cohort, a specific job-to-be-done, expected value greater than support/privacy cost, and an explicit reason every deferred alternative is lower priority.

**Smallest complete solution.** A written decision and one bounded capability experiment with success, safety, and removal criteria.

**Dependencies and non-goals.** Deferred beyond the controlled-launch target and dependent on evidence from Phases 1–4. No parallel AI assistant, applications suite, interview preparation, payment system, integration program, broad backend expansion, or redesign.

**Security and ownership checks.** Threat-model its data flow, owner boundaries, retention, abuse path, and stale work before implementation.

**Export and deletion effects.** Define allowlisted export, clear, saved-report deletion, and account deletion behavior before persistence. If this cannot be defined, do not store the data.

**Tests.** Capability-specific deterministic and browser tests proportionate to data sensitivity, plus preservation tests for frozen contracts.

**Stop condition and decision.** Stop if the evidence is ambiguous, value is one-off, or operation cost exceeds capacity. Expand, preserve, revise, defer, or remove by the common decision rule. **Contingency:** return to the core slices and retain the evidence as a future decision record.

## 6. Public brand and domain foundation — parallel screening

**Objective.** Screen the public identity in parallel with Phase 2 and reserve the selected domain early, without activating it.

**Evidence required.** Founder decision, name/domain availability and risk review, clear ownership, and a bounded inventory of public-facing surfaces.

**Smallest complete solution.** Keep `SkillMint` as the internal working name while the final public brand and domain remain pending. After founder selection and review, reserve one usable domain; connect it to Production only during the authorized launch-integration window. Internal identifiers remain unchanged.

**Dependencies and non-goals.** Screening may continue separately after Phase 2. Domain purchase, DNS, Vercel assignment, Supabase URL changes, SMTP configuration, authentication/origin changes, deployment, and Production configuration require separate explicit execution approval. No repository, package, storage, schema, migration, function, fixture, or environment-variable identifier is renamed merely because the public brand changes. The deliberate Version 2 UI and Information Architecture Foundation is not part of public-brand work.

**Security and ownership checks.** Preserve storage keys, cookies/session assumptions, trusted origins, identity copy, and account-deletion behavior; review phishing/confusion risk.

**Export and deletion effects.** Preserve existing file-format and ownership contracts; do not strand historical exports or deletion instructions behind a renamed surface.

**Tests.** Link, responsive, accessibility, frozen-contract, and configuration-boundary checks.

**Stop condition and decision.** Stop if legal/availability/operational ownership remains unclear. Expand only to the bounded foundation; otherwise preserve SkillMint internally, revise candidates, defer, or remove a candidate. **Contingency:** use the internal name in private work and postpone all public-facing work.

## 7. Version 2 UI and Information Architecture Foundation

**Objective.** Establish the Version 2 visual system and information hierarchy deliberately before the planned 100–200-user stage, using the selected public identity when one is available.

**Evidence required.** Founder-approved design direction, tested user comprehension of the core hierarchy, representative task flows, accessibility review, and a bounded inventory showing which current surfaces need visual-system or hierarchy changes.

**Smallest complete solution.** A separately authorized visual-system and information-hierarchy foundation applied to the core product surfaces and states needed for the Version 2 experience, with an explicit preservation matrix for functional behavior and trust contracts.

**Dependencies and non-goals.** Depends on the public brand/domain foundation when a public identity is selected, the completed core slices, and a separately approved design scope. It runs sequentially, not in parallel with backend implementation. It is not an application rewrite, backend implementation programme, scoring recalibration, AI assistant, applications/interview suite, payments work, integration programme, or parallel feature expansion.

**Security and ownership checks.** Preserve deterministic scoring, product truth, account isolation, browser owner partitions, stale-result guards, authentication, and all data contracts. A presentation change must not move business rules into components or alter data authority.

**Export and deletion effects.** Preserve browser and account export formats, owner visibility, Clear workspace boundaries, saved-report deletion, and protected account deletion. Any newly persisted presentation preference must be registered, owner-scoped where personal, export/clear-defined, and deletion-tested before release.

**Tests.** Run visual-regression coverage for representative core states, deterministic frozen-contract fixtures, browser ownership/export/deletion regressions, keyboard and visible-focus checks, semantic status/error checks, reduced-motion coverage, readable contrast, and narrow-screen responsive checks.

**Stop condition and decision.** Stop if the scope becomes an application rewrite, weakens a frozen functional contract, obscures product limits, or cannot satisfy accessibility/regression evidence. Expand only if the foundation improves comprehension and coherent navigation; otherwise preserve the Beta v1 visual baseline, revise the bounded design system, defer the gate, or remove a proposed change. **Contingency:** retain the existing light-first surfaces and apply only the smallest verified hierarchy correction.

## 8. Production-readiness gate

**Objective.** Decide whether a bounded invitation can operate safely; this is not a deployment command.

**Evidence required.** Authorized, independently reviewable proof for environment separation, migration and rollback plan, security/RLS, export/deletion, support/privacy operations, incident ownership, accessibility, monitoring, legal claims, and cohort support capacity.

**Smallest complete solution.** A written go/no-go with named owners, rollback conditions, support escalation, and only the minimum authorized Production actions.

**Dependencies and non-goals.** Depends on the selected slices, brand/domain foundation where public use requires it, and explicit operational authorization. No feature sprint, payments, mass acquisition, or claim of permanent readiness.

**Security and ownership checks.** Re-prove browser/server separation, account isolation, active-selection ownership, stale-result rejection, least privilege, and deletion execution under the authorized target.

**Export and deletion effects.** Verify real operation truthfully, including saved-report deletion distinct from account deletion and export failure behavior; never test destructively without authorization and rollback/containment.

**Tests.** Deterministic fixtures, controlled browser coverage, migration verification, non-secret compiled-output scans, and operational drills approved for the environment.

**Stop condition and decision.** Any unowned operational control, unproved recovery, privacy claim gap, or security failure is a no-go. Expand to invitations only on evidence; otherwise preserve staging, revise controls, defer, or remove the proposed launch scope. **Contingency:** continue private/staging research with no public users.

## 9. Staged invitation cohorts — 20 → 50 → 100 → 200

**Objective.** Learn safely from real use while keeping support and rollback capacity ahead of demand.

**Evidence required.** For each cohort, review activation, repeat use, task completion, confusion, support load, privacy/security incidents, outcomes where observable, and capacity before inviting the next group.

**Smallest complete solution.** Invite 20 people, then 50, then 100, then 200 only after an explicit cohort review; communicate that the service is early access and does not guarantee employment outcomes.

**Dependencies and non-goals.** Requires a passed Production-readiness decision. No automatic growth, viral loop, paid acquisition, monetization, or feature expansion merely because a cohort size was reached.

**Security and ownership checks.** Monitor owner-bound failures, access anomalies, data-control requests, stale results, and operational response; pause invitations immediately on credible privacy/security concern.

**Export and deletion effects.** Keep requests within tested operational capacity and measure fulfillment/failure truthfully; do not change data retention or deletion promises mid-cohort without explicit review.

**Tests.** Re-run targeted regression, accessibility, export/deletion, and operational checks before each increase; sample support-runbook execution.

**Stop condition and decision.** Stop at any cohort if harm, support load, weak retention, unresolved confusion, or security signals exceed defined capacity. Expand one cohort only with evidence; otherwise preserve size, revise, defer growth, or remove the invitation path. **Contingency:** freeze invitations, support existing users, and return to the slice that produced the observed failure.

## 10. Continued company scaling and future payments

**Objective.** Scale only where retained use and outcomes justify the cost, and consider payment only after value is established.

**Evidence required.** Cohort-level repeat usage, credible value/outcome evidence, support and delivery cost, retention, willingness-to-pay research, and legal/operational readiness. Do not infer willingness to pay from interest alone.

**Smallest complete solution.** Periodic evidence reviews that choose the next scale constraint; a separate monetization decision document before any payment implementation.

**Dependencies and non-goals.** Depends on stable cohort evidence. No payment, checkout, subscription, entitlement, pricing experiment, or hard paywall in this roadmap phase.

**Security and ownership checks.** Any future scale or monetization proposal starts with data minimization, abuse/fraud, access control, support, export, and deletion design; it does not inherit authorization from this roadmap.

**Export and deletion effects.** Preserve customer access to owned data and truthful deletion boundaries; payment data requires an independent contract and provider review.

**Tests.** Define tests only in the separately authorized proposal, including financial, ownership, export, deletion, and rollback coverage.

**Stop condition and decision.** Stop if evidence indicates low repeat value, unsustainable support cost, or weak willingness to pay. Expand only on durable evidence; otherwise preserve the current scale, revise the product, defer monetization, or remove the proposition. **Contingency:** keep the product free and narrow until the evidence changes.
