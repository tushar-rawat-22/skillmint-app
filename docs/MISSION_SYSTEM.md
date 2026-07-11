# SkillMint Mission Execution System

**Status:** Beta v1 Block 3 - Mission Execution System  
**Storage:** Browser local storage only for mission status  
**Rule:** Missions guide proof-building. They do not boost scores.
**Block 4 addition:** Active Target can prioritize target-aware missions, but it does not boost scores.

## Purpose

The Mission Execution System turns SkillMint's proof gaps into practical career actions for students, freshers, and early-career users.

It answers:

- What should I fix next?
- Which score or signal does this action relate to?
- What evidence is needed?
- How will SkillMint know later that evidence may be visible?

## Mission Contract

Implemented in:

```text
src/intelligence/missions/missionContract.ts
```

Each mission has:

- deterministic `id`
- `title`
- `category`
- `status`
- `priority`
- `impact`
- `difficulty`
- linked score or signal
- why it matters
- evidence needed
- steps
- completion check
- expected outcome
- source path
- created-from reason

## Statuses

Allowed statuses:

- `suggested`
- `started`
- `done_by_user`
- `evidence_detected`
- `blocked`

`done_by_user` is self-progress only. It does not verify proof and does not change Career IQ, Proof Confidence, ATS Readiness, Recruiter Confidence, Profile-fit roles, or Latest JD Match.

`evidence_detected` is reserved for SkillMint's resume re-analysis signals. It means the latest active resume appears to contain matching evidence. It is not external verification.

## Storage

Mission state is stored locally in this browser:

```text
skillmint:mission-status:v1
skillmint:selected-career-path:v1
skillmint:active-target:v1
```

This is not account-level mission persistence. Backend mission persistence is out of scope for Beta v1 Block 4.

## Mission Sources

Mission generation uses existing deterministic signals:

- Career IQ caps
- Proof Confidence blockers
- Skill Truth gaps
- project and impact gaps
- ATS clarity gaps
- Profile-fit role gaps
- Latest JD Match gaps when a pasted JD exists
- Active Target JD gaps when the target source is `latest_jd`
- Ultimate Goal mismatch when setup target exists

Missing proof means unverified, not false.

## Prioritization

Missions are prioritized by:

- explicit priority
- impact
- lower difficulty when priority and impact tie

The dashboard shows at most three next best things. Full execution lives on the roadmap page.

## Block 4 Active Target Behavior

Active Target is a focus layer for mission priority, not a score layer.

JD-based Active Targets can create missions such as "Back Docker for your Active Target" when the Active Target JD asks for a skill and the active resume does not show that skill in project, experience, certification, or proof context.

Rules:

- Target-aware missions are prioritized, not score-boosted.
- Target-aware JD missions are generated only for `latest_jd` Active Targets.
- Target-aware JD missions require the JD Match resume context to match the current active resume.
- Profile-fit, ultimate goal, and manual targets must not receive fake JD gap missions.
- Evidence detected still comes only from resume re-analysis/evidence detection logic.
- Marked done remains self-progress only.
- Re-upload your resume so SkillMint can check whether evidence is now visible.
- Only add missing skills if you actually used them. Otherwise, build proof first.

## Out Of Scope

Block 3 does not add:

- score boosts from mission clicks
- backend mission persistence
- mission completion analytics
- XP, coins, streaks, leaderboards, or gamification
- AI chat
- external proof verification
- payment or checkout
- job board behavior
- a separate missions page

## Verification

Mission fixture checks live in:

```text
scripts/mission-path-fixtures.mjs
```

Covered scenarios include deterministic mission IDs, local storage adapter behavior, locked paths, JD path unlocking, Active Target mission priority, status validity, dashboard max-three summary, done status not changing scores, and evidence detection after re-analysis.
