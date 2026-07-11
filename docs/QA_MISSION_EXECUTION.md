# QA - Mission Execution + Career Path Engine

**Block:** Beta v1 Block 3  
**Goal:** Verify mature, proof-aware mission execution without scoring, auth, schema, package, or payment changes.

## Automated Checks

- `git diff --check`
- `npm run lint`
- `npm run build`
- `node scripts/scoring-truth-fixtures.mjs`
- `node scripts/mission-path-fixtures.mjs`

## Fixture QA

- Weak resume creates practical proof-building missions.
- Keyword-heavy resume creates skill backing missions.
- Strong fresher still gets refinement missions without fake readiness claims.
- Role mismatch shows honest Ultimate Goal Path gap.
- Latest JD Path is locked when no JD exists.
- Latest JD Path is available when one pasted JD match exists.
- Ultimate Goal Path is locked when setup target is missing.
- Mission IDs are deterministic.
- Local mission status storage round-trips.
- Marking done does not change scores.
- Re-analysis can turn matching missions into `evidence_detected`.
- Dashboard next best things are capped at three.
- Available paths show no more than nine missions.
- Mission statuses are one of the allowed contract values.

## Manual Route Smoke

Open these routes after build/dev server:

- `/`
- `/dashboard`
- `/resume`
- `/ats`
- `/roadmap`
- `/settings`
- `/profile`
- `/upload`
- `/setup`
- `/login`
- `/signup`

## Roadmap UI QA

- Roadmap shows Mission Execution and Career Path Engine language.
- Selector includes Closest Role Path, Latest JD Path, and Ultimate Goal Path.
- Only the selected path's full details are visible.
- Locked paths explain what source is missing.
- Available paths show current reality, main gap, and next best things.
- 30-day focus, 60-day build, and 90-day proof plan are visible.
- Mission cards show evidence needed, steps, completion check, linked score, impact, and effort.
- Status control supports suggested, started, marked done, blocked, and evidence detected display.
- Evidence detected cannot be manually claimed.
- Copy buttons work where browser clipboard permissions allow.

## Dashboard QA

- Dashboard "Next best things" shows at most three structured missions.
- It links to `/roadmap`.
- It keeps the trust rule that marked done never changes scores.
- It does not confuse Profile-fit roles with Latest JD Match.

## Mobile QA

- No horizontal overflow on roadmap path selector.
- Mission cards stack cleanly.
- Status selects and copy buttons remain tappable.
- Badges wrap.
- Long titles and evidence text wrap safely.
- No empty placeholder cards appear for available paths.

## Trust QA

- No fake metrics.
- No fake proof verification.
- No job guarantee language.
- No score boost language.
- No payment or checkout language.
- No backend deletion or privacy controls.
- No AI chat.
- No job board behavior.

## Production Smoke After Merge

- Confirm existing dashboard restore still works.
- Confirm saved versus active resume report distinction still holds.
- Confirm ATS page still creates Latest JD Match as before.
- Confirm roadmap reads active resume, setup target, and latest JD from existing storage sources.
- Confirm mission state is browser-local only.
