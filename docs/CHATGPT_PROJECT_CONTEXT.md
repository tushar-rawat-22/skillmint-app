# SkillMint — AI Executive Handover

> **Purpose:** This is the canonical bootstrap for a new SkillMint conversation. Verify it against current GitHub evidence before acting. Do not restart planning, repeat completed gates, or ask Tushar to reconstruct project history.

## 1. Current state

```text
STATE_VERIFIED_DATE=2026-07-31
MATERIAL_GATE_BASELINE_MAIN=c7d31623532b34beec8d61f731e140683c5ea84a
LAST_MATERIAL_GATE_PR=36
LAST_MATERIAL_GATE_MERGE=c7d31623532b34beec8d61f731e140683c5ea84a
LATEST_PRODUCT_PR=33
LATEST_PRODUCT_IMPLEMENTATION_COMMIT=7eee335f1abe557047f4e963579cf1776bf0dc9d
REPOSITORY=tushar-rawat-22/skillmint-app
LOCAL_REPOSITORY=~/Desktop/skillmint-app
DEFAULT_BRANCH=main

PRODUCT=SkillMint
PRODUCT_CATEGORY=Proof-aware Career Operating System
FOUNDER=Tushar Rawat

PRODUCTION_URL=https://skillmint-app-three.vercel.app
PRODUCTION_SUPABASE_PROJECT=skillmint-beta
ISOLATED_TEST_PROJECT=skillmint-block6-test

APPLICATION_SIGNUP=CLOSED
PROVIDER_SIGNUP=DISABLED
EXISTING_EMAIL_LOGIN=ENABLED
ANALYTICS=DISABLED

PRODUCTION_VERSIONED_SCHEMA=V1+V2
KNOWN_CATALOG_DRIFT=public.rls_auto_enable
PENDING_PRODUCTION_MIGRATIONS=V3_THROUGH_V9
PRODUCTION_READINESS=NO_GO

ISOLATED_V1_V2_TO_V9_REHEARSAL=PASS
FRESH_LOGICAL_RESTORE=PASS
REVIEWED_V9_SHA256=171404d422850c935300ad0384cc680a195849847705683c0b05016290e93983

ACTIVE_BUSINESS_GOAL=CONTROLLED_LIVE_COHORT
SEED_SUBSET=5_TO_10_KNOWN_USERS
CONTROLLED_COHORT_TARGET=APPROXIMATELY_20_USERS
NEXT_GATE=AUTHORIZE_PRODUCTION_READ_ONLY_PREFLIGHT

PRODUCTION_CONTACT_AUTHORIZED=NO
PRODUCTION_MIGRATION_AUTHORIZED=NO
PRODUCTION_AUTH_CHANGE_AUTHORIZED=NO
HOSTED_CONFIGURATION_CHANGE_AUTHORIZED=NO
CONTROLLED_INVITATIONS_AUTHORIZED=NO
PUBLIC_LAUNCH_AUTHORIZED=NO
```

The objective is a safe controlled cohort, not another feature cycle. Every remaining gate must remove a demonstrated launch blocker and have an explicit exit condition.

The baseline fields intentionally identify the last material product and launch-gate closure. They do not attempt to name the documentation merge commit that contains this file. Every new session must verify the current repository head; a newer documentation-only context merge does not by itself change product, Production, authorization, or launch state.

## 2. Mandatory new-chat startup

Before recommending or changing anything:

1. Read this file.
2. Verify through the connected GitHub repository:
   - repository access and visibility;
   - current `main` HEAD;
   - open pull requests and branches;
   - recent merged pull requests;
   - the authoritative documents listed below.
3. Treat current GitHub `main` and newer explicitly authorized live evidence as higher authority than this file.
4. Inspect a newer `main` delta before deciding that product or launch state changed.
5. Do not repeat the isolated V1+V2-to-V9 rehearsal and restore drill unless relevant SQL, migration manifests, recovery behavior, or source contracts changed.
6. Do not contact Production, change hosted configuration, enable signup or analytics, configure SMTP or DNS, or invite users without separate explicit authorization.
7. Do not create another broad audit phase or expand product scope to compensate for operational blockers.

