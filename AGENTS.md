# SkillMint Engineering Instructions

Read `docs/PROJECT_STATUS.md` before planning work. If a task, prompt, current document, or implementation contradicts that status or a frozen Block 1–5 contract, report the contradiction before implementation.

SkillMint is a proof-aware Career Operating System, not a simple resume analyzer. Every feature should help users understand where they stand, which roles fit, what to improve next, and how to become more employable without presenting signals as guarantees.

## Architecture

Preserve the current dependency direction:

```text
UI -> Modules -> Intelligence -> Parser/PDF utilities
```

- Pages live in `src/app`.
- Presentation components live in `src/components`.
- Feature orchestration and repositories live in `src/modules`.
- Scoring and career business logic live in `src/intelligence`.
- Resume parsing lives in `src/lib/parser`.
- PDF/text extraction lives in `src/lib/pdf`.

Keep AI, scoring, resume parsing, ownership, export, deletion, and other business logic out of React presentation components.

## Product and UI preservation

Preserve the implemented premium light-first product system: warm neutral page backgrounds, white report surfaces, restrained color, clear hierarchy, strong readability, and screenshot-friendly output. Bounded refinement is allowed. Do not start a broad redesign or theme replacement without explicit approval.

Protect responsive behavior, keyboard access, visible focus, reduced-motion behavior, semantic status/error output, readable contrast, and narrow-screen wrapping.

## Frozen contracts

Do not weaken or silently redefine:

- Block 2 scoring and proof semantics;
- Block 3 mission status and Career Path behavior;
- Block 4 Active Target ownership, score isolation, and JD freshness;
- Block 5 browser ownership, export, saved-report deletion, account deletion, and Trust Center contracts.

Active Target and mission completion must not change scores. Profile-fit Roles and Latest JD Match remain separate. Missing proof means unverified, not false. Clear workspace remains browser-only. Account deletion remains a protected backend operation.

## Safety and verification

Do not run migrations, contact production services, change DNS/auth origins, or perform destructive production actions without explicit authorization.

Match verification to the change:

- **Documentation-only:** run `git diff --check`, validate relative links and referenced repository paths, review factual/status claims, and confirm the changed-path set contains no source or configuration files. Do not run a build solely for Markdown when the reviewed implementation build already passed.
- **Source or configuration:** run `npm run lint`, `npm run build`, and relevant type or package checks.
- **Frozen-contract behavior:** run the relevant deterministic fixtures, affected Playwright coverage, and block-specific verification; confirm unrelated frozen behavior remains unchanged.

Lint and build alone do not prove scoring, missions, Active Target, browser ownership, export, deletion, accessibility, cross-browser behavior, or production readiness.

## Git discipline

Keep commits scoped and do not mix unrelated changes. Do not stage, commit, or push unless the task authorizes it. Do not rename major folders or remove working features without approval. Never commit secrets, `.env` files, `node_modules` or other generated dependency directories, build output, or test output.
