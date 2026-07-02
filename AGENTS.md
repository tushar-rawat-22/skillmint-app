# SkillMint Engineering Instructions

SkillMint is an AI-powered Career Operating System, not a simple resume analyzer.

## Product Philosophy

Build minimal, premium, student-friendly interfaces.

Every feature should help the user understand:
- where they stand
- what roles suit them
- what to improve next
- how to become more employable

## Architecture Rules

Use the existing architecture:

- UI components live in `src/components`
- Pages live in `src/app`
- Business intelligence lives in `src/intelligence`
- Resume parsing lives in `src/lib/parser`
- PDF/text extraction lives in `src/lib/pdf`
- Module hooks live in `src/modules`

Do not put AI, scoring, resume parsing, or business logic directly inside React components.

Correct dependency direction:

UI → Modules → Intelligence → Parser/PDF utilities

## Dashboard UI Direction

The dashboard should feel like a clean LinkedIn-shareable career report card.

Design goals:
- minimal
- premium
- informative
- screenshot-friendly
- dark theme
- clear hierarchy
- fewer but stronger cards
- avoid clutter
- avoid generic admin-dashboard design

## Code Quality

Before finishing any task, run:

npm run lint

If possible, also run:

npm run build

Fix errors before considering the task complete.

## Git Rules

Use clear commits.
Do not rename major folders without asking.
Do not remove existing working features unless requested.
Do not commit `node_modules`, `.next`, `.env`, or build output.
