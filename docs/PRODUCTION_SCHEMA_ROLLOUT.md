# Production Schema Rollout Authority

**Current decision:** `V1–V15 VERIFIED; V16 NOT AUTHORIZED` — the V16 technical preflight/recovery gate is ready for a separate founder decision; V16 remains repository-pending and unapplied; SkillMint is launched with controlled account admission

This is the current authority for SkillMint Production schema rollout. No separately verified dated approval authorizes V16 Production execution. This document records the prerequisites for a future, separately approved rollout; satisfying them does not grant execution authority. Any approval must identify the exact V16 artifact and merged `main` SHA, Production target, operator and maintenance window, abort/recovery contract, and required postflight. It must not authorize any other migration, analytics activation, hosted Auth changes, SMTP, domains, billing, or ungated account provisioning.

## Latest recorded connected Production evidence

Independent read-only evidence dated October 15, 2026 reconfirms the canonical Supabase project `skillmint-beta` as healthy with this Production migration history. It also reconfirms V16 absent, the expected relevant function/ACL state, and no material drift against the repository recovery contract:

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
11. `20260823001000`
12. `20260823001100`
13. `20260829001200`
14. `20260911001300`
15. `20260911001350`
16. `20260912001400`

Production migration history is reconciled through **V15**, including the later-timestamped V14 candidate lifecycle migration. V10–V12 were applied during the September 2 maintenance window; V13 was applied later as the access-request release; V15 was applied during the bounded OAuth deletion rollout; V14 was subsequently applied and catalog-verified. Only V16 remains unapplied:

- `20260823001000_schema_v10_two_sided_beta_foundation.sql`
- `20260823001100_schema_v11_recruiter_evidence_review.sql`
- `20260829001200_schema_v12_account_persona_authority.sql`
- `20260911001300_schema_v13_access_requests.sql`
- `20260911001350_schema_v15_oauth_deletion_reauthentication.sql` — applied and catalog-verified in Production
- `20260912001400_schema_v14_candidate_job_lifecycle.sql` — applied and catalog-verified in Production
- `20261013184117_proof_brief_share_expiry.sql` — repository-pending and unapplied

The same recorded lineage contains fourteen ordinary `public` tables: the seven V1–V9 tables plus `account_personas`, `proof_briefs`, `recruiter_role_evidence_maps`, `candidate_evidence_reviews`, `access_requests`, `oauth_deletion_reauth_intents`, and `candidate_job_lifecycle`. The connected inspection recorded every ordinary `public` table with RLS enabled and `analytics_events` as force-RLS with no authenticated table access.

That inspection also recorded `public.rls_auto_enable()` as present, owned by `postgres`, `SECURITY DEFINER`, with `search_path=pg_catalog`. Its attached enabled event trigger was `ensure_rls`, on `ddl_command_end`, for `CREATE TABLE`, `CREATE TABLE AS`, and `SELECT INTO`. That shape matches the repository V9 contract.

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

The September 2 execution used pinned Supabase CLI `2.109.1` and repository migration bytes. Each migration was exposed, hash-checked, dry-run, applied, and postflight-verified separately. The resulting remote migration versions match the repository versions exactly; a final dry run reported the remote database up to date.

No backup contents, credentials, row contents, or user identifiers were recorded in this authority. Transaction-scoped behavioral postflight created only synthetic rows inside a single rollback-bound transaction and verified that zero synthetic users or application rows persisted.

## Source of truth

Before rollout work, fetch current `main` and re-read `supabase/migrations/manifest.json`. The manifest is authoritative for migration file order, paths, and hashes. Its `generated_for.production` metadata is reconciled to connected Production history: V1–V15, including V14, are verified as applied in timestamp order; V16 is the sole pending repository migration.

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
14. `20260911001300_schema_v13_access_requests.sql`
15. `20260911001350_schema_v15_oauth_deletion_reauthentication.sql`
16. `20260912001400_schema_v14_candidate_job_lifecycle.sql`
17. `20261013184117_proof_brief_share_expiry.sql`

