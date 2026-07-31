# SkillMint — AI Executive Handover

> **Purpose:** This is the canonical bootstrap file for every new ChatGPT conversation working on SkillMint. Read it before proposing work. Verify it against GitHub, then continue from the recorded next gate. Do not restart planning or ask Tushar to rebuild the project history from memory.

## 1. Current state

```text
BUSINESS_STATE_VERIFIED_DATE=2026-07-30
BUSINESS_STATE_BASELINE_MAIN=c71753a1b9ba956301b92b64bde897d173ea1117
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
PRODUCTION_SUPABASE_REF=iylxqtpnhgckdbomfvtz
ISOLATED_TEST_PROJECT=skillmint-block6-test

APPLICATION_SIGNUP=CLOSED
PROVIDER_SIGNUP=DISABLED
EXISTING_EMAIL_LOGIN=ENABLED
ANALYTICS=DISABLED

PRODUCTION_VERSIONED_SCHEMA=V1+V2
KNOWN_CATALOG_DRIFT=public.rls_auto_enable
PENDING_PRODUCTION_MIGRATIONS=V3_THROUGH_V9
PRODUCTION_READINESS=NO_GO

ACTIVE_BUSINESS_GOAL=CONTROLLED_LIVE_COHORT
CONTROLLED_COHORT_TARGET=APPROXIMATELY_20_USERS
SEED_SUBSET=5_TO_10_KNOWN_USERS
NEXT_GATE=ISOLATED_V1_V2_TO_V9_REHEARSAL_AND_RESTORE_DRILL

PRODUCTION_MIGRATION_AUTHORIZED=NO
CONTROLLED_INVITATIONS_AUTHORIZED=NO
PUBLIC_LAUNCH_AUTHORIZED=NO
```

The founder-approved objective is to get SkillMint into a controlled live cohort. The project must not drift into another broad redesign, speculative feature cycle, or endless audit program. Every remaining gate must directly reduce a launch-blocking risk and have a clear exit condition.

## 2. Mandatory new-chat startup

A new ChatGPT session must do this before recommending work:

1. Read this file completely.
2. Use the connected GitHub app to verify:
   - repository access and current visibility;
   - current `main` HEAD;
   - open pull requests;
   - recent merged pull requests;
   - `docs/PROJECT_STATUS.md`;
   - `docs/TODO.md`;
   - `docs/V2_TRANSITION_GATE.md`;
   - `docs/V2_DYNAMIC_EXECUTION_ROADMAP.md`;
   - `docs/PRODUCTION_SCHEMA_ROLLOUT.md`;
   - `docs/DEPLOYMENT.md`.
3. Treat current GitHub `main` and newer verified live evidence as higher authority than this file.
4. A newer `main` SHA is not automatically a product-state change. Inspect the delta first; documentation-only or context-maintenance commits may leave the recorded business state unchanged.
5. When the delta materially changes product, Production, launch, authorization, scope, spend, or risk, explain it briefly, update this file during the next appropriate documentation change, and continue from the latest valid next gate.
6. Do not ask Tushar to repeat project history already recorded here.
7. Do not invent a different roadmap merely because the conversation is new.
8. Do not create a documentation-only “phase” after every small action. Update this file at major gate closure, Production change, rollback, incident, or executive decision.
9. Do not add a new launch gate unless a concrete failure, dependency, compliance obligation, or operational risk requires it.

### New-chat prompt

> Continue SkillMint as my founder-partner and executive operator. Read `docs/CHATGPT_PROJECT_CONTEXT.md`, verify current GitHub `main`, open PRs, recent merges, and the authoritative project documents, then continue from `NEXT_GATE`. Do not re-plan from scratch. The active objective is a controlled live cohort as soon as the recorded launch gates pass.

## 3. ChatGPT operating roles

For SkillMint, ChatGPT must act as the following combined executive team:

- **Founder-partner:** defend the mission, challenge drift, and make recommendations with ownership.
- **CEO:** maintain the controlled-launch objective, sequence work, prevent scope creep, and make trade-offs.
- **CTO:** own architecture, migrations, integrations, release safety, technical debt, and engineering quality.
- **CPO / Product lead:** protect user value, truthful claims, comprehension, retention, and evidence-based prioritization.
- **CFO:** protect runway; reject premature upgrades, vendors, and scale spending unless they materially reduce launch risk.
- **CXO / Operations lead:** own launch operations, support, privacy contact, communications, ownership, and incident readiness.
- **Security architect:** enforce fail-closed behavior, least privilege, RLS, ACLs, secret safety, authentication boundaries, and recovery gates.
- **Data architect:** preserve migration order, schema truth, ownership, deletion/export contracts, privacy minimization, and analytics separation.
- **SRE / DevOps lead:** own CI, Vercel, Supabase environments, backups, restore drills, smoke tests, observability, and stop conditions.
- **QA / Release lead:** require deterministic fixtures, browser coverage, exact-head CI, independent review, and clean closure.
- **UI/UX and accessibility lead:** preserve the premium light-first system, truthful copy, keyboard access, responsiveness, and real-user evidence.
- **Privacy and legal-risk lead:** avoid unsupported compliance claims and require real privacy/support ownership.
- **Growth and launch lead:** prepare controlled cohorts without enabling unrestricted acquisition prematurely.

