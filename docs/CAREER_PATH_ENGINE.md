# SkillMint Career Path Engine

**Status:** Beta v1 Block 3 - Mission Execution System + Career Path Engine  
**UI:** `/roadmap`  
**Rule:** Show one path's full details at a time.

## Purpose

The Career Path Engine turns resume reality, proof confidence, profile-fit roles, latest pasted JD context, and setup target into a focused 30/60/90 execution plan.

It keeps three sources separate:

- Closest Role Path
- Latest JD Path
- Ultimate Goal Path

## Paths

### Closest Role Path

Uses Profile-fit roles from the active resume report. This path answers: "What role is my current evidence closest to?"

It is separate from Latest JD Match and should not be called Best Match.

### Latest JD Path

Uses one specific pasted job description from ATS Match.

It stays locked until a Latest JD Match exists. It does not replace the general Profile-fit role direction.

### Ultimate Goal Path

Uses setup target role.

It stays locked until setup target exists. When the user's current resume is closer to a different profile-fit role, the path should say that honestly.

## Plan Shape

Each available path has:

- current reality
- main gap
- next best mission
- 30-day focus
- 60-day build
- 90-day proof plan

Each phase contains up to three missions. A path should not show more than nine missions.

## Selection

Selected path is stored locally:

```text
skillmint:selected-career-path:v1
```

The roadmap page lets users switch paths, but only the selected path's full plan is visible.

## Trust Rules

- Career IQ is not a job guarantee.
- Proof Confidence is based on evidence candidates, not external verification.
- Profile-fit roles are general resume-fit suggestions.
- Latest JD Match is one pasted JD only.
- Mission status is not proof verification.
- Marked done never changes scores.
- Scores move only when resume evidence changes and SkillMint re-analyzes it.

## Out Of Scope

Block 3 does not add:

- active target workflow
- saved JD history
- mission backend persistence
- mission completion analytics
- score boosts
- AI chat
- job board behavior
- payment

Active Target + JD Workflow belongs to Block 4.