### Authoritative documents

Read and reconcile:

- `docs/PROJECT_STATUS.md`
- `docs/TODO.md`
- `docs/V2_TRANSITION_GATE.md`
- `docs/V2_DYNAMIC_EXECUTION_ROADMAP.md`
- `docs/PRODUCTION_SCHEMA_ROLLOUT.md`
- `docs/DEPLOYMENT.md`
- `README.md`
- `docs/LAUNCH_GATE_STATUS_20260731.md`

Some older status lines still describe the isolated rehearsal as pending. Current GitHub evidence, PR #36, and the July 31 launch-gate status record supersede those stale lines. Do not repeat the completed gate.

## 3. Company and product truth

SkillMint helps students, freshers, job seekers, and early-career users move through:

```text
Resume Reality
→ Profile-fit Roles
→ Active Target
→ Proof Confidence
→ Career IQ
→ Latest JD Match
→ Roadmap / Missions
→ Evidence improvement
→ Re-analysis and re-score
```

Non-negotiable product boundaries:

- Career IQ is a deterministic, proof-aware readiness signal. It is not hiring probability, placement probability, interview probability, employability probability, or a guarantee.
- Proof Confidence measures support visible in the resume context. It is not independent third-party verification. Missing proof means unverified, not false.
- Profile-fit Roles and Latest JD Match answer different questions and must remain separate.
- Active Target changes focus and prioritization, not Career IQ, Proof Confidence, role fit, or JD Match scores.
- Mission completion records self-progress. It does not create evidence or directly change a score.
- Scores change only after underlying evidence changes and a later analysis detects that change.
- Saved analyses are immutable account history.
- Account Workspace selection and the browser-active report remain separate.
- Resume comparison is evidence-only and must not imply causal progress, hiring probability, or fabricated score movement.
- Account A data must never create, overwrite, publish, or expose Account B state. Delayed work begun for A may finish only as A.
- Browser clearing, saved-report deletion, and protected backend account deletion are separate operations with truthful outcomes.
- Analytics remains separate from scoring, missions, product claims, and person-level surveillance.

## 4. Completed product and engineering work

### Frozen foundation

- Premium light-first responsive UI and accessibility foundation.
- Deterministic Career IQ, Proof Confidence, ATS, role-fit, mission, and career-path contracts.
- Active Target and one-JD workflow with stale-JD protection.
- Owner-aware browser persistence and account-switch race protection.
- Export, Trust Center, browser clearing, saved-report deletion, and protected account deletion.
- Structured beta feedback.
- Privacy-safe analytics collection runtime and founder dashboard implementation, still disabled in Production.

### Version 2

- **Phase 1 — Resume Workspace:** explicit account-owned selection over immutable saved analyses, separate from the browser-active report.
- **Phase 2 — Resume Progress and Comparison:** exactly two explicit same-owner saved reports, deterministic sanitized evidence comparison, no score comparison, and no persistent comparison history.
- **Phase 3 — Explainability truth repair:** removed the unsupported numeric Projected Readiness Path without adding a replacement prediction or probability.
- **Phase 4 — Upload accessibility repair:** keyboard-reachable native chooser, accurate copy, visible focus, processing status and busy semantics, and failure alert semantics.
- **Phase 5A — Controlled Access Foundation:** server-only, default-closed application signup while existing-user login remains available.
- **Phase 5B — Production Rollout Foundation:** offline readiness validator, rollout authority, deterministic fixtures, and fail-closed V9 ACL normalization.

Deferred launch scope remains unchanged: AI chat, resume rewriting, auto-apply, job scraping, recruiter tools, institution dashboards, payments, subscriptions, unrestricted analytics, broad UI redesign, and unrestricted public signup.

## 5. PR #36 and V9 closure

PR #36 repaired three invalid `pg_catalog.coalesce(...)` expressions in each byte-identical V9 SQL copy and updated the four reviewed hash references.

```text
MIGRATION=20260730000900_public_rls_auto_enable_acl_normalization.sql
SHA256=171404d422850c935300ad0384cc680a195849847705683c0b05016290e93983
APPLIED_TO_PRODUCTION=NO
```

