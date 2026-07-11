# SkillMint Active Target Workflow

**Status:** Beta v1 Block 4 - Active Target + JD Workflow
**Storage:** Browser local storage only
**Storage key:** `skillmint:active-target:v1`
**Rule:** Active Target focuses next actions. It does not change core scores.

## Purpose

Active Target is the one current role or job SkillMint uses to focus ATS/JD workflow, dashboard target summary, roadmap emphasis, and target-aware missions.

It is a focus layer, not a scoring layer.

Active Target can influence:

- Dashboard Active Target compact card
- ATS/JD workflow state
- target-specific gap summary
- target-aware mission priority
- roadmap recommended path emphasis
- Latest JD Path input when the Active Target is JD-based

Active Target must never directly change:

- Career IQ
- Proof Confidence
- Profile-fit role score
- Recruiter Confidence
- ATS Readiness core score
- Latest JD Match math
- any Block 2 scoring math

Scores move only when resume evidence changes and SkillMint detects that after re-analysis.

## Sources

Active Target supports four sources:

- `latest_jd`: created from one pasted JD match and may include `jdMatch`
- `profile_fit`: created from the closest profile-fit role and must not include `jdMatch`
- `ultimate_goal`: created from setup target role and must not include `jdMatch`
- `manual`: reserved for a manually named target and must not include `jdMatch`

Only `latest_jd` targets can show JD Match. Other targets must say JD Match is not available yet and ask the user to paste a JD for target-specific matching.

## Local Persistence

Active Target is saved in this browser during beta.

It is not:

- account-level persistence
- saved job history
- a job tracker
- a synced target record
- a Supabase table
- a payment gate

Invalid or old stored target shapes should be ignored safely and must not crash the product.

## Product Loop

1. User analyzes a resume.
2. User pastes a JD or uses profile-fit/setup target context.
3. User sets one Active Target.
4. Dashboard summarizes the target and main gap.
5. Roadmap recommends the matching path.
6. Missions prioritize proof-building actions for that target.
7. User updates the resume and re-uploads it.
8. Scores and evidence states move only if re-analysis finds stronger resume evidence.

## Trust Copy

Use these ideas wherever Active Target appears:

- Active Target focuses your next actions. It does not change your core scores.
- JD Match is based on one pasted job description.
- Profile-fit roles are separate from JD Match.
- Only add missing skills if you actually used them. Otherwise, build proof first.
- Marked done does not verify proof.
- Re-upload your resume so SkillMint can check whether evidence is now visible.
- Saved in this browser during beta.

Avoid claims such as job readiness, hiring chance, placement chance, auto apply, score boosts, or externally verified proof.
