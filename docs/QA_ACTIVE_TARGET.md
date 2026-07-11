# SkillMint Active Target QA

**Status:** Beta v1 Block 4 QA checklist
**Scope:** Active Target + JD Workflow

## Dashboard

- Dashboard shows a compact Active Target card.
- No target state clearly says no Active Target is set.
- JD target state shows source, JD Match, main gap, and next move.
- Non-JD target state says JD Match is not available yet.
- The card does not imply score changes, job readiness, or hiring chance.
- Dashboard Career IQ and Proof Confidence values do not change when Active Target changes.

## ATS / JD Workflow

- `/ats` keeps existing JD match behavior.
- User can set the latest JD as Active Target after analysis.
- Button copy changes to replace when a target already exists.
- Clear Active Target removes only `skillmint:active-target:v1`.
- Resume analysis, saved resume history, selected path, and JD history remain intact.
- Copy summary includes source, JD Match when available, main gap, and next move.
- Page states say JD Match is based on one pasted job description.
- Page states say Profile-fit roles are separate from JD Match.

## Roadmap

- Latest JD Active Target recommends Latest JD Path.
- Profile-fit Active Target recommends Closest Role Path.
- Ultimate Goal or manual Active Target recommends Ultimate Goal Path.
- Existing selected path behavior remains usable.
- Active Target JD can feed Latest JD Path without deleting the old latest JD match.
- Roadmap does not become a job tracker.

## Missions

- JD-based Active Targets can create target-aware gap missions.
- Target-aware missions are prioritized, not score-boosted.
- Non-JD targets do not receive fake JD gap missions.
- Mission wording stays proof-first.
- Marked done remains self-progress only.
- Evidence detected remains resume-internal and is not external proof verification.

## Storage

- Storage key is `skillmint:active-target:v1`.
- Invalid JSON does not crash the app.
- Invalid target shape is ignored safely.
- Browser-only clear workspace clears Active Target.
- Storage is browser-local only during beta.

## Trust / Copy

- No "Best Match" wording for Profile-fit roles.
- No job guarantee, job readiness, hireability, placement chance, auto apply, or score boost copy.
- No externally verified proof claims.
- Missing proof means unverified, not false.
- JD Match and Profile-fit roles remain visually and verbally separate.

## Technical Verification

- `git diff --check`
- `npm run lint`
- `npm run build`
- `node scripts/scoring-truth-fixtures.mjs`
- `node scripts/mission-path-fixtures.mjs`
- `node scripts/active-target-fixtures.mjs`
- Manual smoke for `/`, `/dashboard`, `/resume`, `/ats`, `/roadmap`, `/settings`, `/profile`, `/upload`, `/setup`, `/login`, and `/signup`
