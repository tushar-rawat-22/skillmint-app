# SkillMint Engineering Instructions

Read `docs/PROJECT_STATUS.md` before planning work. If a task, prompt, current document, or implementation contradicts that status or a frozen Block 1–5 contract, report the contradiction before implementation.

SkillMint is a proof-aware Career Operating System, not a simple resume analyzer. Every feature should help users understand where they stand, which roles fit, what to improve next, and how to become more employable without presenting signals as guarantees.

## Architecture

Use this dependency direction for new and changed business logic:

```text
UI -> Modules -> Intelligence -> Parser/PDF utilities
```

- Pages live in `src/app`.
- Presentation components live in `src/components`.
- Feature orchestration and repositories live in `src/modules`.
- Scoring and career business logic live in `src/intelligence`.
- Resume parsing lives in `src/lib/parser`.
- PDF/text extraction lives in `src/lib/pdf`.
- Browser persistence lives in `src/lib/storage`; Supabase clients live in `src/lib/supabase`.
- Protected account-deletion logic lives in `src/lib/accountDeletion` and `src/app/api/account/delete`.

App Router pages currently compose modules and some pure intelligence or storage contracts directly. Do not move scoring, parsing, ownership, export, deletion, or other business rules into React presentation components.

## Product and UI preservation

Preserve the implemented premium light-first product system: warm neutral page backgrounds, white report surfaces, restrained color, clear hierarchy, strong readability, and screenshot-friendly output. Bounded refinement is allowed. Do not start a broad redesign or theme replacement without explicit approval.

The older dark-cockpit direction is historical and must not be used as current UI authority.

Protect responsive behavior, keyboard access, visible focus, reduced-motion behavior, semantic status/error output, readable contrast, and narrow-screen wrapping.

## Frozen contracts

Blocks 1–5 are frozen. Do not change or silently redefine them without a reproducible defect and explicit approval for the bounded fix:

- Block 2 scoring and proof semantics;
- Block 3 mission status and Career Path behavior;
- Block 4 Active Target ownership, score isolation, and JD freshness;
- Block 5 browser ownership, export, saved-report deletion, account deletion, and Trust Center contracts.

Active Target cannot alter scores. Mission completion cannot create proof or alter scores automatically. Profile-fit Roles and Latest JD Match remain separate. Missing proof means unverified, not false. Preserve anonymous and account browser partitions, account-owned persistence, and stale-result publication guards. Clear workspace remains browser-only; saved-report deletion and protected backend account deletion remain separate operations.

## Safety and verification

Never expose environment-variable values. Do not run migrations, contact production services, change DNS/auth origins, or run destructive or production tests without explicit authorization.

Match verification to the change:

- Before completion, run `npm run lint`, `npm run build`, and the relevant deterministic fixtures.
- For documentation-only work, also run `git diff --check`, validate relative links and referenced repository paths, review factual/status claims, and confirm no source or configuration file changed.
- For source or configuration work, add relevant type, package, fixture, and Playwright checks in proportion to risk.
- For frozen-contract behavior, run the affected deterministic fixtures, Playwright coverage, and block-specific verification; confirm unrelated frozen behavior remains unchanged.

Lint and build alone do not prove scoring, missions, Active Target, browser ownership, export, deletion, accessibility, cross-browser behavior, or production readiness.

## Git discipline

Do not work directly on `main`; use a scoped branch. Keep commits scoped and do not mix unrelated changes. Do not stage, commit, or push unless the task authorizes it. Do not perform a global `SkillMint` rename; public branding must preserve internal identifiers and frozen evidence. Do not rename major folders or remove working features without approval. Never commit secrets, `.env` files, `node_modules` or other generated dependency directories, build output, or test output.
