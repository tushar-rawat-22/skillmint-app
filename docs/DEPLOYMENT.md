# SkillMint Deployment Safety Guide

SkillMint is a Next.js application preparing for a production beta rollout. Block 5 engineering was verified only against the authorized isolated Supabase project. Production has not received the final Block 5 schema rollout, so this guide is an operator checklist rather than a production-readiness claim.

`BETA_RELEASE_READINESS=BLOCKED_PENDING_PRODUCTION_ROLLOUT_AND_EXTERNAL_PRIVACY_CONTACT`

## Deployment target and remote-push boundary

Vercel is the preferred deployment target, but a Git-connected host may create preview deployments from branch pushes. Before any remote branch push, independently review the actual Git/Vercel project linkage, deployment protection, preview access, ignored-build settings, and environment-variable scopes. Unknown remote deployment behavior blocks remote push readiness even when a local commit is safe.

Preview and Production scopes must be reviewed separately. Preview must not silently inherit production Supabase credentials, and the account-deletion route must not become reachable against an unintended or unmigrated database. npm package exclusion through `.npmignore` controls `npm pack` contents only; it does not prove that a Vercel build or preview excludes a repository file or environment variable.

## Public browser variables

These values are intentionally available to browser code:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
```

`NEXT_PUBLIC_SUPABASE_ANON_KEY` is a legacy alias used only where compatibility still requires it. Prefer the publishable-key name for current configuration. Public keys are still environment-specific and must point only to the intended environment.

## Trusted server-runtime variables

```text
SUPABASE_SECRET_KEY=
```

`SUPABASE_SECRET_KEY` is server-only. It must never use a `NEXT_PUBLIC_` prefix, enter browser bundles, appear in logs or test artifacts, or be exposed to client code. It is required only by trusted server functionality that needs administrative authority, including the protected account-deletion route. Scope and protect it independently for each deployment environment.

Do not configure the account-deletion route in a Preview environment unless that preview is protected, explicitly authorized, and connected to an appropriately migrated nonproduction Supabase project.

## Operator-only database configuration

```text
SUPABASE_DB_URL=
```

`SUPABASE_DB_URL` is for controlled migration and isolated live-verification tooling. It is not a browser variable, is not ordinarily required by the deployed Next.js runtime, and must not enter client bundles or ordinary preview environments. Load it only into a sanitized operator process after validating the authorized project reference and blocking the production reference.

## Production schema rollout

For a new empty environment, the locked forward-only order is:

1. `supabase/schema_v1.sql`
2. `supabase/schema_v2_feedback.sql`
3. `supabase/schema_v3_data_controls.sql`
4. `supabase/schema_v4_account_deletion_security.sql`

The applied SQL files are immutable evidence. Later corrections require a separately reviewed forward-fix SQL file; do not edit and replay an applied file. Isolated-project catalog verification is not production rollout proof.

Production rollout requires explicit approval, current-schema inventory, backup and recovery planning, accountable ownership, rollback planning, secret/environment review, transactional application where supported, exact post-application catalog verification, monitoring, and an incident path. Production has not been migrated or verified for the final Block 5 sequence.

## Vercel deployment checklist

- Confirm the intended Git repository, branch behavior, and project linkage.
- Confirm Preview and Production variable names and scopes without exposing values.
- Prove Preview does not receive production Supabase variables.
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

This guide does not claim production migration, beta readiness, production readiness, legal compliance, provider backup/log deletion, universal JWT invalidation, Safari certification, complete screen-reader certification, or permanent OS download-save proof. A verified and monitored external privacy/support contact remains required before beta release.