Production is reconciled through V15, including V14. V16 is the sole pending repository migration. V16 must not be executed without separate dated approval after the exact-version, fresh-preflight gate recorded here passes; the gate is a prerequisite, not standing or conditional execution authority. No applied migration may be edited in place. Any later schema execution requires a reviewed forward migration, fresh rollout evidence, and its own approval.

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

This recovery result did not by itself authorize the later public launch. Public launch status remains separate from schema execution and is now governed by #130's launched-with-controlled-throughput acceptance.

### October 15, 2026 V16 preflight and recovery certification

An independent read-only preflight against canonical `main` `4e2d8618a6658749d59a77a70eafcf4258d44d58` reconfirmed Production project `skillmint-beta` and its connected provider identity, Free plan, healthy PostgreSQL `17.6.1.141`, exact history through V15 including V14, and V16 absent. The raw project reference remains outside current release documentation. The V16 source and migration copies are byte-identical at SHA-256 `99166341fa448a69fdc4a13e03610a724e38eaeb3313e089828e5487d3a39d12`. Pinned Supabase CLI `2.109.1` produced a non-mutating dry run containing only `20261013184117_proof_brief_share_expiry.sql`, with no unexpected migration or seed operation.

The existing October 14 logical backup was retained rather than replaced. The owner-only APFS sparse image is AES-256 encrypted, FileVault-protected, and opened read-only using a random key stored in the macOS login Keychain. The image SHA-256 is `32f7d7a0317698cecdd146ac0d96c58ff5bf2d8b14d230f966ff170a6a9819cf`; the private recovery manifest SHA-256 is `280628953a917ee0509eaaa09925c7f9c034ad0c8753d6de1469cca139b7deea`. Component checksums verified without exposing backup contents:

| Component | Bytes | SHA-256 |
| --- | ---: | --- |
| roles | 358 | `4350a72b5ec109888e740c17f3eb4da2fcd95ab73af26499538ed0bf615db543` |
| schema | 72,207 | `bf66271f00ae9fe8e55ce2eb649dd34272e68a841f2bc5556be67048b429a8cd` |
| data | 82,732 | `dcc671094724a9cadb2da9d4f21bc436720016227558d96c0d107ae19cdf4af2` |
| migration history | 127,781 | `c88c7a441329da568d6d58e9a9a6ecac0585f241ca9b59218505e58a5601356b` |

The exact components restored in one transaction into a disposable local Supabase/PostgreSQL `17.11` target. The database restore completed in approximately **0.41 seconds**. Counts across application, Auth, migration-history, and Storage metadata matched the read-only Production inventory without retrieving row contents. All fourteen `public` tables had RLS; invalid constraints were zero; negative anonymous/authenticated probes failed closed; the rollback-contained automatic-RLS probe did not persist. Function definitions and execute grants matched Production, including anonymous/authenticated-only execution for `get_shared_proof_brief`, service-role-only execution for `submit_candidate_evidence_review`, and postgres-only execution for `rls_auto_enable`.

After the documented local-only reconciliation steps, complete catalog fingerprints matched the read-only Production inventory:

| Surface | Fingerprint |
| --- | --- |
| functions | `469337a3a9058e4884a08eaeb4b37c32` |
| relations | `002ebed931927b484dbf7672b519070d` |
| policies | `f0ba3157be26c3cba50fce26403471c6` |
| constraints | `b2735eaf0e540cfe3611486365b3f722` |
| triggers | `472a0fcd4a591871e402865c02308dae` |
| event triggers | `ea8fb42a2e44732357c17c50fba00c44` |

The official logical components require two explicit recovery steps: create the empty `supabase_migrations.schema_migrations` target before replaying migration history, then normalize API-role ACLs from the schema dump and recreate the global `ensure_rls` event trigger from the reviewed Production/repository contract. Both were proven only on the disposable target. The final local `postgres` role was returned to non-superuser state, the target was destroyed without another backup, the encrypted image was unmounted, and no container or volume remained.

