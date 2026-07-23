# SkillMint Documentation Map

SkillMint's documentation spans current contracts, frozen verification records, operational guidance, and older planning material. Start with the current-state documents below rather than treating every historical `Approved` or `Frozen` label as present implementation authority.

## Start here

- [Project Status](PROJECT_STATUS.md) is the current project-state entry point and records the release boundary, frozen blocks, and next approved sequence.
- [Beta v1 Build Roadmap](BETA_V1_BUILD_ROADMAP.md) is the locked execution roadmap and preservation boundary.
- [TODO](TODO.md) distinguishes current, blocked, deferred, completed, and historical work.
- [Repository engineering instructions](../AGENTS.md) define the operational rules for changes.

Implementation, tests, schemas, and frozen current contracts override legacy speculative architecture documents when the question is what the application ships today. Durable founder decisions and the locked roadmap remain the authority for approved product direction; source code alone does not silently cancel them.

## Current product contracts

- [Scoring System](SCORING_SYSTEM.md)
- [Mission System](MISSION_SYSTEM.md)
- [Career Path Engine](CAREER_PATH_ENGINE.md)
- [Active Target Workflow](ACTIVE_TARGET_WORKFLOW.md)
- [JD Workflow](JD_WORKFLOW.md)
- [Premium UX Direction](PREMIUM_UX_DIRECTION.md)
- [Brand & Domain Decision Gate](BRAND_DOMAIN_GATE.md)
- [Privacy-safe Analytics Collection](ANALYTICS.md)
- [Block 6 Rollout Runbook](BLOCK_6_ROLLOUT_RUNBOOK.md)

These documents preserve the separation between Profile-fit Roles and Latest JD Match, score truth and focus, mission progress and evidence, and the current light-first UI direction.

## Data, privacy and security contracts

- [Data Map](DATA_MAP.md)
- [Data Controls](DATA_CONTROLS.md)
- [Data Export](DATA_EXPORT.md)
- [Trust Center](TRUST_CENTER.md)
- [Account Deletion](ACCOUNT_DELETION.md)
- [Privacy Notice](PRIVACY_NOTICE.md)
- [Block 5.3 Implementation](BLOCK_5_3_IMPLEMENTATION.md)

These contracts distinguish browser data from account data, owner partitions from shared browser state, browser clearing from authenticated deletion, and isolated engineering proof from production operations.

## Testing and frozen evidence

- [Block 5 Closure](BLOCK_5_CLOSURE.md)
- [Block 5 QA Reconciliation](QA_DATA_CONTROLS.md)
- [Scoring QA](QA_SCORING_TRUTH_ENGINE.md)
- [Mission Execution QA](QA_MISSION_EXECUTION.md)
- [Active Target QA](QA_ACTIVE_TARGET.md)
- [Premium UI QA](QA_PREMIUM_UI.md)
- [Phase 2A QA](QA_PHASE_2A.md)
- [RC-1E QA](QA_RC1E.md)
- [Beta QA Checklist](BETA_QA_CHECKLIST.md)
- [Beta Freeze Criteria](BETA_FREEZE_CRITERIA.md)

Frozen evidence must not be casually rewritten. Preserve recorded identities, commits, hashes, run IDs, counts, scopes, and verdicts. Fixture-bound documentation may also contain wording required by deterministic checks; update it only with the relevant contract and fixture review.

## Deployment and operations

- [Deployment Safety Guide](DEPLOYMENT.md)
- [Block 6 Rollout Runbook](BLOCK_6_ROLLOUT_RUNBOOK.md)
- [Project Status](PROJECT_STATUS.md)
- [Release Notes](RELEASE_NOTES.md)
- [Changelog](CHANGELOG.md)
- [Beta Tester Script](BETA_TESTER_SCRIPT.md), currently a draft rather than outreach authorization

Local builds, isolated Supabase verification, browser-test passes, or a Vercel deployment do not independently authorize public beta or prove production readiness. Follow the release blockers and explicit authorization boundaries in the current status and deployment documents.

## Historical planning documents

The directories below preserve useful chronology, assumptions, and product rationale:

- `00_Company`, `00_Vision`, and `01_Product`
- `03_UX` and `04_UI`
- `05_Architecture`, `06_Database`, `07_API`, and `08_AI`
- `09_Development`, `10_Business`, `10_Database`, and `10_Product`
- `99_Releases`
- older phase, public-beta, and release planning documents not listed as current contracts above

Historical documents remain for context and should not be treated as shipped functionality. In particular, older dark-cockpit design direction, speculative AI and API architecture, payments, public career products, employer or institution surfaces, and launch plans do not override current implementation, frozen Blocks 1–5, or [Project Status](PROJECT_STATUS.md).
