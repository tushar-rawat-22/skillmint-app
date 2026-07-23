# Block 6 Rollout Runbook

## 1. Purpose and current state

This runbook controls the later Block 6 database and analytics rollout. It does not authorize a hosted change.

Block 6.1 and Block 6.2 are merged and frozen pending rollout. Block 6.2 passed independent review. The fail-closed application code was automatically deployed from `main`, but Production V5–V7 remain unapplied. No Production database or setting was changed during the repository-foundation pass.

The isolated `skillmint-block6-test` project exists with status `ACTIVE_HEALTHY` and has V1–V6 applied. Live PostgREST verification denied raw reads to browser roles but found that `service_role` retained raw SELECT. V7 is the additive ACL repair. Apply it only under a separately authorized live-security gate before considering Production.

## 2. What remains disabled

Analytics collection remains disabled. The founder UUID, Vercel WAF rule, and retention schedule are unconfigured.

Keep `ANALYTICS_COLLECTION_ENABLED` and `NEXT_PUBLIC_ANALYTICS_COLLECTION_ENABLED` absent or disabled. Do not enable either flag during database bootstrap or security verification.

## 3. Environment map

| Environment | Application | Database responsibility |
| --- | --- | --- |
| Production | Vercel Production | Supabase `skillmint-beta`; no migration or setting change is authorized by this repository pass |
| Isolated | No Vercel project connection | Supabase `skillmint-block6-test`; contains no Production data, has V1–V6 applied, and awaits V7 and repeated live-security verification |
| Preview | Vercel Preview | Currently shares Production's two public Supabase variables, so it is not an isolated database environment |

Do not use Preview for destructive or migration testing. Separating Preview variables is a later controlled Vercel change.

## 4. Migration-source authority

The ordered chain is recorded in `supabase/migrations/manifest.json`. Each timestamped migration must remain byte-identical to its named `supabase/schema_v1.sql` through `supabase/schema_v7_analytics_acl_hardening.sql` source.

Do not edit an applied migration in place. V1–V6 are immutable. Investigate a mismatch and prepare a reviewed forward migration when a correction is necessary.

## 5. Isolated-project procedure

Use a disposable workdir for every hosted operation. Copy only the committed `supabase/config.toml` and `supabase/migrations` directory into it. Supabase CLI link metadata is local state; it must never be committed or left in this repository.

### CLI and local proof

Use pinned Supabase CLI 2.109.1 unless an upgrade receives separate review. Verify the isolated and Production Postgres major versions before relying on the local `major_version` in `supabase/config.toml`.

When a supported container runtime is available, run a local Supabase stack and database reset before linking a hosted project. The reset must apply the exact committed V1–V7 chain. Verify migration history, schema objects, and security contracts; command exit status alone is insufficient.

The current outer transaction wrappers remain unchanged. Do not transform V4–V7 unless an actual execution with the pinned CLI proves a specific incompatibility.

### Seeds

No seed file is configured or expected. Do not invent sample or Production-like data to make the local reset or isolated gate succeed.

### Target-to-link binding

Do not use the interactive Supabase project selector during the isolated gate. A later live script must read one fresh private inventory, validate the exact isolated name, status, region, and project-ref hash, and derive the link project reference from that same validated inventory inside the same fail-closed process.

The live script must pass that project reference non-interactively to `supabase link`, then verify that the resulting link metadata resolves to the same approved ref hash before migration list, dry-run, or push. Any mismatch must stop before database migration activity. Raw project references are private and must not enter reports, logs, documentation, or Git.

Run `scripts/block6-target-guard.mjs` against the fresh private inventory before any link. A guard pass confirms only the isolated target identity. It does not prove the connection, migration history, catalog, or schema is safe.

### Dry-run boundary

`db push --dry-run` reports which migrations would be selected and their order. It does not execute or fully validate migration SQL. A successful dry-run is not permission to push.

### Separately authorized hosted procedure

Under a separately approved live-verification gate:

1. Bind and link only `skillmint-block6-test` non-interactively from the disposable workdir.
2. Inspect the migration list before any push.
3. Confirm the hosted migration history is the exact committed V1–V6 prefix.
4. Run a database push dry-run and confirm that only V7 is pending.
5. Apply V7.
6. Run the catalog, privilege, RLS, raw-row denial, RPC, retention, and application security checks.
7. Remove the disposable workdir after evidence is captured safely.

Never use `db pull` blindly. It can create misleading local state and does not replace catalog review.

## 6. Production baseline procedure

V1–V4 are historical baseline candidates. Do not assume that Production has applied them merely because similar objects exist.

Inspect Production migration history and a normalized catalog. Compare tables, columns, constraints, indexes, RLS, grants, functions, triggers, owners, ACLs, and function search paths exactly.

Only exact catalog proof permits marking the four versions applied. Migration repair changes migration history only; it executes no migration SQL. Never use repair without that proof.

After the baseline is proven, the Production database push dry-run must show only V5, V6, and V7. Any other result blocks rollout and requires investigation or a reviewed forward migration.

Apply V5, V6, and V7 separately during an authorized Production rollout. Capture and review evidence after each migration before proceeding.

## 7. V5 verification

