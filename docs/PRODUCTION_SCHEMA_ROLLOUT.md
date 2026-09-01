# Production Schema Rollout Authority

**Current decision:** `NO-GO` — exact-version execution transport pending

This is the current authority for SkillMint Production schema rollout. It is a review and execution gate. It does not authorize signup/invitations, analytics activation, hosted Auth changes, SMTP, domains, billing, or public beta release.

## Current connected Production evidence

Fresh connected read-only inspection on September 1, 2026 reconfirmed the canonical Supabase project `skillmint-beta` is healthy and migration history is exactly:

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

Production is reconciled through **V9**. The repository migrations below remain **pending** in Production:

- `20260823001000_schema_v10_two_sided_beta_foundation.sql`
- `20260823001100_schema_v11_recruiter_evidence_review.sql`
- `20260829001200_schema_v12_account_persona_authority.sql`

The same live lineage contains the seven ordinary `public` tables `active_resume_selections`, `analytics_events`, `beta_feedback`, `career_snapshots`, `job_matches`, `profiles`, and `resume_analyses`.

The live `public.rls_auto_enable()` contract remains present, owned by `postgres`, `SECURITY DEFINER`, with `search_path=pg_catalog`. Its attached enabled event trigger is `ensure_rls`, on `ddl_command_end`, for `CREATE TABLE`, `CREATE TABLE AS`, and `SELECT INTO`. That shape matches the repository V9 contract.

Direct catalog ACL inspection previously observed table-specific grants rather than an all-zero API-role ACL surface:

| Table | Observed direct API-role table ACLs |
| --- | --- |
| `active_resume_selections` | `authenticated=DELETE` |
| `analytics_events` | `service_role=INSERT` |
| `beta_feedback` | `authenticated=SELECT,INSERT`; `service_role=ALL` |
| `career_snapshots` | `authenticated=SELECT`; `service_role=ALL` |
| `job_matches` | `authenticated=SELECT,INSERT,UPDATE,DELETE`; `service_role=ALL` |
| `profiles` | `authenticated=SELECT,INSERT,UPDATE`; `service_role=ALL` |
| `resume_analyses` | `authenticated=SELECT,INSERT,DELETE`; `service_role=ALL` |

This table records only observed direct table ACL entries. It does not by itself prove effective privilege after column grants, RLS, functions, role inheritance, or other PostgreSQL/Supabase authorization layers. Those boundaries remain mandatory preflight/postflight checks.

No Production writes were performed to obtain the September 1 drift evidence.

## Source of truth

Before rollout work, fetch current `main` and re-read `supabase/migrations/manifest.json`. The manifest is authoritative for migration file order, paths, and hashes. Its older `generated_for.production` classification text is stale where it still describes V3–V9 as pending or Production history as unknown; connected Production evidence plus this authority govern applied/pending state until that manifest metadata is deliberately reconciled with its fixtures.

If migration order/hashes, connected Production evidence, and this authority disagree, stop before any Production write.

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

Provider signup, analytics activation, invitations, hosted Auth changes, SMTP, domains, billing, and account-level provider configuration remain separately controlled.

## Superseded July evidence record

The statements in this section are retained only to preserve the historical evidence contract and must not be used as current rollout facts. The July inventory described an `exact V1+V2 versioned catalog baseline plus the known untracked` drift, said migration `history is **unknown**, not absent`, and said `table-grant visibility is **unknown**`. It also recorded that the `function owner and event-trigger contract were not captured` and that the function body had not been captured.

That same July record said: `Provider signup is disabled and email login is enabled`, `Analytics remains disabled`, `Public launch, invitations` and hosted configuration changes were not authorized, and `Changing default function privileges was rejected`. It also stated `The expected write downtime is **unknown**` because Production-representative timing had not been measured. The August 31 and September 1 connected evidence supersede those catalog/history visibility limits; hosted Auth or operational settings must still be freshly verified before execution rather than assumed from this historical note.