The dump covers roles, database schemas/data, Auth database rows, Storage database metadata, and migration history. It does **not** cover Storage object bytes, JWT/API/database credentials, custom-role passwords, hosted Auth/OAuth/SMTP/redirect/CAPTCHA configuration, Edge Functions or secrets, Vercel configuration, DNS, firewall, or other provider settings. The captured state contained zero Storage buckets and zero Storage objects, so there were no object bytes to transfer for this backup; that fact does not cover future Storage state. Total service-recovery time remains unmeasured, and provider-managed restore/PITR is not claimed.

This backup certification expires at `2026-10-21T11:14:05Z`. If V16 is not separately authorized by then, create and certify a fresh backup before any rollout. After successful postflight or cancellation, delete the encrypted image and Keychain item within 24 hours under the private retention record.

## Production rollout gate result

| Control | Current verified state | Gate |
| --- | --- | --- |
| Migration history | Exact connected Production history through V15, including V14; V16 repository-pending | **PASSED for current Production**; V16 is the sole pending migration |
| Public ordinary tables | Fourteen expected lineage tables with RLS | **PASSED** |
| Public table ACLs | Direct and effective RLS/column/function privilege probes | **PASSED**; no anonymous table access or authenticated write path to the four new tables |
| `public.rls_auto_enable()` | Present; owner `postgres`; `SECURITY DEFINER`; `search_path=pg_catalog` | **PASSED** |
| Event trigger | `ensure_rls`, enabled on `ddl_command_end` for `CREATE TABLE`, `CREATE TABLE AS`, `SELECT INTO` | **PASSED** |
| Isolated migration rehearsal | Repository evidence records a V1–V16 isolated hosted rehearsal, exact V16 replay, and rollback-contained expiry/review probes on October 14; the Docker-backed concurrent lock race is wired into the PR rehearsal workflow | **RECORDED ISOLATED EVIDENCE**; exact-head PR rehearsal and separate Production approval are still required |
| Lock/timing rehearsal | Bounded lock failure/recovery passed; real-host representative V10→V12 completed in 2.66s | **PASSED**; Production statements ran under the reviewed lock and statement limits |
| Backups/recovery | Current encrypted October 14 logical backup checksum-verified and restored into isolated PostgreSQL 17.11 on October 15; exact catalog/data/permission checks passed | **PASSED through the stated retention deadline**; full-service/provider restore remains unproved |
| Persona authority | Authenticated persona writes absent; service assignment preserved; identity immutable | **PASSED** |
| Proof Brief and recruiter-review boundaries | Publish/revoke/review/feedback, cross-owner denials, and deletion cascades | **PASSED** in rollback-bound Production postflight |
| Hosted Auth/security | Signup disabled; email login remains enabled; email confirmation disabled | **PASSED for fail-closed admission**; not sufficient for external email/password beta |
| Analytics | Collection endpoint disabled; force-RLS and ACL boundary unchanged | **PASSED** and remains disabled |
| Deployed application compatibility | Production deployment on exact preflight `main`; routes and protected APIs healthy; no runtime error cluster | **PASSED** |

Cost or schedule pressure does not waive recovery, security, privacy, or authorization gates.

## Exact-version execution transport result

The exact-version transport gate is satisfied. The execution path preserved repository migration versions `20260823001000`, `20260823001100`, and `20260829001200` exactly.

Do **not** use a migration mechanism that generates new remote-only migration timestamps. In particular, the currently available Supabase MCP `apply_migration` action does not expose a version parameter and may generate its own server-side migration timestamp. Using that path would create migration-history drift against the repository files and would violate the no-history-repair rule.

The accepted path was pinned Supabase CLI `db push` from a trusted local environment with the existing linked Production credentials. This result does not authorize another execution or allow secrets to be copied into GitHub Actions or chat.

Never apply the SQL with `execute_sql` and then manually insert or repair migration-history rows. Migration history must be produced by the legitimate migration mechanism, not edited to force progress.