Verify the `analytics_events` table, exact columns and constraints, three expected indexes, forced RLS, and V5 statements. V5's INSERT grant does not remove pre-existing `service_role` privileges; the final INSERT-only contract is verified after V7.

Prove that browser roles cannot insert, select, list, update, or delete raw rows. Confirm duplicate event IDs remain idempotent through the server repository and that fixed failures expose no provider detail.

## 8. V6 verification

Verify both functions, their owners, empty search paths, statement timeouts, exact ACLs, closed-open windows, and server-canonical environment restriction. Confirm the summary returns only the approved aggregate DTO and never raw events or identity dimensions.

Verify the exact 1,080-hour purge threshold and deterministic 10,000-row batch cap. A 10,000-row purge batch may require repeated scheduled runs when the overdue count is larger.

## 9. V7 verification

Verify effective ACLs, not only grant rows. `public`, `anon`, and `authenticated` must have no table privilege. `service_role` must have INSERT and must not have SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, or TRIGGER. Run `scripts/analytics-acl-catalog-verify.sql`; it uses `has_table_privilege`, `has_any_column_privilege`, direct PUBLIC ACL checks, and exact function identities. Check later tracked migrations for broader grants.

Raw table access is separate from function execution. Confirm only `service_role` can execute `get_founder_analytics_summary(text,text)`, and no API role can execute `purge_expired_analytics_events()`. V7 changes no function body or RLS policy and does not activate collection.

## 10. Founder authorization setup

Configure `ANALYTICS_FOUNDER_USER_ID` only after V5–V7 security verification and WAF protection. Use the founder's authentic Supabase Auth UUID as server-runtime authorization configuration. Never place it in analytics rows, responses, client variables, docs, or logs.

Verify signed-out, invalid-token, non-founder, disabled, rate-limited, empty, and ready states. An absent or invalid founder UUID must keep the dashboard fail-closed.

## 11. Vercel environment separation

Separate Preview from Production before using Preview for database-affecting tests. Preview currently inherits the same two public Supabase variables as Production.

Review public browser variables and server-runtime secrets by Vercel scope. Do not put server credentials or the founder UUID in a `NEXT_PUBLIC_` variable.

## 12. WAF prerequisite

Configure and verify a Vercel WAF rule for the founder summary route before dashboard activation. The application limiters are process-local; serverless instances do not share their counters or one-query lock.

Record the rule scope, limit, response behavior, owner, monitoring path, and emergency disable procedure without recording secret values.

## 13. Retention scheduling

Schedule `public.purge_expired_analytics_events()` only after explicit authorization. The schedule needs an accountable owner, bounded frequency, failure alert, overdue-count monitoring, and a recovery procedure.

Confirm the scheduler uses an operator-controlled database identity that is not exposed to the application. Repeated runs may be required because one call deletes at most 10,000 overdue rows.

## 14. Monitoring

Monitor endpoint refusal classes, accepted ingestion, aggregate query availability, WAF activity, database errors, and retention overdue counts. Do not log event bodies, access tokens, project refs, database credentials, or founder identity values.

Free Supabase projects can pause after inactivity. Treat an isolated-project wake-up or pause as an environment condition, not as Production evidence.

Events are not people. Do not report unique users, active users, sessions, cohorts, retention, account funnels, or person-level conversion from this data.

## 15. Kill switches

Use these controls in order as the incident requires:

1. Invalidate or remove `ANALYTICS_FOUNDER_USER_ID`.
2. Disable `ANALYTICS_COLLECTION_ENABLED`.
3. Disable `NEXT_PUBLIC_ANALYTICS_COLLECTION_ENABLED` and rebuild.
4. Apply a temporary platform route block where available.

Do not emergency-drop the analytics table or functions. Preserve evidence and use a reviewed database forward fix.

## 16. Rollback and forward-fix policy

Application rollback and database recovery are separate decisions. Redeploying older application code does not reverse V5, V6, or V7.

Prefer flag shutdown, route blocking, and reviewed forward fixes. Do not modify applied SQL, erase migration history, or use migration repair to execute or undo schema changes.

## 17. Evidence and closure checklist

- [ ] Disposable workdir and private inventory provenance recorded without secret values.
- [ ] Target guard passed for the isolated project before link.
- [ ] Isolated V1–V6 prefix and V7 dry-run, application, catalog, RLS, ACL, raw-row denial, RPC, and purge evidence reviewed.
- [ ] Production V1–V4 history and normalized catalog match exactly before any history repair.
- [ ] Production dry-run shows only V5, V6, and V7.
- [ ] V5 applied and verified separately from V6.
- [ ] V6 applied and verified with collection flags absent.
- [ ] V7 applied and verified with collection flags absent.
- [ ] WAF configured and tested before founder authorization.
- [ ] Founder UUID configured server-side and the empty dashboard verified.
- [ ] Bounded retention schedule configured, monitored, and tested.
- [ ] Server persistence enabled and ingestion verified before browser delivery.
- [ ] Browser delivery enabled with a rebuild and observed before Block 6 closure.
- [ ] Kill switches, monitoring ownership, incident path, and evidence location recorded.

Isolated verification is not Production proof. Close Block 6 only after the separately authorized Production rollout and observation period meet every applicable gate.
