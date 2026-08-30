# Production Schema Rollout Authority

**Current decision:** `NO-GO`

This is the current authority for any future SkillMint Production schema rollout. It is a review and execution gate, not permission to contact Production, execute SQL, change hosted Auth, enable analytics, invite users, or alter account-level configuration.

## Source of truth

Before any rollout work, fetch current `main` and re-read `supabase/migrations/manifest.json`. The manifest owns migration order and Production classification. This document explains the operational gates around that sequence; if the two ever disagree, stop and repair the repository before touching Production.

The bounded July 30, 2026 inventory verified the `skillmint-beta` Production catalog as the exact V1+V2 versioned catalog baseline plus the known untracked `public.rls_auto_enable()` drift. Migration history is **unknown**, not absent, because the read-only inventory role could not see it. Complete table-grant visibility is **unknown** for the same reason. The function owner and event-trigger contract were not captured, and the function body was not captured either.

Provider signup is disabled and email login is enabled. Preserve both states. Analytics remains disabled. Public launch, invitations, hosted Auth changes, and analytics activation remain separately gated. Changing default function privileges was rejected as part of the V9 repair model. Migration duration and lock behavior against Production-representative data are still **unknown** even though the repository-controlled V1+V2 → V12 transition now passes in isolated CI.

## Current migration boundary

The repository manifest currently defines this exact ordered chain:

1. `20260723000100_schema_v1.sql`
2. `20260723000200_schema_v2_feedback.sql`
3. `20260723000300_schema_v3_data_controls.sql`
4. `20260723000400_schema_v4_account_deletion_security.sql`
5. `20260723000500_schema_v5_analytics_events.sql`
6. `20260723000600_schema_v6_analytics_aggregation.sql`
7. `20260723000700_schema_v7_analytics_acl_hardening.sql`
8. `20260727000750_lifecycle_function_acl_normalization.sql`
9. `20260727000800_schema_v8_active_resume_selections.sql`
10. `20260730000900_public_rls_auto_enable_acl_normalization.sql`
11. `20260823001000_schema_v10_two_sided_beta_foundation.sql`
12. `20260823001100_schema_v11_recruiter_evidence_review.sql`
13. `20260829001200_schema_v12_account_persona_authority.sql`

Production catalog evidence currently proves only V1+V2. The manifest classifies V3 through V12 as pending execution. No later migration may be described as applied to Production without direct Production catalog/history evidence.

V1–V12 are repository-controlled migration artifacts. Never edit an applied migration in place. Recompute and compare hashes against the manifest before rehearsal or execution.

## Isolated rehearsal evidence

PR #64 executed the repository-controlled V1+V2 → V12 migration rehearsal in an isolated local Supabase stack at reviewed head `bca0b234cf11bbf6d2796f0f69fcaa91499a347d`. The dedicated rehearsal workflow completed successfully before merge. The merged workflow and harness are now part of `main` at `f2c31da553135168a0ff74274cbd20afd4bba7e9`.

The rehearsal covers three bounded V9 states:

- `public.rls_auto_enable()` absent: V3–V12 apply successfully;
- exact-compatible V9 drift: V3–V12 apply successfully while preserving the object/event-trigger contract modeled by the harness and removing unintended API-role `EXECUTE`;
- incompatible V9 drift: migration fails closed before V10–V12 can be recorded as applied.

The harness also verifies the exact V1+V2 starting migration history and exact history through V12 for successful cases. It is deliberately local-only and requires an explicit destructive-local-reset confirmation.

This closes the repository-transition rehearsal gap. It does **not** prove the current Production migration history, grants, live V9 function body/owner/event-trigger contract, Production data shape, Production lock duration, backup integrity, restore viability, hosted Auth behavior, or end-to-end authenticated Production usability. Any migration artifact or rehearsal-harness change must trigger and pass the dedicated rehearsal again before merge.

## What the pending sequence changes