V9 leaves `public.rls_auto_enable()` alone when absent. When present, it requires the exact reviewed function, owner, and `ensure_rls` event-trigger contract before revoking effective execution from `PUBLIC`, `anon`, `authenticated`, and `service_role`. It does not change the function body, owner, event trigger, or default privileges.

The isolated gate is complete:

- V1+V2 baseline recreated;
- V3, V4, V5, V6, V7, V7.1, V8, and repaired V9 applied in exact order;
- absent, exact-compatible, and fail-closed V9 paths tested;
- synthetic data preserved;
- history, owners, RLS, policies, table, column, and function ACLs verified;
- functions, triggers, and function-body identity verified;
- logical roles, schema, and data restored into a fresh recovery target;
- source and restored semantic fingerprints matched;
- synthetic Auth logins and owner links were restored;
- deletion cascades and database lint passed;
- disposable database targets were destroyed;
- Production and hosted databases were not contacted.

This proves the repository sequence and logical recovery method. It does not prove the live Production catalog, migration history, grants, function body, trigger contract, data scale, backup capability, or hosted configuration.

## 6. Current Production truth

Confirmed from previously authorized evidence:

```text
APPLICATION_SIGNUP=CLOSED
PROVIDER_SIGNUP=DISABLED
EXISTING_EMAIL_LOGIN=ENABLED
ANALYTICS=DISABLED
VERSIONED_CATALOG_BASELINE=V1+V2
KNOWN_UNTRACKED_DRIFT=public.rls_auto_enable
V3_THROUGH_V9_APPLIED=NO
```

Still unknown without an explicitly authorized read-only Production preflight:

```text
REMOTE_MIGRATION_HISTORY=UNKNOWN
COMPLETE_API_ROLE_TABLE_GRANTS=UNKNOWN
LIVE_RLS_AUTO_ENABLE_OWNER=UNKNOWN
LIVE_RLS_AUTO_ENABLE_BODY=UNKNOWN
LIVE_ENSURE_RLS_TRIGGER_CONTRACT_AND_OWNER=UNKNOWN
CURRENT_DATA_SCALE_FOR_LOCK_AND_DOWNTIME_PLANNING=UNKNOWN
CURRENT_BACKUP_AND_PITR_CAPABILITY=UNVERIFIED
```

Open operational blockers:

```text
VERIFIED_AVAILABLE_PRODUCTION_BACKUP=NO
PITR=DISABLED
DATABASE_SSL_ENFORCEMENT=DISABLED
CUSTOM_SMTP=ABSENT
CAPTCHA=DISABLED
EMAIL_AUTOCONFIRM=ENABLED
PASSWORD_MINIMUM=6
PRIVACY_SUPPORT_CONTACT_OWNERSHIP=UNVERIFIED
INCIDENT_AND_OPERATIONAL_OWNERSHIP=UNRESOLVED
LEGAL_REVIEW=UNRESOLVED
PROVIDER_BACKUP_AND_LOG_RETENTION=UNVERIFIED
```

Production readiness remains `NO_GO`.

## 7. Immediate next gate

### `AUTHORIZE_PRODUCTION_READ_ONLY_PREFLIGHT`

This is an authorization decision, not permission already granted.

After Tushar explicitly authorizes the bounded read-only Production preflight, it must establish without printing credentials or personal data:

1. exact Production target identity;
2. exact remote migration history;
3. complete API-role table and function grants;
4. live `public.rls_auto_enable()` identity, body, owner, security settings, and ACL;
5. exact `ensure_rls` event-trigger name, owner, event, enabled mode, and tags;
6. current data scale relevant to lock and downtime planning;
7. current backup and PITR capability;
8. current Auth and security settings needed for launch decisions.

The preflight is read-only. It does not authorize migration repair, SQL execution, Auth changes, SMTP, CAPTCHA, SSL enforcement, DNS, analytics, signup, or invitations.

## 8. Remaining sequence to controlled users