## Executed V10 → V12 sequence record

Immediately before and during the maintenance window, the operator:

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

Every listed execution item passed. A future schema rollout returns to `NO-GO` until a new forward migration and fresh evidence satisfy a new authority.

## Historical V10→V12 rollback contract

Before the first Production write, record the maintenance-window rollback contract in the operator session:

- **Change:** apply only V10 → V11 → V12, in order, from the exact reviewed repository bytes.
- **Success:** each exact version appears once in migration history; postflight catalog/RLS/ACL/function/trigger/Auth checks pass; analytics remains disabled.
- **Abort:** unexpected history/catalog drift, hash mismatch, lock/timing threshold breach, data anomaly, ownership/RLS/ACL mismatch, Auth regression, persona/Proof Brief/recruiter-review authorization failure, unexpected analytics activation, or incomplete postflight.
- **Rollback:** stop forward writes immediately and use the verified recovery artifact/isolated-restore procedure when state compatibility requires database restoration. An older Vercel deployment does not reverse schema.
- **Caveat:** once application/user writes rely on V10–V12, code rollback alone is not state rollback. Recovery decisions must account for data created under the new schema.

## Historical V10→V12 Production execution and postflight rules

Founder authorization dated September 1, 2026 permitted the reviewed V10 → V11 → V12 Production rollout once all documented execution gates were freshly green. The rules below are retained as the historical execution contract for that completed rollout.

Before each migration, the operator verified target project, current migration history, and exact artifact hash, applied only V10 → V11 → V12 in order, and stopped on any anomaly.

After V12, the historical postflight required:

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

At that time, controlled beta remained **CLOSED** after schema postflight until the then-current release-only gates were satisfied. That dated release state is historical; it does not override the current launched-with-controlled-account-admission decision at the top of this authority.

### September 2, 2026 execution record

- Preflight matched exact current `main`, exact canonical Production identity, exact V1–V9 history, absent V10–V12 objects, and reviewed migration hashes.
- The deployed Production application was `READY` on the exact preflight `main`; route, security-header, signup-closure, protected-API, and disabled-analytics checks passed. The only smoke failure was the already-known missing privacy/support contact.
- V10, V11, and V12 were applied separately and in order through the pinned exact-version transport. Each step was preceded by a one-migration dry run and followed by connected history/catalog/security verification.
- Exact postflight history ends at `20260829001200`; all expected tables, functions, triggers, constraints, owners, RLS, ACL, Auth, and deletion boundaries matched the reviewed contract.
- A rollback-bound Production behavioral probe passed Candidate/Recruiter isolation, persona immutability, Proof Brief publish/revoke, recruiter review, candidate feedback, negative cross-owner access, and deletion relationships. The transaction rolled back and a separate count check confirmed zero persistent synthetic users or rows.
- Final CLI history matched all thirteen repository versions and the final dry run reported the remote database up to date.
- Signup remained closed, email login remained enabled, analytics remained disabled, and controlled beta remained closed at that September 2 checkpoint.

## V16 independent execution gate

V14 and V15 are applied and catalog-verified. V16 remains **unapplied to Production and unauthorized**. PR merge or application deployment may add defense-in-depth denial at SkillMint application routes, but it does not close the direct anonymous RPC boundary or establish Production expiry enforcement.

Before seeking separate exact-version V16 approval, require:

1. the exact merged `main` SHA and V16 SHA-256 to match the reviewed manifest and both byte-identical SQL copies;
2. a read-only Production preflight confirming the exact target, history through V15 including V14, V16 absent, both current function definitions/owners/search paths/grants, no unexpected drift, and the count and age distribution of active unrevoked `LINK_ONLY` shares without exposing tokens or candidate data;
3. exact-head `quality`, OAuth, CodeQL, READY Preview, isolated V1–V16 replay/idempotency, bounded lock recovery, and database tests for fresh, exact-boundary, expired, revoked, replaced, malformed, cross-owner, deletion, and transactional race behavior;
4. pinned Supabase CLI `2.109.1` from a trusted operator environment, with a dry run proving V16 is the only pending version; never use a transport that invents a timestamp or manually repair history;
5. a dated approval naming the exact artifact, target, operator/window, abort thresholds, and recovery owner; and
6. postflight proving the exact history, both function definitions, owners, search paths and grants, expiry behavior, unchanged allowlisted projection, zero unexpected versions, and zero durable synthetic rows.

