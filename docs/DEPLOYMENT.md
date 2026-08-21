# SkillMint Deployment Safety Guide

The former Beta v1 production-beta path is superseded as current sequencing by the [Version 2 Transition Gate](V2_TRANSITION_GATE.md). The fail-closed Block 6.2 code was automatically deployed from `main`, but the July 30 inventory verified only a V1+V2 Production catalog and analytics remains disabled. This guide preserves future operator constraints; it is not a Production readiness claim or deployment authorization.

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

## Investor-demo hosting target

The Git-connected Vercel project remains a development and Preview integration;
Vercel Hobby is not the company hosting answer for a commercial investor demo.
As of August 21, 2026, Netlify Free is the selected zero-cost target for the
private investor surface. Its current Free plan permits commercial projects,
has a hard 300-credit monthly limit with no auto recharge, and pauses at the
limit instead of creating a charge. Netlify's current Next.js adapter documents
support for the App Router, Server Components, route handlers, middleware, and
SSR without adding an application dependency.

Cloudflare Workers Free remains a fallback, but it is not the current target:
its 10 ms CPU limit per invocation and 3 MB compressed Worker limit create
material risk for this repository's authenticated PDF/DOCX extraction path.
Do not add a Cloudflare adapter until that path is measured against the actual
bundle and runtime.

The Netlify CLI is not authenticated on the current operator machine, so no
Netlify site has been created or deployed. After the account owner completes
`netlify login`, the operator must verify the team is on Free with no billing
method or recharge path, connect this repository, and configure only the
minimum investor-demo values:

```text
SKILLMINT_PUBLIC_DEMO_ENABLED=true
SKILLMINT_PUBLIC_SIGNUP_ENABLED=false
NEXT_PUBLIC_ANALYTICS_COLLECTION_ENABLED=false
ANALYTICS_COLLECTION_ENABLED=false
```

Do not configure a service-role/secret key for the investor demo. If existing
user login is intentionally included, add only the environment-specific public
Supabase URL and publishable key after verifying the target; that is a separate
operational decision and does not authorize a migration. Keep `noindex` and
`nofollow`, use the provider subdomain, and run the production-mode synthetic
demo isolation smoke before sharing the URL.

Provider references:

- [Netlify pricing](https://www.netlify.com/pricing/)
- [Netlify credit-based Free plan](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
- [Netlify Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/)
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Cloudflare Next.js support](https://developers.cloudflare.com/workers/framework-guides/web-apps/nextjs/)

## Remote-push boundary

A Git-connected host may create preview deployments from branch pushes. Before any remote branch push, independently review the actual project linkage, deployment protection, preview access, ignored-build settings, and environment-variable scopes. Unknown remote deployment behavior blocks remote push readiness even when a local commit is safe.

Environment separation was independently verified on July 27, 2026: Preview uses the Version 2 staging target and Production uses the Production target. Preview is not connected to the Production backend. This closure does not authorize destructive, migration, or isolated-security testing outside separately approved staging work.

During Block 6 isolated verification, the `skillmint-block6-test` Supabase project reported `ACTIVE_HEALTHY`, received V1–V7, and passed the isolated ACL and live-security checks. This is a historical verification observation, not a current-health guarantee. The project contains no Production data and is connected only to Vercel Preview through staging-scoped public variables; that connection does not authorize destructive testing, migrations, or Production work. It remains a test and evidence environment; its result neither authorizes nor proves Production rollout. npm package exclusion through `.npmignore` does not prove that a Vercel build excludes a repository file or environment variable.

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
SKILLMINT_PUBLIC_SIGNUP_ENABLED=
SKILLMINT_PUBLIC_DEMO_ENABLED=
```

`SUPABASE_SECRET_KEY` is server-only. It must never use a `NEXT_PUBLIC_` prefix, enter browser bundles, appear in logs or test artifacts, or be exposed to client code. It is required only by trusted server functionality that needs administrative authority, including the protected account-deletion route. Scope and protect it independently for each deployment environment.

`SKILLMINT_PUBLIC_DEMO_ENABLED` is a separate server-only, default-off gate for the fixed synthetic `/demo` route. Only the exact value `true`, matched case-insensitively without whitespace normalization, enables the route. The demo is excluded from Supabase session refresh and must remain free of uploads, parsing, browser persistence, analytics, and external requests. Adding the setting to the repository does not authorize enabling it in a hosted environment.

Do not configure the account-deletion route in a Preview environment unless that preview is protected, explicitly authorized, and connected to an appropriately migrated nonproduction Supabase project.

`ANALYTICS_COLLECTION_ENABLED` controls server persistence and defaults off. `ANALYTICS_FOUNDER_USER_ID` is authorization configuration for the protected founder route. Both are server-only, independently scoped, and forbidden from browser output.

## Controlled registration boundary

`SKILLMINT_PUBLIC_SIGNUP_ENABLED` is a server-only application setting. Public signup defaults closed and is enabled only when the trimmed, case-insensitive value is exactly `true`. It must not use a `NEXT_PUBLIC_` prefix or enter browser bundles. Existing-user login remains available in either state. The public routes remain statically generated, so a registration-setting change takes effect only through a new authorized deployment.

This gate removes SkillMint's active signup UI and guards the shared auth submission path. It is not an invitation system, an authorization boundary, or a replacement for Supabase Auth's hosted **Allow new users to sign up** control. That provider-level setting was unverified and unchanged by Phase 5A. The later bounded inventory verified provider signup disabled and existing email login enabled; both must remain unchanged unless a separate action is authorized.

Phase 5A engineering implementation is complete. Enabling registration, changing hosted configuration, controlled invitations, public launch, Production schema work, and migrations remain separately authorized gates. Merge or deployment alone does not authorize controlled access.

## Operator-only database configuration

```text
SUPABASE_DB_URL=
```

`SUPABASE_DB_URL` is for controlled migration and isolated live-verification tooling. It is operator-only, is not required by the deployed Next.js runtime, and must not enter client bundles, server-runtime configuration, or ordinary Preview environments.

Load database credentials only into a sanitized disposable operator process after the local target guard validates the isolated project identity. The guard does not prove connection or schema safety. Never commit project refs, database passwords, access tokens, connection strings, or Supabase CLI link metadata.

SkillMint has no configured seed dataset. The generic `https://supabase.com/docs/...` URL in `supabase/config.toml` is a documentation link, not a hosted project endpoint.

## Environment responsibilities

- Vercel Production uses Supabase `skillmint-beta`. This repository pass authorizes no migration or setting change.
- Vercel Preview is staging-scoped and Vercel Production is Production-scoped. The Vercel Production environment-variable records were re-scoped to Production-only while preserving the Production target; the live Production deployment was not redeployed or changed, and the Production Supabase database was not contacted or changed.
- Supabase `skillmint-block6-test` received V1–V7 during Block 6 isolated verification, contains no Production data, and is connected only to Vercel Preview through staging-scoped public variables. That connection does not authorize destructive testing, migrations, or Production work. Retain it only as a test and evidence environment unless a future hosted operation receives separate authorization.

## Production schema rollout

The current authority is [Production Schema Rollout Authority](PRODUCTION_SCHEMA_ROLLOUT.md). The bounded July 30 inventory verified the exact V1+V2 versioned catalog baseline plus the known untracked `public.rls_auto_enable()` drift. It did not establish migration history or complete table grants; both remain unknown. It exposed the drift function but did not capture its live function owner, exact event-trigger contract, or body.

V9's repository preflight fails closed unless the exact expected function-owner and event-trigger contract is present, including `postgres` ownership for both the function and its sole attached event trigger, and it intentionally does not inspect the body. Authorized rehearsal and postflight must verify the body separately. V3–V8 and the new post-V8 ACL repair are unapplied catalog targets, not authorized work.

For an empty isolated environment, the committed forward order is:

1. `supabase/migrations/20260723000100_schema_v1.sql`
2. `supabase/migrations/20260723000200_schema_v2_feedback.sql`
3. `supabase/migrations/20260723000300_schema_v3_data_controls.sql`
4. `supabase/migrations/20260723000400_schema_v4_account_deletion_security.sql`
5. `supabase/migrations/20260723000500_schema_v5_analytics_events.sql`
6. `supabase/migrations/20260723000600_schema_v6_analytics_aggregation.sql`
7. `supabase/migrations/20260723000700_schema_v7_analytics_acl_hardening.sql`
8. `supabase/migrations/20260727000750_lifecycle_function_acl_normalization.sql`
9. `supabase/migrations/20260727000800_schema_v8_active_resume_selections.sql`
10. `supabase/migrations/20260730000900_public_rls_auto_enable_acl_normalization.sql`

The timestamped files are byte-identical to their source schemas and recorded in `supabase/migrations/manifest.json`. Applied SQL is immutable evidence. V1–V8 remain unchanged; later corrections require a separately reviewed forward migration.

The isolated project received V1–V7 during Block 6 verification, and its ACL and live-security checks passed. This result is not Production proof. The outer `BEGIN`/`COMMIT` wrappers in V4–V7 remain unchanged unless a separately authorized execution with pinned Supabase CLI 2.109.1 proves a specific incompatibility.

Do not mark V1 or V2 applied in history solely because the catalog matches them. An authorized operator must establish exact history before any repair or rollout. Migration repair changes history only and executes no SQL, but no repair is currently authorized. The target sequence begins at V3 only after backup, restore, history, dry-run, ownership, incident, and communications gates pass. Follow the current rollout authority; the [Block 6 Rollout Runbook](BLOCK_6_ROLLOUT_RUNBOOK.md) remains historical Block 6 guidance.

## Vercel deployment checklist

- Confirm the intended Git repository, branch behavior, and project linkage.
- Confirm Preview and Production variable names and scopes without exposing values.
- Confirm Preview remains staging-scoped and Production remains Production-scoped without exposing values.
- Change either environment scope only through separately approved configuration work.
- Confirm deployment protection and preview access before a branch push.
- Confirm the framework preset and build command use the locked source and lockfile.
- Apply and verify the approved database rollout before enabling privileged deletion functionality.
- Verify server-only variables are absent from browser/static output.
- Run production smoke tests only after the environment and schema gates pass.

## Repository launch-security baseline

Resume extraction accepts PDF, DOCX, and TXT files up to exactly 4 MiB. The
browser and server share that limit and the finite public error contract. The
server checks filename, declared type, file structure, extracted-text size, and
bounded DOCX archive metadata before analysis. DOCX inspection allows at most
256 entries, 4 MiB per expanded entry, 12 MiB total expansion, and a 100:1
entry compression ratio before Mammoth runs.

It also requires central and local ZIP metadata to agree, accepts only reviewed
flags and Microsoft padding, validates exact data descriptors, and rejects
overlapping entry ranges, unsupported extras, or data entering the central
directory. Extraction successes and typed failures use explicit no-store
response caching. Scanned or image-only PDFs fail with
`scanned_pdf_unsupported` and HTTP 422; warning or OCR guidance is never
returned as successful resume text. These bounds reduce parser and archive
exposure but do not eliminate every parser vulnerability.

Next.js serves a static security-header baseline with CSP frame protection,
`nosniff`, a strict-origin referrer policy, a bounded permissions policy, and
`X-Frame-Options: DENY`. The CSP derives the configured Supabase HTTP and
WebSocket origins rather than hardcoding a project. The current static,
non-nonce policy includes `unsafe-inline` for scripts and styles; a future
nonce- or hash-based architecture may remove that allowance, but this launch
hardening change does not implement one. `unsafe-eval` is development-only.
This static policy is a baseline, not a complete browser-security programme.

`/api/health/config` returns only `{"status":"healthy"}` with HTTP 200 or
`{"status":"degraded"}` with HTTP 503 and explicit no-store caching. It does
not expose environment-variable names, values, project identity, or internal
configuration structure.

The extraction route rejects explicit cross-origin browser requests using the
canonical request URL and a strictly parsed ordinary Host fallback. Forwarded
host values are not origin authority. This is browser-request hardening, not
authentication, authorization, or a WAF. The repository does not provide
durable distributed rate limiting or a Production WAF; hosted WAF and
rate-limit controls remain separately gated and unconfigured. Password
recovery can pass an opaque CAPTCHA token when a future verified integration
provides one; no CAPTCHA provider is configured or active.

## Production smoke checklist

- Run `npm run smoke:production` against the explicitly approved deployment.
- Verify `/api/health/config` reports only the coarse healthy status and uses
  no-store caching.
- Verify landing, signup, login, dashboard, profile, setup, resume, ATS, roadmap, feedback, and mobile navigation paths.
- Verify signed-out fallback behavior remains truthful.
- Verify safe deletion-route failures before any authorized destructive test.
- Monitor server errors and authentication/deletion events without logging credentials or personal payloads.

## Rollback and non-claims

Application rollback and database recovery are separate decisions. Redeploying an earlier application build does not reverse a database migration. Do not roll back additive security schema casually; use the approved recovery or forward-fix plan.

This guide does not claim production migration, beta readiness, production readiness, legal compliance, provider backup/log deletion, universal JWT invalidation, Safari certification, complete screen-reader certification, or permanent OS download-save proof. An externally verified privacy/support contact remains a release blocker until ownership and monitoring are confirmed.