1. Obtain explicit authorization for the read-only Production preflight.
2. Reconcile live state with the reviewed V3–V9 sequence.
3. Approve recovery strategy, owners, encrypted storage, checksums, retention, deletion, and restoration evidence.
4. Decide hosted hardening: SMTP, confirmation policy, CAPTCHA and abuse controls, password policy, SSL enforcement, monitoring, privacy/support contact, incident ownership, and communications.
5. Approve a maintenance window, abort thresholds, postflight worksheet, and operator roles.
6. Separately authorize V3–V9 Production migration.
7. Apply one migration at a time with postflight after every stage; keep signup and analytics closed.
8. Invite 5–10 known users only after complete Production postflight.
9. Expand toward approximately 20 only after seed stability, comprehension, accessibility, support-load, and privacy/security review.
10. Expand to 50, 100, and 200 only after explicit cohort reviews.

The 15-day statement is a sequencing target, not a guarantee. Do not reuse the old four-to-seven-working-day estimate. Re-estimate only after the read-only preflight establishes the actual live conditions.

## 9. Hard authorization boundaries

Until separately authorized:

```text
PRODUCTION_CONTACT=NO
PRODUCTION_MIGRATION=NO
PRODUCTION_AUTH_CHANGE=NO
HOSTED_CONFIGURATION_CHANGE=NO
ANALYTICS_ACTIVATION=NO
CONTROLLED_INVITATIONS=NO
PUBLIC_LAUNCH=NO
PAYMENTS=NO
DOMAIN_CONNECTION=NO
SMTP_CONFIGURATION=NO
```

A merge, Vercel deployment, local rehearsal, or documentation change is not authorization for any item above.

## 10. Stop conditions

Stop immediately when:

- current `main` differs and the delta is not understood;
- the worktree or branch scope is unexpectedly dirty;
- target environment identity cannot be proved;
- a migration hash differs;
- V1–V8 change;
- live migration history or grants remain ambiguous at a write gate;
- the live V9 object, body, owner, or trigger contract differs;
- backup restoration is unproved;
- a migration partially applies;
- Auth, owner isolation, deletion, or analytics boundaries regress;
- a command could enable signup, analytics, SMTP, DNS, or public acquisition without authorization;
- evidence overstates what was verified;
- a paid upgrade lacks a concrete launch-risk benefit.

## 11. Executive operating roles

For every material action, act as founder-partner, CEO, CTO, CPO, CFO, CXO, security architect, data architect, SRE/DevOps lead, QA/release lead, UI/UX and accessibility lead, privacy/legal-risk lead, operations/support lead, and growth/launch lead.

The final recommendation must state the decision, evidence, assumptions, risks, rejected alternatives, authorization boundary, and exit condition without exposing private chain-of-thought.

## 12. Founder collaboration rules

- Terminal-first and beginner-safe.
- Give exact paste-ready commands and identify the correct Terminal or browser window.
- Prefer one consolidated safe block over many small steps.
- Make the technical recommendation instead of returning undefined judgment.
- When requesting a local file, include a macOS Finder reveal command.
- Preserve maintainer-written, natural prose.
- Use larger work chunks to conserve limits.
- Warn before practical conversation context becomes risky and produce a concise continuation handover.
- Never expose credentials, service-role values, personal data, resume content, backup contents, environment files, or private recovery evidence.

## 13. Authority order

1. Current GitHub `main` and merged commits.
2. Newer explicitly authorized live evidence.
3. `docs/LAUNCH_GATE_STATUS_20260731.md` for the PR #36 and rehearsal closure.
4. `docs/PROJECT_STATUS.md`.
5. `docs/TODO.md`.
6. `docs/V2_TRANSITION_GATE.md`.
7. `docs/V2_DYNAMIC_EXECUTION_ROADMAP.md`.
8. `docs/PRODUCTION_SCHEMA_ROLLOUT.md`.
9. `docs/DEPLOYMENT.md`.
10. This bootstrap file.
11. Historical handovers and chats.

Update this file only after a major gate closure, Production change, rollback, incident, launch-objective change, or material executive decision. Do not create documentation churn after every small fix.
