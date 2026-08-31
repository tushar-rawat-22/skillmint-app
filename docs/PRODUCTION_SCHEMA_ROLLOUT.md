# Production Schema Rollout Authority

**Current decision:** `NO-GO`

This is the current authority for any future SkillMint Production schema rollout. It is a review and execution gate, not permission to execute SQL, change hosted Auth, enable analytics, invite users, alter account-level configuration, or perform a Production write.

## Current connected Production evidence

A fresh direct connected, read-only inspection of the canonical Supabase project `skillmint-beta` on August 31, 2026 supersedes the older July assumptions that Production was only V1+V2 and that migration history was unknown.

The observed Production migration history is exactly:

1. `20260723000100`
2. `20260723000200`
3. `20260723000300`
4. `20260723000400`
5. `20260723000500`
6. `20260723000600`
7. `20260723000700`
8. `20260727000750`
9. `20260727000800`
10. `20260730000900`

Production is therefore reconciled through **V9**. The repository migrations below remain **pending** in Production:

- `20260823001000_schema_v10_two_sided_beta_foundation.sql`
- `20260823001100_schema_v11_recruiter_evidence_review.sql`
- `20260829001200_schema_v12_account_persona_authority.sql`

The same read-only catalog inspection observed these seven ordinary `public` tables: `active_resume_selections`, `analytics_events`, `beta_feedback`, `career_snapshots`, `job_matches`, `profiles`, and `resume_analyses`. These names are consistent with the repository-controlled V1–V9 migration lineage; do not substitute later V10–V12 model names before those migrations are actually applied.

The live `public.rls_auto_enable()` contract was observed as present, owned by `postgres`, `SECURITY DEFINER`, with `search_path=pg_catalog`. Its attached enabled event trigger is `ensure_rls`, on `ddl_command_end`, for `CREATE TABLE`, `CREATE TABLE AS`, and `SELECT INTO`. That shape matches the exact contract guarded by the repository V9 migration. V9 remains an ACL normalization migration; it does not redefine the function body or trigger.

Direct catalog ACL inspection observed table-specific grants rather than an all-zero API-role ACL surface:

| Table | Observed direct API-role table ACLs |
| --- | --- |
| `active_resume_selections` | `authenticated=DELETE` |
| `analytics_events` | `service_role=INSERT` |
| `beta_feedback` | `authenticated=SELECT,INSERT`; `service_role=ALL` |
| `career_snapshots` | `authenticated=SELECT`; `service_role=ALL` |
| `job_matches` | `authenticated=SELECT,INSERT,UPDATE,DELETE`; `service_role=ALL` |
| `profiles` | `authenticated=SELECT,INSERT,UPDATE`; `service_role=ALL` |
| `resume_analyses` | `authenticated=SELECT,INSERT,DELETE`; `service_role=ALL` |

This table records only the observed direct table ACL entries. It does not by itself prove effective privilege after column grants, RLS, functions, role inheritance, or other PostgreSQL/Supabase authorization layers. Those boundaries must be verified through the exact preflight and postflight probes before migration authorization.

No Production writes were performed to obtain this evidence.

## Source of truth

Before any rollout work, fetch current `main` and re-read `supabase/migrations/manifest.json`. The manifest owns migration order and Production classification. This document records the operational gates around that sequence. If manifest, connected Production evidence, and this authority disagree, stop and repair the repository authority before any Production write.

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

Production is reconciled through V9, with **V10–V12 pending**. Never edit an applied migration in place. Recompute and compare hashes against the manifest before rehearsal or execution.

Provider signup, analytics activation, invitations, hosted Auth changes, SMTP, domains, billing, and account-level provider configuration remain separately authorized controls.

## Rehearsal evidence

PR #64 established the isolated repository-controlled migration rehearsal through V12. The harness covers absent, compatible, and incompatible V9 drift states and fails closed on incompatible state.

PR #73 added and passed bounded migration timing and lock-recovery verification against the isolated local Supabase path. It proves the current migration artifacts can fail within the tested lock bound and recover after contention is released. It does **not** prove Production write downtime or Production-representative data behavior.

Those rehearsals remain valid engineering evidence for unchanged migration/harness inputs. They do not substitute for Production recovery proof, live postflight verification, or explicit execution authorization.

## Remaining Production gates