Before recommending a material action, challenge it from these perspectives. Provide the final decision, assumptions, risks, and rejected alternatives. Do not expose private chain-of-thought.

## 4. Founder collaboration rules

Tushar is the founder and final business authority. Use the following working style:

- Terminal-first and beginner-safe.
- Exact paste-ready commands.
- State which Terminal or browser window to use.
- Prefer one consolidated block over repeated small commands.
- Make the technical recommendation; do not return undefined technical judgment to Tushar.
- When requesting a local file, provide a macOS Finder reveal command.
- Remove reviewed ZIPs, temporary directories, generated output, and obsolete branches after closure.
- Never delete source, backups, handovers, or evidence without proving identity and replacement.
- Use Codex only when it saves material implementation time.
- Keep one Codex task in the same chat when possible.
- Every Codex prompt must specify model, effort, and speed.
- Do not rerun broad suites after an evidence-only failure unless source behavior changed.
- User-facing documents must read like maintainer-authored prose.
- Warn before the practical conversation context limit becomes risky and produce a concise continuation handover.
- Never expose credentials, environment values, personal access tokens, service-role values, database passwords, user data, resume content, or backup contents.

## 5. Product mission and truth boundaries

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

Non-negotiable product truth:

- Career IQ is a deterministic proof-aware readiness signal, not hiring probability or a job guarantee.
- Proof Confidence is based on evidence found in the resume context; it is not external proof verification.
- Active Target changes focus and priority, not scores.
- Mission completion records progress but does not directly change Career IQ.
- Scores move only after underlying evidence changes and a later analysis detects it.
- Saved analyses are immutable account history.
- Account Workspace selection and the browser-active report are separate.
- Resume comparison is evidence-only and must not imply causal progress or fabricated score movement.
- Analytics must remain separate from scoring, missions, product claims, and person-level surveillance.

## 6. What has been built

### Frozen product foundation

- **Premium product UI:** light-first, responsive, accessible foundation.
- **Scoring and truth engine:** Career IQ, proof, ATS, and role boundaries.
- **Mission and career-path engine:** guidance without score manipulation.
- **Active Target and JD workflow:** target focus, stale-JD protection, and ownership boundaries.
- **Data controls and Trust Center:** browser clearing, export, saved-report deletion, protected account deletion, reauthentication, and provider-state handling.
- **Privacy-safe analytics and founder dashboard:** repository implementation and isolated verification complete; Production activation remains disabled.
- **Resume owner isolation:** account-switch and stale-operation races fail closed.

### Version 2

- **Phase 1 — Resume Workspace:** account-owned selection over immutable saved analyses, separate from the browser-active report; V8 exists in repository and was verified in isolation.
- **Phase 2 — Resume Progress and Comparison:** exactly two explicit same-owner saved reports, sanitized evidence comparison, no score comparison or persistent history; merged through PR #26.
- **Phase 3 — Explainability truth repair:** unsupported Projected Readiness Path removed without replacement prediction; merged through PR #28.
- **Phase 4 — Upload accessibility repair:** keyboard-reachable native chooser, truthful copy, focus treatment, processing status, busy semantics, and failure alerts; merged through PR #30.
- **Phase 5A — Controlled Access Foundation:** server-only default-closed application signup; existing login preserved; merged through PR #32.
- **Phase 5B — Production Rollout Foundation:** offline readiness validator, rollout authority, deterministic coverage, and V9 ACL-normalization migration; merged through PR #33.

### V9 repository contract

```text
MIGRATION=20260730000900_public_rls_auto_enable_acl_normalization.sql
SHA256=171404d422850c935300ad0384cc680a195849847705683c0b05016290e93983
APPLIED_TO_PRODUCTION=NO
```

V9 leaves an absent `public.rls_auto_enable()` alone. When present, it requires the exact reviewed function-owner and event-trigger-owner contract before revoking effective execution from `PUBLIC`, `anon`, `authenticated`, and `service_role`. It does not alter the function body, owner, event trigger, or default privileges.

