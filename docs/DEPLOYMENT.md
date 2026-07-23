# SkillMint Deployment Safety Guide

SkillMint is preparing for a production beta rollout. The fail-closed Block 6.2 code was automatically deployed from `main`, but Production V5–V7 remain unapplied and analytics remains disabled. This guide is an operator checklist, not a Production readiness claim.

Beta release readiness remains blocked pending Production rollout and an externally verified, monitored privacy/support contact.

<!-- Frozen Block 5 preservation marker: BETA_RELEASE_READINESS=BLOCKED_PENDING_PRODUCTION_ROLLOUT_AND_EXTERNAL_PRIVACY_CONTACT -->

## Brand and domain boundary

The approved pre-Block-6 Brand & Domain Decision Gate may select a public name and reserve a usable domain. Selection and reservation are not activation and do not authorize production changes.

The gate must not change DNS, Vercel configuration, Supabase configuration, authentication, trusted origins, schema, storage, or deployed environment variables. Custom-domain activation belongs to Block 7 and requires an independently approved rollout.

During Block 7, Preview and Production scopes must be reviewed separately, and the following must be coordinated as one rollout boundary:

- Vercel production branch and domain mapping;
- `NEXT_PUBLIC_APP_URL` and allowed origins;
- Supabase Site URL and redirect allowlists;
- password-reset links and canonical URLs;
- verified and monitored privacy/support email;
- authentication and account-deletion origin smoke tests;
- monitoring and rollback.

Reserving a domain does not make any of these settings safe or complete. See [Brand & Domain Decision Gate](BRAND_DOMAIN_GATE.md).

## Deployment target and remote-push boundary

Vercel is the preferred deployment target, but a Git-connected host may create preview deployments from branch pushes. Before any remote branch push, independently review the actual Git/Vercel project linkage, deployment protection, preview access, ignored-build settings, and environment-variable scopes. Unknown remote deployment behavior blocks remote push readiness even when a local commit is safe.

Preview and Production currently share the same two public Supabase variables. Preview is therefore connected to the Production backend and must not be used for destructive, migration, or isolated-security testing. Separating those variables requires a later controlled Vercel change.

The `skillmint-block6-test` Supabase project is `ACTIVE_HEALTHY`, contains no Production copy, has V1–V6 applied, and is not connected to the Vercel project. Its next responsibility is the separately authorized V7 repair and repeated live-security gate. npm package exclusion through `.npmignore` does not prove that a Vercel build excludes a repository file or environment variable.

## Public browser variables

These values are intentionally available to browser code:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_ANALYTICS_COLLECTION_ENABLED=
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is a legacy alias used only where compatibility still requires it. Prefer the publishable-key name for current configuration. Public keys are still environment-specific and must point only to the intended environment.

The public analytics flag is build-time configuration. It must remain absent or disabled until server persistence, founder authorization, WAF, retention, and monitoring gates are complete. Enabling it requires a rebuild.

## Trusted server-runtime variables

```text
SUPABASE_SECRET_KEY=
ANALYTICS_COLLECTION_ENABLED=
ANALYTICS_FOUNDER_USER_ID=
```

`SUPABASE_SECRET_KEY` is server-only. It must never use a `NEXT_PUBLIC_` prefix, enter browser bundles, appear in logs or test artifacts, or be exposed to client code. It is required only by trusted server functionality that needs administrative authority, including the protected account-deletion route. Scope and protect it independently for each deployment environment.

Do not configure the account-deletion route in a Preview environment unless that preview is protected, explicitly authorized, and connected to an appropriately migrated nonproduction Supabase project.

`ANALYTICS_COLLECTION_ENABLED` controls server persistence and defaults off. `ANALYTICS_FOUNDER_USER_ID` is authorization configuration for the protected founder route. Both are server-only, independently scoped, and forbidden from browser output.

## Operator-only database configuration

```text
SUPABASE_DB_URL=
```

`SUPABASE_DB_URL` is for controlled migration and isolated live-verification tooling. It is operator-only, is not required by the deployed Next.js runtime, and must not enter client bundles, server-runtime configuration, or ordinary Preview environments.

