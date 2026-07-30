# Production Schema Rollout Authority

**Current decision:** `NO-GO`

This is the current authority for a future SkillMint Production schema rollout. It is a plan and review gate, not permission to contact Production, execute a migration, change hosted configuration, deploy, or invite users.

## Verified baseline and target

The bounded July 30, 2026 inventory verified the `skillmint-beta` Production catalog as the exact V1+V2 versioned catalog baseline plus the known untracked `public.rls_auto_enable()` drift: 5 relations, 40 columns, 13 constraints, 13 indexes, 18 policies, 2 functions, and 1 table trigger, including the reviewed definitions and security metadata. `CATALOG_BASELINE` remains `V1+V2`; `CATALOG_DRIFT` is separately reported as `public.rls_auto_enable`. V3–V8 are catalog-pending. Remote migration-history visibility was unavailable to the read-only role, so history is **unknown**, not absent. The empty table-grant result is not proof of zero grants: table-grant visibility is **unknown** for that read-only role.

The inventory exposed `public.rls_auto_enable()` through catalog and PostgREST metadata, but its function owner and event-trigger contract were not captured. It also did not capture the function body. Those details require an authorized read-only preflight before any rehearsal or rollout; repository expectations are not evidence of live state.

Provider signup is disabled and email login is enabled. Preserve both states. Analytics remains disabled. Public launch, invitations, and any Production or hosted change remain unauthorized.

The reviewed forward target order is exact:

1. `20260723000300_schema_v3_data_controls.sql`
2. `20260723000400_schema_v4_account_deletion_security.sql`
3. `20260723000500_schema_v5_analytics_events.sql`
4. `20260723000600_schema_v6_analytics_aggregation.sql`
5. `20260723000700_schema_v7_analytics_acl_hardening.sql`
6. `20260727000750_lifecycle_function_acl_normalization.sql`
7. `20260727000800_schema_v8_active_resume_selections.sql`
8. `20260730000900_public_rls_auto_enable_acl_normalization.sql`

V1–V8 are immutable. The final migration only revokes execution on `public.rls_auto_enable()` when a fail-closed preflight finds exactly one `public.rls_auto_enable`, with kind `function`, zero arguments, `event_trigger` return, `plpgsql`, volatile behavior, `SECURITY DEFINER`, exactly `search_path=pg_catalog`, and owner `postgres`. It also requires exactly one attached event trigger owned by `postgres`, named `ensure_rls`, on `ddl_command_end`, enabled in origin mode, with exactly the normalized tags `CREATE TABLE`, `CREATE TABLE AS`, and `SELECT INTO`. It leaves an absent function alone and rejects every mismatch, overload, missing trigger, extra attached trigger, or different function/event-trigger owner.

Before changing the ACL, V9 snapshots the full verified function-owner and event-trigger-owner contract and proves it unchanged afterward. V9 does not inspect or change the function body. Exact body verification remains mandatory in the authorized rehearsal and live preflight/postflight.

Changing default function privileges was rejected. The observed drift concerns one object, and existing repository functions intentionally have different explicit execution grants. A default-privilege change would affect future objects beyond the verified problem.

## Open operational security register

| Control | Verified state | Gate |
| --- | --- | --- |
| Production catalog | V1+V2; V3–V8 pending | NO-GO until the reviewed sequence is authorized and verified |
| Migration history | Unknown because the read-only role could not see it | NO-GO until an authorized operator establishes exact history |
| Table grants | Unknown because the read-only inventory role did not establish complete grant visibility | NO-GO until an authorized operator establishes exact table privileges |
| `public.rls_auto_enable()` | Untracked `SECURITY DEFINER` event-trigger function and PostgREST RPC surface; live owner, event-trigger contract, and body were not captured | NO-GO until the complete object contract and post-migration ACL are verified |
| Provider signup | Disabled | Must remain disabled |
| Existing email login | Enabled | Must remain enabled |
| Email confirmation | Auto-confirm enabled | Requires security, product, and legal decision |
| CAPTCHA | Disabled | Requires abuse-control decision and verification |
| Password minimum | 6 characters | Requires security decision and verification |
| Custom SMTP | Absent | Required before controlled access |
| Database SSL enforcement | Disabled | Requires an approved remediation decision |
| Backups | Zero available backups | Blocks every migration |
| PITR | Disabled on the Free plan | Blocks every migration unless an approved recovery plan compensates |
| Analytics | Disabled | Must remain disabled |

The Free plan currently provides no verified backup or PITR recovery point. Cost or schedule pressure does not waive the recovery gate.

## Backup prerequisite

No migration may begin until an accountable owner approves a completed, restorable logical backup set. The set must contain separate artifacts for:

- roles and required grants;
- schema and database objects;
- table data;
- auth-user preservation and restoration considerations, including identity linkage and provider constraints.

