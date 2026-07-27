# Version 2 Transition Gate

**Founder decision date:** July 27, 2026
**Repository baseline:** `783e1837028b92cf1edbf29f4699acdaa50df9f8` on `main`

## Decision

The Beta v1 engineering foundation is preserved. Blocks 1–5 remain frozen, Block 6 remains completed engineering and isolated-verification work, and Block 7.1 remains the closed resume owner-isolation repair. This decision does not reinterpret, erase, or downgrade that work.

The former broad Beta v1 public-launch path is stopped as a strategic decision. It was not stopped because Blocks 1–7.1 failed. SkillMint will prepare a materially stronger Version 2 before inviting the planned 100–200-person early-access cohort. Public beta is not authorized by this gate.

The cohort is an early company operating stage, not the product's final scale. Further growth must follow observed user behavior, retention, user outcomes, operating capacity, and willingness-to-pay evidence. Payments, checkout, entitlements, subscriptions, and paywalls remain deferred until repeat use, feature value, support cost, retention, and willingness-to-pay evidence justify a monetization decision.

`SkillMint` remains the internal working name. The final public brand, logo, and domain are undecided. Internal identifiers, storage keys, schemas, fixtures, repository names, and frozen evidence must not be renamed before the later public-brand gate.

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

This gate authorizes documentation and bounded Version 2 preparation only. It does not authorize application implementation, the later Version 2 UI redesign, schema changes, migrations, dependency upgrades, production rollout, data access, payments, AI assistant work, applications tooling, interview preparation, integrations, branding execution, domain activation, deployments, commits, pushes, or pull requests.

## Authority hierarchy

For current sequencing and authorization, this document is the controlling founder decision, followed by the Version 2 dynamic roadmap and the relevant current implementation and frozen-contract documents. The Beta v1 roadmap, TODO entries, release guidance, and Block 7.1 closure retain their historical and verification value, but their former statement that Block 7.2 was the next active public-launch decision is superseded. A frozen product or security contract is not superseded unless a later explicit decision says so.