Backup files and user data must never enter Git, CI artifacts, application logs, email, or chat.

## Rehearsal and recovery evidence

PR #64 established the isolated repository-controlled migration rehearsal through V12. The harness covers absent, compatible, and incompatible V9 drift states and fails closed on incompatible state.

PR #73 added and passed bounded migration timing and lock-recovery verification against the isolated local Supabase path. It proves the current migration artifacts can fail within the tested lock bound and recover after contention is released.

On September 1, 2026, a real-host recovery session against exact application main `ce1677d6b9a526662a7032039620c0c9ef521270` completed the required recovery proof without putting backup contents or credentials in Git, CI, email, or chat. The session:

- verified Production target identity and V9 migration history read-only;
- created an owner-only logical Production backup outside Git and recorded a checksum privately;
- restored that backup into an isolated environment;
- reconciled row counts without exposing row contents;
- verified ACL/RLS, functions, triggers, deletion relationships, and recovery implications;
- replayed migration and rollback behavior against the restored state; and
- measured representative V10→V12 completion at **2.66 seconds**.

For the exact recovery inputs and unchanged V10–V12 artifacts, **backup → isolated restore/recovery is PASSED**. Do not repeat it without changed inputs, fresh drift, or a concrete defect.

This recovery result does not authorize beta release. Public privacy/support contact monitoring and other release-only gates remain separate from schema execution.

## Remaining Production gates

| Control | Current verified state | Gate |
| --- | --- | --- |
| Migration history | Exact connected history through V9 reconfirmed September 1 | V10–V12 remain pending |
| Public ordinary tables | Seven V1–V9 lineage tables | Re-check immediately before execution |
| Public table ACLs | Recorded direct ACL matrix plus prior effective probes | Re-check effective RLS/column/function privileges before and after execution |
| `public.rls_auto_enable()` | Present; owner `postgres`; `SECURITY DEFINER`; `search_path=pg_catalog` | Re-check exact contract before execution and postflight |
| Event trigger | `ensure_rls`, enabled on `ddl_command_end` for `CREATE TABLE`, `CREATE TABLE AS`, `SELECT INTO` | Re-check before execution and postflight |
| Isolated migration rehearsal | V1–V12 transition rehearsal passed | Re-run only after migration/harness changes or material drift |
| Lock/timing rehearsal | Bounded lock failure/recovery passed; real-host representative V10→V12 completed in 2.66s | Set abort threshold from reviewed evidence and stop on breach |
| Backups/recovery | Real-host logical backup → isolated restore drill passed September 1 | **PASSED for unchanged evidence set** |
| V10 persona boundary | Pending V10 denies authenticated persona writes; server/service-role owns assignment | Re-check exact V10 hash before execution |
| V10–V12 execution authority | Founder authorized reviewed rollout after all execution gates are green | Authority exists; exact-version execution transport still required |
| Hosted Auth/security | Reviewed boundaries must remain unchanged | Fresh preflight/postflight required |
| Analytics | Must remain disabled unless separately authorized | Verify before and after execution |

Cost or schedule pressure does not waive recovery, security, privacy, or authorization gates.

## Exact-version execution transport requirement

The remaining schema blocker is operational, not conceptual: the execution path must preserve the repository migration versions `20260823001000`, `20260823001100`, and `20260829001200` exactly.

Do **not** use a migration mechanism that generates new remote-only migration timestamps. In particular, the currently available Supabase MCP `apply_migration` action does not expose a version parameter and may generate its own server-side migration timestamp. Using that path would create migration-history drift against the repository files and would violate the no-history-repair rule.

Acceptable execution must therefore use the reviewed repository migration files through a mechanism that records their existing versions exactly, such as the pinned Supabase CLI `db push` path from a trusted environment with the existing linked Production credentials. Do not copy secrets into GitHub Actions or chat merely to make the transport convenient.

Never apply the SQL with `execute_sql` and then manually insert or repair migration-history rows. Migration history must be produced by the legitimate migration mechanism, not edited to force progress.