Backup files and user data must never enter Git, CI artifacts, the review ZIP, or application logs. Store them encrypted in a restricted local location and in an approved secure off-site location. Record checksums, access ownership, retention, and deletion. Rehearse restoration into an isolated recovery environment and verify row counts, ownership links, functions, triggers, RLS, grants, and authentication implications. A backup command exit code without restore proof is not sufficient.

## Dry-run and review gates

Before the maintenance window:

1. Run the offline validator against the approved inventory ZIP with its separately recorded SHA-256. A valid result is expected to remain `NO-GO` while blockers are open.
2. Reconfirm the target name without printing credentials, URLs, tokens, or environment values.
3. Obtain authorized read-only visibility into migration history and complete table grants. Reconcile history to the verified V1+V2 catalog; do not infer history from catalog similarity, treat an empty grant view as zero grants, or claim a hidden table is absent.
4. Recompute and review every migration hash. Confirm V1–V8 match their frozen values and the manifest order ends with the ACL-normalization migration.
5. Rehearse V3 through the final migration against an isolated V1+V2 copy with representative synthetic data. Test absence and the exact compatible `rls_auto_enable()` function-owner/event-trigger contract, plus fail-closed refusal of every mismatched function field, overload count, trigger count, trigger name, event, enabled state, or tag set. Capture and compare the function body separately because V9 intentionally does not inspect it.
6. Review the full SQL diff, expected locks, data volume, query plans where relevant, and the V3 partial-application risk. V3 lacks the later migrations' explicit transaction wrapper, so a failure requires a pre-agreed recovery or forward-fix decision.
7. Assign the incident commander, database operator, application owner, security/privacy owner, support owner, and communications owner. One person may hold multiple roles only by explicit approval.
8. Approve the backup/restore evidence, exact execution procedure, abort thresholds, postflight worksheet, and communications text.

Any unresolved gate remains `NO-GO`.

## Staged execution and postflight

Production writes and migrations require separate explicit authorization. During an approved maintenance window, stop if the observed target, history, catalog, or hash differs from the reviewed inputs. Apply one ordered migration at a time and record start, result, and postflight evidence before continuing.

After V3 and V4, verify:

- the feedback owner foreign key uses `ON DELETE CASCADE`;
- the active-user guard and lifecycle functions have exact owner, return, security, and `pg_catalog` search-path contracts;
- every account table has RLS and the reviewed table, column, policy, index, and function ACLs;
- authenticated saved-report deletion and service-only account preparation retain their distinct authorities.

After V5 through V7.1, verify:

- `analytics_events` has the exact columns and constraints, forced RLS, no browser policy, and `service_role` INSERT only;
- aggregation is executable only by `service_role`, purge is not executable by API roles, and lifecycle grants match the frozen contracts;
- no collection flag, founder identifier, WAF rule, or retention schedule was enabled by the schema rollout.

After V8, verify:

- the active-resume-selection owner key, composite owner/source foreign key, trigger, four owner policies, and column-level grants exactly match the V8 contract;
- anonymous and `service_role` have no raw selection-table access;
- saved-report and protected account deletion include selection cleanup without changing browser-active report behavior.

After the final migration, verify:

- an absent `public.rls_auto_enable()` remained absent;
- if present, its identity, body, owner, `SECURITY DEFINER` state, return type, search path, and attached event-trigger definition are unchanged;
- `PUBLIC`, `anon`, `authenticated`, and `service_role` have no effective `EXECUTE`;
- the PostgREST RPC is not callable by browser/API roles.

Finally, verify exact migration history through the final version, zero unexpected pending versions, normalized catalog counts and definitions, owner/RLS/ACL checks, application health, and error rates. Reconfirm provider signup remains disabled, email login remains enabled, and analytics remains disabled.

## Rollback, incident, and abort authority

Redeploying an earlier application does not reverse schema. Do not edit applied SQL, erase history, use migration repair as rollback, drop account data, or improvise destructive reverse migrations.

- Before the first migration, any failed gate means abort with no schema change.
- A transactional migration failure should roll back that migration; verify the catalog before deciding whether to resume.
- A V3 partial failure, incompatible live object, ownership/RLS/ACL failure, data-count anomaly, authentication regression, unexpected analytics activation, or inability to complete postflight means stop the sequence and open an incident.
- Choose only an independently reviewed forward fix or restoration into an approved recovery target. The incident commander owns the choice with database, security/privacy, and product approval.
- Pause application writes or access when needed to protect consistency. Keep signup and analytics disabled.

The expected write downtime is **unknown until the full sequence is rehearsed against representative scale**. That unknown blocks scheduling. Before authorization, the database operator must publish the measured estimate and the incident commander must approve a maintenance window with contingency. The communications owner must notify affected existing users before the window, issue status updates during an overrun or incident, and publish closure only after postflight passes.

The next gate is an independent repository review followed by an isolated V1+V2 full-sequence rehearsal and restore drill. It is not a Production migration.