Load database credentials only into a sanitized disposable operator process after the local target guard validates the isolated project identity. The guard does not prove connection or schema safety. Never commit project refs, database passwords, access tokens, connection strings, or Supabase CLI link metadata.

SkillMint has no configured seed dataset. The generic `https://supabase.com/docs/...` URL in `supabase/config.toml` is a documentation link, not a hosted project endpoint.

## Environment responsibilities

- Vercel Production uses Supabase `skillmint-beta`. This repository pass authorizes no migration or setting change.
- Vercel Preview currently shares Production's two public Supabase variables. It is not an isolated database environment.
- Supabase `skillmint-block6-test` has no Production data and no Vercel connection. Use it only for the separately authorized V7 repair and security gate.

## Production schema rollout

For an empty isolated environment, the committed forward order is:

1. `supabase/migrations/20260723000100_schema_v1.sql`
2. `supabase/migrations/20260723000200_schema_v2_feedback.sql`
3. `supabase/migrations/20260723000300_schema_v3_data_controls.sql`
4. `supabase/migrations/20260723000400_schema_v4_account_deletion_security.sql`
5. `supabase/migrations/20260723000500_schema_v5_analytics_events.sql`
6. `supabase/migrations/20260723000600_schema_v6_analytics_aggregation.sql`
7. `supabase/migrations/20260723000700_schema_v7_analytics_acl_hardening.sql`

The timestamped files are byte-identical to the seven source schemas and recorded in `supabase/migrations/manifest.json`. Applied SQL is immutable evidence. V1–V6 remain unchanged; later corrections require a separately reviewed forward migration.

The isolated project has V1–V6 applied, but its live result is not Production proof. The outer `BEGIN`/`COMMIT` wrappers in V4–V7 remain unchanged unless a separately authorized execution with pinned Supabase CLI 2.109.1 proves a specific incompatibility.

Production V1–V4 are baseline candidates, not trusted migration history. Exact history and normalized catalog proof must cover tables, columns, constraints, indexes, RLS, grants, functions, triggers, owners, ACLs, and search paths before marking them applied.

Migration repair changes history only and executes no SQL. A Production dry-run must show only V5, V6, and V7 before authorization, and those migrations must be applied and verified separately. V7 removes inherited/default `service_role` table access and restores INSERT only; it does not enable analytics. Isolated verification is not Production proof. Follow the [Block 6 Rollout Runbook](BLOCK_6_ROLLOUT_RUNBOOK.md).

## Vercel deployment checklist

- Confirm the intended Git repository, branch behavior, and project linkage.
- Confirm Preview and Production variable names and scopes without exposing values.
- Record the current shared Preview/Production public Supabase variables and block database-affecting Preview tests.
- Separate Preview variables only through an approved Vercel change with a nonproduction target.
- Confirm deployment protection and preview access before a branch push.
- Confirm the framework preset and build command use the locked source and lockfile.
- Apply and verify the approved database rollout before enabling privileged deletion functionality.
- Verify server-only variables are absent from browser/static output.
- Run production smoke tests only after the environment and schema gates pass.

## Production smoke checklist

- Run `npm run smoke:production` against the explicitly approved deployment.
- Verify `/api/health/config` reports configuration status without values.
- Verify landing, signup, login, dashboard, profile, setup, resume, ATS, roadmap, feedback, and mobile navigation paths.
- Verify signed-out fallback behavior remains truthful.
- Verify safe deletion-route failures before any authorized destructive test.
- Monitor server errors and authentication/deletion events without logging credentials or personal payloads.

## Rollback and non-claims

Application rollback and database recovery are separate decisions. Redeploying an earlier application build does not reverse a database migration. Do not roll back additive security schema casually; use the approved recovery or forward-fix plan.

This guide does not claim production migration, beta readiness, production readiness, legal compliance, provider backup/log deletion, universal JWT invalidation, Safari certification, complete screen-reader certification, or permanent OS download-save proof. An externally verified privacy/support contact remains a release blocker until ownership and monitoring are confirmed.
