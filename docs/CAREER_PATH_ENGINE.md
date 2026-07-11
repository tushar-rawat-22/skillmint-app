# SkillMint Career Path Engine

**Status:** Beta v1 Block 3 - Mission Execution System + Career Path Engine; Block 4 Active Target integration
**UI:** `/roadmap`  
**Rule:** Show one path's full details at a time.

## Purpose

The Career Path Engine turns resume reality, proof confidence, profile-fit roles, latest pasted JD context, and setup target into a focused 30/60/90 execution plan.

It keeps three sources separate:

- Closest Role Path
- Latest JD Path
- Ultimate Goal Path

Block 4 adds Active Target as a recommendation input. It does not add a fourth path and it does not change scoring.

## Paths

### Closest Role Path

Uses Profile-fit roles from the active resume report. This path answers: "What role is my current evidence closest to?"

It is separate from Latest JD Match and should not be called Best Match.

### Latest JD Path

Uses one specific pasted job description from ATS Match.

It stays locked until a Latest JD Match exists. It does not replace the general Profile-fit role direction.

When Active Target source is `latest_jd`, this path can use the Active Target JD/JD Match and should say it is based on the Active Target JD.

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
skillmint:active-target:v1
```

The roadmap page lets users switch paths, but only the selected path's full plan is visible.

## Block 4 Recommended Path Behavior

Active Target can change which path is recommended:

- `latest_jd` Active Target recommends Latest JD Path.
- `profile_fit` Active Target recommends Closest Role Path.
- `ultimate_goal` Active Target recommends Ultimate Goal Path.
- `manual` Active Target means a custom goal-path target in Block 4 and recommends Ultimate Goal Path.
- If no Active Target exists, the Closest Role Path remains the default recommendation when available.

This is path emphasis only. It does not boost Career IQ, Proof Confidence, Profile-fit role score, Recruiter Confidence, ATS Readiness, or Latest JD Match.

If an Active Target JD Match is stale for the current active resume, Latest JD Path stays recommended but locked until the user re-runs the JD match. The stale numeric score must not be used as current roadmap input.

## Trust Rules

- Career IQ is not a job guarantee.
- Proof Confidence is based on evidence candidates, not external verification.
- Profile-fit roles are general resume-fit suggestions.
- Latest JD Match is one pasted JD only.
- Latest JD Match is tied to the resume-analysis context that produced it.
- Active Target focuses next actions. It does not change your core scores.
- Mission status is not proof verification.
- Marked done never changes scores.
- Scores move only when resume evidence changes and SkillMint re-analyzes it.

## Out Of Scope

The Career Path Engine does not add:

- saved JD history
- mission backend persistence
- mission completion analytics
- score boosts
- AI chat
- job board behavior
- payment