V16 is transactional and changes only two function definitions plus their grants/comments. Before execution, the operator must record that a pre-commit error rolls the transaction back; after commit, containment is to stop promotion and direct traffic as needed, then use a reviewed forward repair or the verified backup/isolated-restore procedure. Do not restore the indefinite-share definitions merely to make the UI green, and do not treat an older Vercel deployment as a database rollback.

Even if every prerequisite passes, this document does not authorize execution. V16 Production application requires the separate dated approval above. This schema gate does not open signup or public OAuth; #130 continues to govern admission and launch quality.

### Tested recovery and forward-repair runbook

1. Before the window, reverify canonical `main`, target identity, remote history, V16 absence/hash, active-share aggregate, the encrypted image and every component checksum, Keychain access, retention deadline, free disk space, operator, recovery owner, and observability.
2. Require the pinned CLI dry run to list only V16 and no seed. Do not execute if any evidence has changed or expired.
3. If execution is authorized, apply only the exact V16 artifact under the reviewed transaction/lock/statement bounds. A pre-commit failure must leave history and both function definitions unchanged.
4. Immediately postflight the exact migration history, definitions, owners, search paths, grants, expiry boundary, unchanged RPC projection, current-share behavior, and absence of durable synthetic rows. Do not promote or widen admission while postflight is incomplete.
5. If post-commit behavior is wrong, contain the affected sharing/review path and prepare a reviewed forward-only repair. Do not edit migration history, restore indefinite sharing merely to clear a UI failure, or assume a code rollback reverses the database.
6. Restore only by incident decision into a freshly isolated PostgreSQL 17/Supabase environment first: verify checksums, restore roles/schema/data in one fail-fast transaction, recreate the migration-history target before its COPY, normalize API-role ACLs, recreate `ensure_rls`, and compare counts plus catalog fingerprints before considering any Production recovery plan.

Measured database restore time is approximately 0.41 seconds on the disposable local host. That is not a full-service recovery-time objective: credential re-establishment, hosted Auth/provider configuration, Storage object transfer, Edge Functions, Vercel, DNS, traffic handling, and operational decision time were not restored or timed. Recovery point is the October 14 capture; later writes would not be present.

### Unsigned V16 authorization record

This record is deliberately incomplete and confers no authority:

| Field | Required value |
| --- | --- |
| Decision | `UNSIGNED — V16 NOT AUTHORIZED` |
| Canonical main | `4e2d8618a6658749d59a77a70eafcf4258d44d58` |
| V16 artifact | `20261013184117_proof_brief_share_expiry.sql` |
| V16 SHA-256 | `99166341fa448a69fdc4a13e03610a724e38eaeb3313e089828e5487d3a39d12` |
| Production target | `skillmint-beta`; connected provider identity re-verification required |
| Operator | `UNASSIGNED` |
| Maintenance window | `UNSCHEDULED` |
| Recovery owner | `UNASSIGNED` |
| Recovery artifact | October 14 encrypted logical backup; certification expires `2026-10-21T11:14:05Z` |
| Required approver | Founder or separately delegated release authority; name, decision, date, and scope required |

Technical readiness is **READY FOR FOUNDER APPROVAL** only while the exact evidence above remains current. It is not a release approval. Abort on target/history/hash drift, a dry run listing anything except V16, an unreadable/expired backup, function/ACL/catalog mismatch, unexpected aggregate share state, absent operator or recovery ownership, incomplete observability, or any postflight failure.