- **V3–V4:** data-control and account-deletion security foundations.
- **V5–V7:** privacy-safe analytics storage/aggregation plus ACL hardening. Applying schema does not authorize analytics collection.
- **V7.1:** lifecycle-function ACL normalization.
- **V8:** account-owned Resume Workspace selection state.
- **V9:** fail-closed ACL normalization for the known `public.rls_auto_enable()` drift. It must not redefine the function or event trigger.
- **V10:** two-sided beta foundation, including default-private Proof Brief storage and server-owned persona foundation.
- **V11:** recruiter evidence review persistence and its ownership/authorization contracts.
- **V12:** immutable account persona authority used by current Candidate/Recruiter authorization paths.

The application already contains runtime that expects the V10–V12 data model in environments where those migrations are applied. That does **not** prove Production has those objects. Until the Production sequence is explicitly authorized and verified, Production migration state remains `NO-GO`.

## Open Production gates

| Control | Verified state | Gate |
| --- | --- | --- |
| Production catalog | V1+V2 proven; V3–V12 pending by repository manifest | `NO-GO` until exact history/catalog reconciliation and approved execution |
| Isolated V1+V2 → V12 transition | Three-case repository rehearsal passed on PR #64 | Closed for current migration artifacts; must rerun if migration or harness inputs change |
| Migration history | Unknown to the read-only inventory role | `NO-GO` until an authorized operator establishes exact history |
| Table grants | Complete visibility not established | `NO-GO` until exact privileges are verified |
| `public.rls_auto_enable()` | Known untracked `SECURITY DEFINER` drift; full live contract/body not captured | `NO-GO` until read-only preflight proves the complete object contract |
| Provider signup | Disabled | Must remain disabled unless separately authorized |
| Existing email login | Enabled | Must remain enabled |
| Email confirmation | Auto-confirm enabled at last inventory | Requires explicit security/product review before broader access |
| CAPTCHA | Disabled | Requires abuse-control decision before broader access |
| Password minimum | 6 characters at last inventory | Requires explicit security review before broader access |
| Custom SMTP | Absent at last inventory | Required before controlled access under the current launch model |
| Database SSL enforcement | Disabled at last inventory | Requires an approved remediation decision |
| Backups | Zero verified backups at last inventory | Blocks every Production migration |
| PITR | Disabled on the Free plan at last inventory | Blocks migration unless an approved recovery plan compensates |
| Analytics | Disabled | Must remain disabled unless separately authorized |

Cost or schedule pressure does not waive recovery, security, or authorization gates.

## Backup and recovery prerequisite

No Production migration may begin until an accountable owner approves a completed and restorable logical backup set. At minimum it must cover:

- roles and required grants;
- schema and database objects;
- table data;
- auth-user preservation/restoration considerations, including provider and identity linkage constraints.

Backup files and user data must never enter Git, CI artifacts, application logs, email, or chat. Store them encrypted with restricted access. Record checksums, ownership, retention, and deletion. Rehearse restoration into an isolated recovery environment and verify row counts, ownership links, functions, triggers, RLS, grants, and authentication implications. A successful backup command without restore proof is not sufficient.

## Required pre-execution sequence

Before any maintenance window:

1. Re-fetch current `main`, migration manifest, migration hashes, this authority document, and the current launch/status docs.
2. Obtain authorized read-only Production visibility into migration history, complete table grants, and the full live `public.rls_auto_enable()` plus attached event-trigger contract. Do not print credentials or secret URLs.
3. Reconcile history and catalog against the proven V1+V2 baseline. Do not infer migration history from schema similarity.
4. Confirm the dedicated V1+V2 → V12 rehearsal is green for the exact unchanged migration/harness inputs intended for execution. The current repository state has passed this control; rerun it after any relevant change.
5. Verify the live V9 function body separately because V9 intentionally does not inspect or redefine it.
6. Verify V10 default-private Proof Brief behavior, owner constraints, token-hash boundaries, and account-deletion cleanup against the execution candidate.
7. Verify V11 recruiter-review ownership, token-consumption, and candidate-feedback isolation against the execution candidate.
8. Verify V12 immutable persona constraints and the Candidate/Recruiter authorization assumptions used by the application against the execution candidate.
9. Measure migration duration, lock behavior, and the V3 partial-application risk against an isolated Production-representative dataset. Publish the measured maintenance-window estimate; the estimate is currently unknown.
10. Complete and pass a restore drill from the approved backup set.
11. Assign incident commander, database operator, application owner, security/privacy owner, and communications/support ownership before execution.
12. Review exact SQL, hashes, abort thresholds, postflight worksheet, rollback/forward-fix decision tree, and user communications.