| Control | Current verified state | Gate |
| --- | --- | --- |
| Migration history | Exact connected read-only history through V9 | V10–V12 remain pending |
| Public ordinary tables | Seven V1–V9 lineage tables observed | Re-check immediately before execution |
| Public table ACLs | Exact direct table ACL entries observed and recorded above | Verify expected effective privileges through RLS/column/function probes before and after execution |
| `public.rls_auto_enable()` | Present; owner `postgres`; `SECURITY DEFINER`; `search_path=pg_catalog` | Re-check exact body and attached trigger contract before execution and postflight |
| Event trigger | `ensure_rls`, enabled on `ddl_command_end` for `CREATE TABLE`, `CREATE TABLE AS`, `SELECT INTO` | Re-check before execution and postflight |
| Isolated migration rehearsal | V1–V12 transition rehearsal passed for current artifacts | Re-run after migration/harness changes |
| Lock/timing rehearsal | Bounded isolated lock failure and recovery passed on PR #73 | Production-representative V10–V12 data-shape/window evidence still required |
| Backups/recovery | No verified backup → isolated restore drill recorded | **Blocks every Production migration** |
| V10–V12 execution plan | Pending exact execution/postflight authorization | **Blocks migration** |
| Hosted Auth/security | Must preserve reviewed authentication/privacy boundaries | Must pass current preflight/postflight controls |
| Analytics | Disabled by current launch authority | Must remain disabled unless separately authorized |

Cost or schedule pressure does not waive recovery, security, privacy, or authorization gates.

## Backup and recovery prerequisite

No Production migration may begin until an accountable owner has a completed logical backup set and a successful isolated restore proof appropriate to the available Supabase plan and current data. A backup command by itself is not recovery evidence.

The recovery set must account for schema/database objects, required roles/grants, table data, and Auth identity/provider linkage implications. Backup files, credentials, connection strings, and user data must never enter Git, CI artifacts, application logs, email, or chat. Store backup material outside the repository with restricted access and record only sanitized metadata such as checksums, timestamps, tool versions, row-count comparisons, and pass/fail evidence.

The isolated restore drill must verify at minimum:

- expected migration/catalog state;
- row-count reconciliation without exposing row contents;
- ownership, constraints, functions and triggers;
- RLS and ACL boundaries;
- account ownership/deletion relationships;
- authentication/identity restoration implications;
- a documented discard path for the isolated recovery environment.

Until that drill succeeds, Production remains `NO-GO`.

## Narrow V10 → V12 pre-execution sequence

Before any maintenance window:

1. Fetch current `main`, migration manifest, exact migration hashes, this authority, and current status docs.
2. Re-run connected read-only Production preflight and require exact history through `20260730000900` with V10–V12 still absent.
3. Re-verify the seven observed V1–V9 `public` tables and the live V9 function/trigger/owner/search-path contract.
4. Re-verify direct ACLs and the effective RLS/column/function privilege checks required by postflight. Do not infer effective access from `relacl` alone.
5. Re-run the dedicated isolated migration and lock/timing gates for the exact unchanged migration/harness inputs intended for execution.
6. Complete Production-representative, non-sensitive data-shape/timing evidence sufficient to set an explicit abort threshold and maintenance-window bound for V10–V12.
7. Complete and pass the approved backup → isolated restore drill.
8. Review V10 default-private Proof Brief behavior, ownership, token-hash boundaries, RLS/ACL, deletion cleanup, and candidate persona assumptions.
9. Review V11 recruiter-review ownership, token consumption, candidate-feedback isolation, RLS/ACL, and deletion behavior.
10. Review V12 immutable Candidate/Recruiter persona authority and the application authorization assumptions that consume it.
11. Prepare postflight checks for authenticated Candidate and Recruiter test accounts, including Proof Brief publication/revocation, authorized recruiter review, structured feedback return, and negative cross-owner access cases.
12. Assign database, application, security/privacy, incident, and support ownership and obtain separate explicit Production migration authorization.

Any unresolved item keeps the decision at `NO-GO`.

## Production execution and postflight rules

Production writes and migrations require separate explicit authorization. When authorized, apply only the reviewed ordered V10 → V11 → V12 sequence. Before each step, verify target project, current migration history, catalog, and migration hash still match reviewed evidence.

Stop immediately on unexpected history, catalog drift, ownership/RLS/ACL mismatch, data anomaly, authentication regression, persona/Proof Brief/recruiter-review authorization failure, unexpected analytics activation, timeout/lock threshold breach, or incomplete postflight. Do not skip versions, reorder migrations, edit migration history to force progress, weaken RLS/ACL/Auth controls, or improvise destructive reverse migrations.

After V12, verify exact migration history through `20260829001200`, zero unexpected pending versions, normalized catalog definitions, owners, RLS/ACL, the V9 function and event trigger, login continuity, signup/registration boundaries, analytics still disabled, and the controlled Candidate/Recruiter flow against non-sensitive test accounts.

Redeploying an older application does not reverse schema. Resume after an incident only through an independently reviewed forward fix or an approved restoration plan.

## Next gate

The old V1+V2/unknown-history blocker is closed by the August 31 connected read-only migration-history evidence. Do **not** reopen collector development unless a future authorized inspection exposes a concrete missing field or incompatible catalog state.

The next launch-critical gate is a **verified backup → isolated restore/recovery proof**, followed by the remaining Production-representative V10–V12 window evidence and exact execution/postflight review. Production remains `NO-GO`; this reconciliation is not migration authorization.