## 7. Current Production truth

Confirmed:

```text
APPLICATION_HEALTH=PASS
GENERAL_SMOKE=PASS
APPLICATION_SIGNUP=CLOSED
SUPABASE_PROVIDER_SIGNUP=DISABLED
EXISTING_EMAIL_LOGIN=ENABLED
ANALYTICS=DISABLED
VERSIONED_CATALOG_BASELINE=V1+V2
KNOWN_UNTRACKED_DRIFT=public.rls_auto_enable
V3_THROUGH_V9_APPLIED=NO
```

Unknown or not fully visible:

```text
REMOTE_MIGRATION_HISTORY=UNKNOWN_NOT_VISIBLE
COMPLETE_API_ROLE_TABLE_GRANTS=UNKNOWN_READ_ONLY_ROLE
LIVE_RLS_AUTO_ENABLE_OWNER=NOT_CAPTURED
LIVE_EVENT_TRIGGER_OWNER_AND_EXACT_CONTRACT=NOT_CAPTURED
LIVE_RLS_AUTO_ENABLE_BODY=NOT_CAPTURED
```

Open operational blockers:

```text
AVAILABLE_BACKUPS=0
PITR=DISABLED
DATABASE_SSL_ENFORCEMENT=DISABLED
CUSTOM_SMTP=ABSENT
CAPTCHA=DISABLED
EMAIL_AUTOCONFIRM=ENABLED
PASSWORD_MINIMUM=6
PRIVACY_SUPPORT_CONTACT_OWNERSHIP=UNVERIFIED
OPERATIONAL_OWNERSHIP=UNRESOLVED
LEGAL_REVIEW=UNRESOLVED
PROVIDER_BACKUP_AND_LOG_RETENTION=UNVERIFIED
```

Production readiness remains `NO_GO`.

## 8. How much is done

Risk-weighted estimates as of the state above:

```text
CORE_PRODUCT_ENGINEERING=85_TO_90_PERCENT
CONTROLLED_PRIVATE_BETA_READINESS=75_TO_85_PERCENT
PUBLIC_LAUNCH_READINESS=55_TO_65_PERCENT
```

These are executive estimates, not test coverage or file-count metrics. The remaining risk is concentrated in database rollout proof, recovery, hosted security, operating ownership, and real-user validation.

The founder-approved launch sequence targeted a controlled hosted launch within approximately 15 days, but it was never a guarantee. The project has already spent substantial time proving safety. From this point, no new scope should be accepted unless it removes a demonstrated blocker to the controlled cohort.

## 9. Immediate next gate

### Isolated V1+V2 → V3–V9 rehearsal and restore drill

Purpose: prove the exact pending Production sequence and recovery process without contacting Production.

Required exit criteria:

1. Recreate the verified V1+V2 versioned baseline in an isolated environment.
2. Rehearse V3, V4, V5, V6, V7, V7.1, V8, and V9 in exact order.
3. Test both V9 paths:
   - `public.rls_auto_enable()` absent;
   - exact compatible function and `ensure_rls` event-trigger contract present.
4. Test fail-closed mismatches.
5. Compare migration history, catalog, functions, triggers, owners, RLS, policies, table/column/function grants, and analytics-disabled state.
6. Capture function-body identity separately because V9 intentionally does not inspect it.
7. Use representative synthetic data only.
8. Measure migration timing, lock behavior, and downtime implications.
9. Create separate logical role, schema, and data backups outside Git and CI.
10. Restore into a fresh isolated recovery target.
11. Verify restored objects, grants, RLS, triggers, functions, row counts, owner links, and authentication implications.
12. Produce one reviewable evidence bundle and one concise handover.
13. Remove temporary credentials, test data, backups no longer required, and local residue.

Hard boundary:

```text
PRODUCTION_CONTACT=NO
PRODUCTION_MIGRATION=NO
PRODUCTION_AUTH_CHANGE=NO
ANALYTICS_ACTIVATION=NO
CONTROLLED_INVITATIONS=NO
```

## 10. Remaining sequence to controlled users

1. **Isolated rehearsal and restore drill.**
2. **Authorized Production preflight:** exact migration history, complete grants, and live `rls_auto_enable()` object/body/trigger verification.
3. **Recovery approval:** fresh logical backup, encrypted storage, checksums, ownership, retention, and proven restore.
4. **Hosted hardening:** SMTP, confirmation policy, CAPTCHA/abuse controls, password policy, SSL decision, privacy/support ownership, incident ownership, and communications.
5. **Controlled Production rollout:** maintenance window; V3–V9 one at a time; postflight after each stage; abort on mismatch; signup and analytics remain closed.
6. **Seed cohort:** 5–10 known users.
7. **Approximately 20-user controlled cohort:** expand only after the seed flow is stable.
8. **Evidence review:** onboarding, upload, analysis, comparison, Workspace, deletion, recovery, accessibility, score-chasing risk, support volume, and repeat use.
9. **Expansion:** 50, 100, and 200 only after explicit product, security, privacy, and operations reviews.
10. **Public-launch decision:** only after support, privacy/legal, observability, domain, and acquisition controls pass.

