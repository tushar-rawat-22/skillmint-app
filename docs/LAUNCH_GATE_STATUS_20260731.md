# SkillMint Launch Gate Status — July 31, 2026

**Decision:** `NO-GO` for Production migration or controlled invitations.

**Active objective:** reach a safe controlled live cohort: 5–10 known seed users, then approximately 20 users after explicit stability review.

This record closes the isolated migration and recovery gate after PR #36 and corrects the immediate sequence. It is a bounded status record, not a new roadmap phase and not authorization to contact or change Production.

## Verified repository state

```text
MAIN=c7d31623532b34beec8d61f731e140683c5ea84a
PR36=MERGED
PR36_REVIEWED_COMMIT=bd5dc6cdb298ef8861c7310d0df088ea8bd04092
V9_SHA256=171404d422850c935300ad0384cc680a195849847705683c0b05016290e93983
OPEN_PULL_REQUESTS=0_AT_STATUS_CAPTURE
REMOTE_BRANCHES=main_only_AT_STATUS_CAPTURE
```

PR #36 repaired three invalid `pg_catalog.coalesce(...)` expressions in each byte-identical V9 SQL copy. It updated the four reviewed V9 hash references and changed no application runtime, dependency, environment, hosted configuration, or Production state. V1 through V8 remained unchanged.

## Gate closed: isolated V1+V2 through V9 and fresh restore

The following work is complete and must not be repeated unless relevant SQL, manifest, source, or recovery behavior changes:

- recreated the isolated V1+V2 baseline;
- applied V3, V4, V5, V6, V7, V7.1, V8, and repaired V9 in exact order;
- tested V9 with the function absent;
- tested the exact-compatible function and `ensure_rls` trigger contract;
- tested fail-closed mismatch cases;
- preserved representative synthetic data;
- verified migration history, owners, RLS, policies, table, column, and function ACLs;
- verified functions, triggers, and function-body identity;
- verified analytics remained empty and least-privileged;
- created separate logical role, schema, and data backups outside Git and CI;
- restored into a fresh zero-migration local recovery target;
- reproduced the source semantic fingerprint;
- restored synthetic Auth logins and owner links;
- verified deletion cascades transactionally;
- passed recovery database lint;
- destroyed disposable local targets and left no local database residue;
- did not contact Production or any hosted database.

This evidence proves the reviewed repository sequence and logical recovery method. It does not prove live Production state.

## Current Production truth

Previously verified:

```text
APPLICATION_SIGNUP=CLOSED
PROVIDER_SIGNUP=DISABLED
EXISTING_EMAIL_LOGIN=ENABLED
ANALYTICS=DISABLED
PRODUCTION_VERSIONED_SCHEMA=V1+V2
KNOWN_CATALOG_DRIFT=public.rls_auto_enable
V3_THROUGH_V9_APPLIED=NO
```

Still unresolved:

- exact remote migration history;
- complete API-role table and function grants;
- live `public.rls_auto_enable()` owner, body, security settings, and ACL;
- exact `ensure_rls` event-trigger definition and owner;
- Production data scale relevant to locks and downtime;
- verified available Production backup and current recovery capability;
- PITR decision;
- database SSL enforcement decision;
- custom SMTP;
- CAPTCHA and abuse-control decision;
- email confirmation policy;
- password policy;
- privacy/support contact ownership;
- incident, database, application, security/privacy, support, and communications ownership;
- legal review and provider backup/log-retention evidence.

Production readiness remains `NO-GO`.

## Corrected next gate

```text
NEXT_GATE=AUTHORIZE_PRODUCTION_READ_ONLY_PREFLIGHT
PRODUCTION_CONTACT_AUTHORIZED=NO
```

The next action is a founder authorization decision. It is not implied by this merge or by the completed isolated gate.

After explicit authorization, the bounded read-only preflight must establish:

1. exact target identity without printing credentials;
2. exact remote migration history;
3. complete API-role table and function grants;
4. live `public.rls_auto_enable()` identity, body, owner, security settings, and ACL;
5. exact `ensure_rls` trigger definition, owner, event, enabled mode, and tags;
6. current data scale relevant to lock and downtime planning;
7. current backup and PITR capability;
8. current Auth and security settings needed for launch decisions.

No SQL mutation, migration repair, Auth change, SMTP, CAPTCHA, SSL, DNS, analytics, signup, or invitation action is included in that preflight.

## 15-day controlled-launch operating framework

The 15-day statement remains a sequencing target, not a delivery guarantee. The old four-to-seven-working-day estimate is withdrawn because it predates the completed isolated gate and has not been recalculated against live Production conditions.

The operating sequence is:

### Window 1 — synchronize and authorize

- synchronize repository context after PR #36;
- obtain explicit authorization for the read-only Production preflight;
- stop the launch clock if authorization is not granted or target identity cannot be proved.

### Window 2 — establish live truth

- perform the bounded read-only preflight;
- reconcile live history, grants, function, trigger, Auth, security, backup, and data-scale evidence;
- produce a revised risk and schedule estimate from live facts.

### Window 3 — approve recovery and hosted hardening

- approve the recovery strategy and accountable owners;
- decide whether logical backup evidence is sufficient or a paid backup/PITR option is justified;
- decide SMTP, confirmation, CAPTCHA, password, SSL, monitoring, support/privacy contact, incident ownership, and communications;
- keep application and provider signup closed and analytics disabled.

### Window 4 — controlled Production rollout

- separately authorize V3–V9;
- approve maintenance window, abort thresholds, and postflight worksheet;
- apply one migration at a time with exact postflight after each stage;
- abort on any history, hash, catalog, owner, RLS, ACL, Auth, deletion, or analytics mismatch.

### Window 5 — seed and cohort evidence

- invite 5–10 known users only after complete postflight;
- observe onboarding, upload, analysis, Workspace, comparison, deletion, accessibility, support load, score-chasing risk, and repeat use;
- expand toward approximately 20 only after seed stability;
- do not open unrestricted acquisition.

This framework does not assign dates to unknown live conditions. The schedule must be re-baselined immediately after the read-only Production preflight.

## Executive decisions

### CEO and product

Do not add features to compensate for launch delay. Product engineering is sufficiently complete for the controlled-cohort learning objective. The next missing evidence is operational and real-user evidence.

### CTO, security, and data

Do not migrate Production while history, complete grants, live function and trigger contracts, recovery ownership, and backup capability remain unresolved.

### CFO

Do not buy infrastructure automatically. Compare temporary paid recovery capability, a verified logical backup and restore plan, downtime and incident exposure, and founder operating cost after the live preflight. Spend only when it materially reduces launch risk.

### UI/UX and accessibility

Preserve the premium light-first baseline. Broader onboarding or information-architecture work requires recurring controlled-user evidence, not founder intuition alone.

### Operations, privacy, and growth

A controlled launch requires named support, privacy, incident, communications, application, and database ownership. Do not open public signup to compensate for delayed operations.

## Hard boundaries

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

A merge, deployment, local rehearsal, or status document does not authorize any item above.
