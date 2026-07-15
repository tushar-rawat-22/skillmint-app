# SkillMint

SkillMint is a proof-aware Career Operating System for students, freshers, job seekers, and early-career users. It turns resume evidence and one optional job description into role direction, trust-aware scores, a focused target, and practical missions.

The product hierarchy is:

```text
Resume Reality
-> Profile-fit Roles
-> Active Target
-> Proof Confidence
-> Career IQ
-> Latest JD Match
-> Roadmap / Missions
-> Re-analysis and Re-score
```

Start with [Project Status](docs/PROJECT_STATUS.md) for the current project state, audited implementation baseline, frozen boundaries, release blockers, and next approved work.

## Current state

Blocks 1–5 of the Beta v1 roadmap are complete and frozen:

1. Premium Product UI System
2. Scoring Calibration + Truth Engine
3. Mission Execution + Career Path Engine
4. Active Target + JD Workflow
5. Data Controls + Trust Center

Block 6, Privacy-safe Analytics + Founder Dashboard, has not started. Block 7, Beta Launch Readiness, has not started. Public beta is not currently authorized.

The current release blocker is production rollout plus externally verified, monitored privacy/support contact operations. Block 5 was verified against an authorized isolated Supabase project; that evidence does not prove production rollout or legal readiness. See [Block 5 Closure](docs/BLOCK_5_CLOSURE.md).

Before Block 6, the approved one-to-two-day [Brand & Domain Decision Gate](docs/BRAND_DOMAIN_GATE.md) selects a public name and reserves a domain. It does not activate a domain or authorize production changes.

## Implemented product surfaces

Current source and routes support:

- email/password signup, login, password recovery, and browser-first fallback;
- career setup and account-aware profile state;
- PDF, DOCX, and TXT resume upload and text extraction;
- active browser reports and account-saved resume analysis history;
- deterministic Career IQ, Proof Confidence, ATS Readiness, Recruiter Confidence, and Profile-fit Roles;
- one-description Latest JD Match with improvement and rewrite guidance;
- browser-local Active Target, mission status, and three-path 30/60/90 roadmap;
- beta feedback with account persistence or owner-scoped browser fallback;
- owner-scoped browser storage, browser/account JSON export, browser clearing, saved-report deletion, and protected backend account deletion;
- a Trust Center at `/settings/data` and current technical privacy notice at `/privacy`.

Important limits:

- Career IQ is not a hiring probability or job guarantee.
- Proof Confidence uses evidence candidates; it is not third-party verification.
- Active Target and mission completion do not change scores.
- Saved analysis is account history; the active report powers the current browser dashboard.
- Clear workspace is browser-only. Account deletion is a separate backend operation.
- External proof scanning, payment, AI chat, job-board expansion, analytics, and production rollout are not current implemented capabilities.

## Stack

- Next.js 16 App Router, React 19, and TypeScript
- Tailwind CSS 4
- Supabase Auth and PostgreSQL access through `@supabase/ssr` and `@supabase/supabase-js`
- `pdf-parse` and `mammoth` for resume text extraction
- ESLint, deterministic Node fixture scripts, and Playwright across Chromium, Firefox, and WebKit projects

## Repository structure

```text
src/app/              pages and API routes
src/components/       presentation components
src/modules/          feature orchestration, repositories, hooks, and UI
src/intelligence/     scoring, proof, missions, paths, targets, and career logic
src/lib/parser/       resume parsing
src/lib/pdf/          extraction utility
src/lib/storage/      owner-scoped browser storage and registry
src/lib/supabase/     Supabase clients and generated database types
scripts/              deterministic fixtures and release diagnostics
e2e/                  Playwright behavior and accessibility coverage
supabase/             ordered SQL schema files
docs/                 current contracts, frozen evidence, and historical plans
```

Dependency direction for new work:

```text
UI -> Modules -> Intelligence -> Parser/PDF utilities
```

Keep scoring, resume parsing, data ownership, and other business rules out of React presentation components.

## Local setup

Requirements: a supported Node.js/npm environment and a local env file.

```bash
npm install
cp .env.example .env.local
npm run dev
```

The core browser-first product can load without Supabase configuration. Account sync and account deletion require the documented environment and schema setup. Do not place real values in committed files.

Verification depends on the type of change. For source or configuration changes:

```bash
npm run lint
npm run build
```

For documentation-only changes and work touching frozen contracts, follow the proportional verification rules in [AGENTS.md](AGENTS.md). Run production smoke tests only against an explicitly authorized deployment; the script contacts the configured URL.

## Documentation

- [Current project status](docs/PROJECT_STATUS.md)
- [Beta v1 build roadmap](docs/BETA_V1_BUILD_ROADMAP.md)
- [Brand & Domain Decision Gate](docs/BRAND_DOMAIN_GATE.md)
- [Block 5 engineering closure](docs/BLOCK_5_CLOSURE.md)
- [Deployment safety guide](docs/DEPLOYMENT.md)
- [Documentation map](docs/README.md)

Historical architecture and planning documents remain in the repository for chronology. They do not override current source, tests, schemas, frozen Block 1–5 contracts, or the status entry point above.

## License

See [LICENSE](LICENSE).