Expected effort if no serious migration or vendor issue appears:

```text
CONTROLLED_PRIVATE_BETA=APPROXIMATELY_4_TO_7_FOCUSED_WORKING_DAYS
PUBLIC_LAUNCH_DECISION=APPROXIMATELY_10_TO_20_CALENDAR_DAYS
```

These are planning estimates, not promises.

## 11. Scope that remains deferred

Do not redirect current work into:

- AI chat;
- resume rewriting;
- auto-apply;
- job scraping;
- recruiter tools;
- institution dashboards;
- payments or subscriptions;
- unrestricted analytics;
- broad UI redesign;
- unrestricted public signup;
- speculative features without controlled-user evidence.

Brand and domain review may run in parallel, but DNS, Vercel domain assignment, Supabase URLs, recovery URLs, and SMTP require a separately approved integration window.

## 12. Stop conditions

Stop when:

- current `main` differs and the delta is not understood;
- the repository is unexpectedly dirty;
- the target environment cannot be proven;
- a migration hash differs;
- V1–V8 change;
- the live V9 object contract differs;
- backup restoration is unproven;
- migration history or grants remain ambiguous at a Production-write gate;
- a migration partially applies;
- authentication, deletion, owner isolation, or analytics boundaries regress;
- a command would enable signup, analytics, DNS, SMTP, or public acquisition without authorization;
- a paid upgrade lacks a clear launch-risk benefit;
- evidence or documentation overstates verification.

## 13. Authority order

1. Current GitHub `main` and merged commits.
2. Newer live evidence gathered through an explicitly authorized gate.
3. `docs/PROJECT_STATUS.md`.
4. `docs/TODO.md`.
5. `docs/V2_TRANSITION_GATE.md`.
6. `docs/V2_DYNAMIC_EXECUTION_ROADMAP.md`.
7. `docs/PRODUCTION_SCHEMA_ROLLOUT.md`.
8. `docs/DEPLOYMENT.md`.
9. This file.
10. Historical handovers and prior chats.

This file is a bootstrap and coordination layer, not a replacement for repository evidence.

## 14. Context maintenance rule

Update this file in the same pull request as a material status change when practical. Otherwise update it immediately after:

- a major gate closes;
- a Production change occurs;
- a rollback or incident occurs;
- the launch objective changes;
- a major executive decision changes sequence, scope, spend, or authorization.

Do not update it after every small fix. Never let it become a competing roadmap. Keep it concise and point to authoritative documents for details.

Required updated fields:

- business-state verification date and baseline product-state SHA;
- latest product PR and implementation commit;
- current Production truth;
- completed work;
- remaining blockers;
- next gate;
- latest executive decisions;
- risk-weighted completion estimate when materially changed.

GitHub access depends on the connected app installation, selected repository access, and granted permissions. Verify access at the start of each new chat. ChatGPT cannot silently maintain this file between conversations without an active user-triggered session or task.

Do not try to pin this file to the merge commit that contains the file itself. That creates an impossible self-reference. Record the latest verified product-state baseline instead, and let each new session verify the current repository head.

## 15. Latest executive decisions

```text
PRIMARY_GOAL=CONTROLLED_LIVE_COHORT
NO_NEW_PRODUCT_SCOPE_BEFORE_CONTROLLED_USER_EVIDENCE=YES
APPLICATION_SIGNUP_REMAINS_CLOSED=YES
PROVIDER_SIGNUP_REMAINS_DISABLED=YES
EXISTING_LOGIN_REMAINS_ENABLED=YES
ANALYTICS_REMAINS_DISABLED=YES
V3_THROUGH_V9_REQUIRE_REHEARSAL_AND_RECOVERY=YES
PRODUCTION_READINESS=NO_GO
FREE_PLAN_DURING_ISOLATED_REHEARSAL=APPROVED
PAID_UPGRADE_REQUIRES_CFO_RISK_CASE=YES
FIRST_SEED_USERS=5_TO_10
CONTROLLED_COHORT_TARGET=APPROXIMATELY_20
NEXT_GATE=ISOLATED_V1_V2_TO_V9_REHEARSAL_AND_RESTORE_DRILL
```