Any unresolved item keeps the decision at `NO-GO`.

## Production execution rules

Production writes and migrations require separate explicit authorization. When authorized, apply one ordered migration at a time. Before each step, verify that target, current history, catalog, and migration hash still match the reviewed evidence.

Stop immediately on any unexpected state. Do not skip versions, reorder migrations, edit migration history to force progress, or weaken RLS/ACL/Auth controls to get through the window.

### V3–V4 postflight

Verify account ownership, deletion cascade/cleanup, lifecycle-function contracts, RLS, grants, constraints, indexes, and service-only operations exactly match the migration contracts.

### V5–V7.1 postflight

Verify analytics tables remain unavailable to browser roles except where explicitly designed; service-role grants remain least privilege; lifecycle function ACLs match frozen contracts; and analytics collection is still disabled at the application/hosted configuration layers.

### V8 postflight

Verify Resume Workspace selections remain owner-qualified and separate from browser-active report state, with exact RLS and grants and correct account-deletion cleanup.

### V9 postflight

If `public.rls_auto_enable()` is absent, confirm it stayed absent. If present, verify its identity, body, owner, `SECURITY DEFINER` state, return type, pinned search path, and attached event-trigger definition are unchanged while `PUBLIC`, `anon`, `authenticated`, and `service_role` have no effective `EXECUTE`.

### V10 postflight

Verify `account_personas` and `proof_briefs` match exact owner/RLS/ACL/constraint contracts; Proof Briefs are private by default; browser roles cannot directly mutate server-owned publication fields; shared lookup exposes only the reviewed link-only surface; and account deletion removes dependent records.

### V11 postflight

Verify recruiter evidence review tables/functions match their exact ownership, RLS, grants, constraints, token-consumption semantics, candidate ownership, and account-deletion behavior. Confirm no recruiter path gains direct access to private candidate data outside the reviewed evidence surface.

### V12 postflight

Verify account persona authority is one immutable server-owned Candidate/Recruiter choice per account and that browser/API roles cannot bypass the reviewed creation/consumption model. Exercise Candidate-only resume extraction, Proof Brief operations and feedback reads, plus Recruiter-only evidence review, against controlled non-sensitive test accounts.

After V12, verify exact migration history through `20260829001200`, zero unexpected pending versions, normalized catalog definitions, RLS/ACL/owner checks, application health, error rates, login continuity, signup still disabled, and analytics still disabled.

## Rollback and abort authority

Redeploying an older application does not reverse schema. Do not drop user data, edit applied SQL, erase migration history, or improvise destructive reverse migrations.

- Before the first migration, any failed gate means abort with no schema change.
- A transactional migration failure should roll back that migration; re-verify catalog/history before deciding whether to resume.
- A partial V3 failure, incompatible live object, ownership/RLS/ACL mismatch, data anomaly, authentication regression, persona/Proof Brief/recruiter-review authorization failure, unexpected analytics activation, or incomplete postflight means stop and open an incident.
- Resume only through an independently reviewed forward fix or an approved restoration plan.
- Pause application writes/access when required to protect consistency. Keep signup and analytics disabled.

The incident commander owns the stop/resume decision with database, security/privacy, and product approval.

## Next gate

The next legitimate gate is **not** a Production migration. The repository-transition rehearsal is now green for the current V1–V12 artifacts. The critical path is a fresh read-only Production inventory with enough privilege to establish exact migration history, complete table grants, and the full live V9 drift contract; then Production-representative timing/lock verification and a verified backup → restore drill. Production remains `NO-GO` until those results are reviewed and explicitly authorized.
