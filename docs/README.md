# SkillMint Documentation Map

Start with [Project Status](PROJECT_STATUS.md). It records the current project state, audited implementation baseline, frozen boundaries, release blocker, approved Brand & Domain Gate, and question-specific authority model. Repository-wide engineering instructions are in [AGENTS.md](../AGENTS.md), and the current privacy notice is in [Privacy Notice](PRIVACY_NOTICE.md).

The repository contains documents written at different stages. A document's original `Draft`, `Approved`, or `Frozen` label describes its historical lifecycle; it does not automatically make that document the current implementation authority.

## Current execution authorities

- [Project Status](PROJECT_STATUS.md): current-state entry point.
- [Beta v1 Build Roadmap](BETA_V1_BUILD_ROADMAP.md): seven-block execution sequence and preservation rules.
- [TODO](TODO.md): active, blocked, deferred, and historical work index.
- [Deployment Safety Guide](DEPLOYMENT.md): deployment and rollout boundary.
- [Brand & Domain Decision Gate](BRAND_DOMAIN_GATE.md): approved pre-Block-6 sequence.
- [Release Notes](RELEASE_NOTES.md): chronological repository release record.

## Frozen contracts and evidence

- [Scoring System](SCORING_SYSTEM.md)
- [Mission System](MISSION_SYSTEM.md)
- [Career Path Engine](CAREER_PATH_ENGINE.md)
- [Active Target Workflow](ACTIVE_TARGET_WORKFLOW.md)
- [JD Workflow](JD_WORKFLOW.md)
- [Data Controls](DATA_CONTROLS.md)
- [Data Export](DATA_EXPORT.md)
- [Data Map](DATA_MAP.md)
- [Account Deletion](ACCOUNT_DELETION.md)
- [Trust Center](TRUST_CENTER.md)
- [Block 5.3 Implementation](BLOCK_5_3_IMPLEMENTATION.md)
- [Block 5 Closure](BLOCK_5_CLOSURE.md)
- [Block 5 QA Reconciliation](QA_DATA_CONTROLS.md)

Do not rewrite frozen identities, hashes, run IDs, test counts, verdicts, or historical branch/commit references.

## QA and release checklists

Files prefixed `QA_`, plus `BETA_QA_CHECKLIST.md`, `BETA_FREEZE_CRITERIA.md`, and `BETA_TESTER_SCRIPT.md`, describe their named scope. They prove only the checks they record. A local or isolated pass does not imply production or public-beta readiness.

## Foundational product and strategy

`00_Company`, `00_Vision`, `01_Product`, `10_Business`, `10_Product`, and compatible founder-approved direction and decision records preserve the constitution, vision, business strategy, and enduring product principles. When they have not been superseded, they may constrain current product intent. They do not prove implementation and must be reconciled with frozen contracts, current execution authorities, and later durable founder decisions.

A conversation-only founder decision must be recorded durably in the repository before it directs implementation.

## Historical or superseded implementation plans

Older UX and UI plans, engineering architecture, database, API, AI, sprint, release, and launch materials preserve chronology and rationale. This includes relevant material in `03_UX`, `04_UI`, `05_Architecture`, `06_Database`, `07_API`, `08_AI`, and `99_Releases`, plus phase-specific files where later contracts superseded them. Check current implementation and the approved roadmap before using them. An original `Approved` or `Frozen` label does not itself authorize new work.

Examples of non-current architecture-era assumptions include server-only scoring, a large public API, public career cards, Career Momentum/Risk/Forecast engines, notification systems, payments, recruiter/university products, and mission completion directly updating Career IQ. Do not implement or claim them solely because an early document names them.

## Question-specific authority

- For implementation truth, use fetched Git chronology, current source, tests, schemas and configuration, and implementation contracts. Code does not decide strategy; tests cover only exercised behavior; build or deployment does not prove launch readiness.
- For a frozen result, use its SHA-pinned closure, QA, and contract evidence without rewriting historical identities, combining separate test layers, or implying old temporary artifacts still exist.
- For current product intent, use durable founder decisions, current approved roadmap and decision documents, and compatible unsuperseded constitution, vision, strategy, and product requirements. Product documents do not prove implementation.
- For chronology and rationale, use clearly classified historical material; it does not grant current authorization.
- When sources conflict, identify the question, record the contradiction, preserve frozen contracts, and document a founder decision if sequencing remains unresolved. See [Project Status](PROJECT_STATUS.md) for the full model.

## Documentation maintenance

- Update current authorities when current implementation or approved sequencing changes.
- Preserve historical documents when chronology is valuable and their classification is clear.
- Add a targeted supersession note when a historical file would otherwise misdirect current execution.
- Use relative repository links and exact routes, modules, contracts, and commits when they improve traceability.
- Keep planned work labeled planned, blocked, historical, or aspirational.
