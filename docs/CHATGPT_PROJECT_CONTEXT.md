# SkillMint — AI Executive Handover

> **Purpose:** Current continuity bootstrap for a new SkillMint conversation. Verify it against merged GitHub `main`, the connected environment, and the authorities linked below before acting. Do not restart completed gates or treat this summary as deployment authorization.

## Current checkpoint

```text
STATE_VERIFIED_DATE=2026-10-15
CANONICAL_MAIN=4e2d8618a6658749d59a77a70eafcf4258d44d58
LATEST_MERGED_PR=180
REPOSITORY=tushar-rawat-22/skillmint-app
FOUNDER_LOCAL_REPOSITORY=~/Desktop/skillmint-app
PRODUCT=SkillMint
PRODUCT_CATEGORY=Proof-aware Career Operating System
PRODUCTION_SUPABASE_PROJECT=skillmint-beta
PRODUCTION_PLAN=free
PRODUCTION_POSTGRES=17.6.1.141
APPLICATION_SIGNUP=CLOSED
ANALYTICS=DISABLED
PRODUCTION_MIGRATIONS_APPLIED=V1_THROUGH_V15_INCLUDING_V14
PENDING_MIGRATION=20261013184117_proof_brief_share_expiry.sql
PENDING_MIGRATION_SHA256=99166341fa448a69fdc4a13e03610a724e38eaeb3313e089828e5487d3a39d12
V16_APPLIED=NO
V16_AUTHORIZED=NO
V16_TECHNICAL_RECOVERY_GATE=PASS
PUBLIC_SELF_SERVICE_GATE=ISSUE_130_OPEN
```

The public website is launched with controlled account admission. Candidate and Recruiter experiences exist, but self-signup remains disabled and Request Access does not create an account. Issue #130 controls the remaining self-service, recovery-email, abuse, accessibility, cross-persona, and launch-quality acceptance.

## Mandatory startup

1. Read `docs/PROJECT_STATUS.md` and `docs/PRODUCTION_SCHEMA_ROLLOUT.md`.
2. Fetch current GitHub `main`; inspect every delta after the checkpoint above.
3. Verify current issue #130 and exact-head CI/deployment state when relevant.
4. Reconfirm the Production target before any provider operation.
5. Stop on migration, hash, catalog, authorization, or target-identity mismatch.
6. Never infer Production write authority from a merge, deployment, passing preflight, backup, or this handover.

## Local workspace safety

The founder-local checkout at `~/Desktop/skillmint-app` may contain uncommitted OAuth and other founder work. Never reset, clean, discard, overwrite, or use it for release certification. Work from a clean isolated worktree, stop if that worktree becomes unexpectedly dirty, and reconcile only the isolated worktree after a merge. Follow the repository [engineering instructions](../AGENTS.md) for destructive-action, secret, Production, and verification boundaries.

## Product truth to preserve

- Career IQ and Proof Confidence are deterministic supporting signals, not hiring probability or guarantees.
- Missing proof means unverified, not false.
- Profile-fit Roles and Latest JD Match remain separate.
- Active Target changes focus, not scores.
- Mission completion records self-progress; only later evidence re-analysis can affect scores.
- Browser-active reports, account-saved history, and account Workspace selection have distinct authority.
- Account A data must never create, overwrite, publish, or expose Account B state.
- Browser clearing, saved-report deletion, and protected account deletion are separate operations.
- Candidate job lifecycle is durable and Production-proven, but it never invents employer outcomes.
- Recruiter collaboration is candidate-authorized and exposes a bounded Proof Brief rather than raw resume content.

## Current Production and V16 truth

Read-only verification on October 15 reconfirmed the canonical `skillmint-beta` project and connected provider identity, exact migration history through V15 including V14, V16 absent, fourteen expected `public` tables with RLS, the expected function/ACL contracts, and no relevant catalog drift. Source and migration copies of V16 are byte-identical at the SHA-256 above.

The documented pinned Supabase CLI `2.109.1` dry run showed exactly V16 pending with no unexpected migration or seed operation. V16 changes only the two Proof Brief authorization functions plus their grants/comments. It remains unapplied and unauthorized.

## Recovery certification

The existing October 14 encrypted logical backup was reused; no second backup was created. The image is AES-256 encrypted, owner-only, protected by FileVault, and opened read-only using a random key held in the macOS login Keychain. Checksums verified for the image, roles, schema, data, and migration history.

The exact backup restored successfully into a disposable local Supabase/PostgreSQL 17.11 environment. The isolated restore verified row counts without reading private row contents, migration history, constraints, RLS, policies, functions, triggers, event triggers, and effective permissions. Catalog fingerprints matched the read-only Production inventory. The database restore itself completed in approximately 0.41 seconds; total service recovery time is not established.

Two explicit logical-recovery steps are required:

1. create the empty `supabase_migrations.schema_migrations` target before replaying the official migration-history dump; and
2. after restore, normalize API-role ACLs from the schema dump and recreate the global `ensure_rls` event trigger from the reviewed repository/Production contract.

Those operations were performed only in the disposable local environment. The final local role state was returned to the Supabase baseline, verification passed, and the disposable database was destroyed.

The current backup retention certification expires at `2026-10-21T11:14:05Z`. If V16 is not authorized by then, produce and certify a fresh backup before any rollout. After a successful postflight or cancellation, delete the image and Keychain item within 24 hours under the recorded policy.

## Recovery limits

The logical dump includes database roles, schemas, data, Auth database rows, Storage database metadata, and migration history. It does not include Storage object bytes, JWT/API/database credentials, custom role passwords, hosted Auth and OAuth/SMTP/redirect/CAPTCHA settings, Edge Functions or their secrets, Vercel configuration, DNS, firewall, or other provider configuration.

The October 14 capture contained zero Storage buckets and zero Storage objects, so no object bytes were missing for that captured state. This does not prove that future Storage state is covered. Supabase Free provider-managed backup/PITR guarantees remain unavailable or unverified; the tested encrypted logical backup is the current recovery evidence.

## V16 release boundary

Technical status is **READY FOR FOUNDER APPROVAL**, not approved to deploy. Before a Production write, a founder-signed dated record must name:

- exact canonical `main` and V16 SHA-256;
- exact Production project;
- operator and maintenance window;
- recovery owner and current, unexpired backup artifact;
- abort thresholds and postflight contract; and
- the decision to authorize only V16.

Abort before execution on target/history/hash drift, a dry run showing anything except V16, expired or unreadable recovery evidence, catalog/ACL/function mismatch, unexpected active-share state, missing operator/recovery ownership, or incomplete observability. A pre-commit failure rolls back the transactional migration. After commit, stop promotion and use a reviewed forward repair; database restoration is an incident decision, not an automatic UI rollback.

## Authority order

1. Merged GitHub `main` and current provider evidence.
2. `docs/PRODUCTION_SCHEMA_ROLLOUT.md` for database execution and recovery.
3. `docs/PROJECT_STATUS.md` and active issue #130 for product/release state.
4. `docs/DEPLOYMENT.md` for operator flow.
5. `docs/V2_DYNAMIC_EXECUTION_ROADMAP.md` for strategic sequencing.
6. This handover.
7. Dated release snapshots and historical TODO/planning documents.

No document, check, backup, or technical GO authorizes Production migration, hosted Auth/configuration change, analytics activation, public signup, payment, domain/DNS change, or public launch without its separate human decision.
