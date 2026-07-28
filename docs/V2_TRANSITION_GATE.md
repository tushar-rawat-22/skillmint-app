# Version 2 Transition Gate

**Founder decision date:** July 27, 2026
**Repository baseline:** `783e1837028b92cf1edbf29f4699acdaa50df9f8` on `main`

## Decision

The Beta v1 engineering foundation is preserved. Blocks 1–5 remain frozen, Block 6 remains completed engineering and isolated-verification work, and Block 7.1 remains the closed resume owner-isolation repair. This decision does not reinterpret, erase, or downgrade that work.

The former broad Beta v1 public-launch path is stopped as a strategic decision. It was not stopped because Blocks 1–7.1 failed. SkillMint will prepare a materially stronger Version 2 before inviting the planned 100–200-person early-access cohort. Public beta is not authorized by this gate.

The cohort is an early company operating stage, not the product's final scale. Further growth must follow observed user behavior, retention, user outcomes, operating capacity, and willingness-to-pay evidence. Payments, checkout, entitlements, subscriptions, and paywalls remain deferred until repeat use, feature value, support cost, retention, and willingness-to-pay evidence justify a monetization decision.

`SkillMint` remains the internal working name. The final public brand, logo, and domain are undecided. Internal identifiers, storage keys, schemas, fixtures, repository names, and frozen evidence must not be renamed before the later public-brand gate.

## Founder sequencing amendment — July 28, 2026

SkillMint will target a controlled hosted Production launch within 15 days. This is a sequencing target, not a guarantee of completion, proof of unlimited scale, or a claim of permanent Production readiness. The sequence is:

1. Treat Phase 1 — Resume Workspace as complete and begin Phase 2 — Resume Progress and Comparison immediately.
2. Build the smallest complete, owner-safe comparison of exactly two explicitly selected saved analyses.
3. Add only the minimum Phase 3 — Explainability needed to make comparison truthful and useful.
4. Add only the minimum Phase 4 — Guided execution and onboarding work needed for launch.
5. Complete the separately authorized Production-readiness, domain, SMTP, monitoring, rollback, security, accessibility, privacy, legal, operational-ownership, and support gates.
6. Invite a controlled cohort of approximately 20 users.
7. Expand toward 50, 100, and 200 users only after reviewing stability, comprehension, repeat use, comparison decision value, support load, and material privacy or security issues.

This amendment supersedes only the former rule that real-user evidence must be reviewed before Phase 2 implementation may begin. It does not claim that the evidence requirement was completed or that SkillMint has market validation. During controlled early access, evidence may still cause Phase 1 or Phase 2 to be preserved, revised, deferred, or removed. The review must continue to evaluate comprehension of saved analyses, the account Workspace resume, and the browser-active report; repeat use; comparison decision value; score-chasing risk; accessibility; and onboarding confusion.

Phase 2 remains bounded to deterministic comparison derived from already stored analysis results for exactly two explicitly selected saved analyses owned by the same account. It does not change a scoring formula, create AI résumé rewriting, imply hiring probability, add social ranking, or persist comparison history unless that persistence is separately justified. Source deletion must truthfully invalidate or remove the comparison. Account-switch and stale-result safety, export, saved-report deletion, and protected account-deletion contracts remain mandatory.

Before any invitation, the controlled-launch gate still requires reviewed Production migration and rollback, Production environment separation, correct authentication and password-recovery URLs, custom SMTP, abuse and rate controls, logging and monitoring, a backup and recovery decision, operational and support ownership, privacy and legal review, security and accessibility checks, and controlled Production smoke testing. Public unrestricted acquisition, payments, subscriptions, AI chat, résumé rewriting, auto-apply, job scraping, recruiter tools, institution dashboards, and unrelated feature expansion remain deferred.

Brand and domain screening will run in parallel with Phase 2. `SkillMint` remains the internal working name; the final public brand and domain remain pending. The selected domain should be reserved early and connected to Production only during the authorized launch-integration window. A public-brand change must not rename repository, package, storage, schema, migration, function, fixture, or environment-variable identifiers. Domain purchase, DNS, Vercel assignment, Supabase URL changes, and SMTP configuration each require separate explicit execution approval.

## Environment closure and operational boundary

Environment separation was completed and independently verified on July 27, 2026. Vercel project `skillmint-app` has Production-only Production URL and publishable-key configuration, and Preview-only Preview URL and publishable-key configuration. Production Supabase is `skillmint-beta` (`iylxqtpnhgckdbomfvtz`); Version 2 staging Supabase is `skillmint-block6-test` (`fowxrrgntlsgyyuoiesx`). Vercel Production environment-variable records were re-scoped to Production-only while preserving the Production target. The live Production deployment was not redeployed or changed, and the Production Supabase database was not contacted or changed.

The staging migration, dry-run, and hosted-database lint evidence is `08-v2-staging-verification.txt`, SHA-256 `0be7d87e3f34b877b412c2ddc73a397dacfeb07e071725a3a28fc16f08585d99`. The compiled Preview evidence is `08-v2-preview-compiled-verification.txt`, SHA-256 `7cebb9bed5bcf8f8427b7bb4ce850c23b5ea01b7b2be7fc3d00a1528ab44bbd0`; it records the Preview target and compiled-output checks, not migration history or database lint. This is a documented closure, not authority for a migration, deployment, setting change, Production activation, or hosted-service contact. This repository task does not open either external report.

## Non-negotiable constraints

- Product truth remains intact: Career IQ is not hiring probability; Proof Confidence is resume-internal evidence support, not external verification; missing proof is unverified, not false.
- Profile-fit Roles and Latest JD Match remain separate. Active Target changes focus, never scores; stale JD results cannot appear current; missions do not create proof or alter scores automatically.
- Account A data must never create Account B rows, bearer/row ownership, browser partitions, or visible reports. Delayed work started for A may finish only as A.
- Anonymous, account, and browser-owner partitions remain distinct. Account history does not silently become a browser's active report. Clear workspace is browser-only.
- Export remains allowlisted, bounded, owner-checked, and fail-closed. Saved-report deletion, browser clearing, and protected backend account deletion remain separate operations with truthful outcomes.
- Applied migrations and frozen verification records are immutable evidence. Future schema correction uses a reviewed forward migration and regenerated local types; no migration-history rewrite is authorized.
- Beta v1's premium light-first visual system remains the preserved baseline. A later explicit Version 2 UI and Information Architecture gate may supersede visual presentation only; functional, truth, privacy, ownership, export, deletion, and accessibility contracts remain preserved.

## What this gate does not authorize

The original July 27 gate authorized documentation and bounded Version 2 preparation only. The July 28 amendment makes bounded Phase 2 implementation the next authorized product work and records the minimum Phase 3 and Phase 4 sequence required for launch; it grants no broader execution authority. It does not itself authorize schema changes, migrations, dependency upgrades, Production rollout, hosted-service access, branding execution, domain purchase or activation, DNS, authentication-origin changes, SMTP configuration, deployments, payments, AI assistant work, applications tooling, interview preparation, integrations, commits, pushes, or pull requests. Those actions retain their existing separate approval and verification requirements.

## Authority hierarchy

For current sequencing and authorization, this document is the controlling founder decision, followed by the Version 2 dynamic roadmap and the relevant current implementation and frozen-contract documents. The Beta v1 roadmap, TODO entries, release guidance, and Block 7.1 closure retain their historical and verification value, but their former statement that Block 7.2 was the next active public-launch decision is superseded. A frozen product or security contract is not superseded unless a later explicit decision says so.