## Narrow V10 → V12 pre-execution sequence

Immediately before the maintenance window:

1. Fetch current `main`, migration manifest, exact V10/V11/V12 hashes, this authority, and current status docs.
2. Require exact Production target `skillmint-beta` and exact history through `20260730000900`, with V10–V12 absent.
3. Re-verify the seven V1–V9 `public` tables and the V9 function/trigger/owner/search-path contract.
4. Re-verify direct ACLs and effective RLS/column/function privilege probes; do not infer effective access from `relacl` alone.
5. Require recovery evidence still applicable to the unchanged migration/harness/data-shape inputs. If those inputs changed materially, repeat the recovery proof before writing.
6. Recompute the exact V10, V11, and V12 hashes and require manifest equality.
7. Review V10 default-private Proof Brief behavior, ownership, token-hash boundaries, RLS/ACL, deletion cleanup, and server-owned persona assignment.
8. Review V11 recruiter-review ownership, token consumption, candidate-feedback isolation, RLS/ACL, and deletion behavior.
9. Review V12 immutable Candidate/Recruiter persona authority and the application authorization assumptions that consume it.
10. Set an explicit lock/timing abort threshold from the reviewed 2.66-second representative evidence and prior bounded lock rehearsal.
11. Confirm analytics remains disabled and hosted Auth/security boundaries match the reviewed state.
12. Use only an execution transport that records the existing V10/V11/V12 migration versions exactly.

Any unresolved execution item keeps the schema decision at `NO-GO`.

## Rollback contract

Before the first Production write, record the maintenance-window rollback contract in the operator session:

- **Change:** apply only V10 → V11 → V12, in order, from the exact reviewed repository bytes.
- **Success:** each exact version appears once in migration history; postflight catalog/RLS/ACL/function/trigger/Auth checks pass; analytics remains disabled.
- **Abort:** unexpected history/catalog drift, hash mismatch, lock/timing threshold breach, data anomaly, ownership/RLS/ACL mismatch, Auth regression, persona/Proof Brief/recruiter-review authorization failure, unexpected analytics activation, or incomplete postflight.
- **Rollback:** stop forward writes immediately and use the verified recovery artifact/isolated-restore procedure when state compatibility requires database restoration. An older Vercel deployment does not reverse schema.
- **Caveat:** once application/user writes rely on V10–V12, code rollback alone is not state rollback. Recovery decisions must account for data created under the new schema.

## Production execution and postflight rules

Founder authorization dated September 1, 2026 permits the reviewed V10 → V11 → V12 Production rollout once all documented execution gates above are freshly green. Do not request routine migration permission again when those gates pass.

Before each migration, verify target project, current migration history, and exact artifact hash. Apply only V10 → V11 → V12 in order and stop immediately on any anomaly.

After V12, require:

- exact migration history through `20260829001200` with no unexpected versions;
- expected new tables, constraints, indexes, triggers, functions and owners;
- RLS enabled on every new exposed-schema table;
- authenticated users unable to insert/update/delete `account_personas`;
- service-role persona assignment path preserved;
- V12 persona identity immutability trigger present;
- default-private Proof Brief behavior and revocation contract preserved;
- recruiter role-map and structured-review ownership boundaries preserved;
- V9 `rls_auto_enable()` and `ensure_rls` event-trigger contract unchanged;
- existing login continuity and reviewed signup/registration boundary unchanged;
- analytics still disabled; and
- no unexpected pending migration versions.

Controlled beta remains **CLOSED** after schema postflight until release-only gates, including a verified durably monitored privacy/support contact, are satisfied. The schema rollout and beta release are separate decisions.

## Next gate

Recovery is no longer the blocker for the unchanged evidence set. The immediate schema gate is an **exact-version V10→V12 execution transport** plus the final narrow drift/hash/Auth/RLS preflight.

The public privacy/support contact remains a **controlled-beta release blocker**, not a database migration execution gate. Do not invent an address and do not open invitations merely because schema postflight succeeds.