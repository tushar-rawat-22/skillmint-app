# SkillMint Active Target Workflow

**Status:** Beta v1 Block 4 - Active Target + JD Workflow
**Storage:** Browser local storage only
**Storage key:** `skillmint:active-target:v1`
**Rule:** Active Target focuses next actions. It does not change core scores.
**Audit rule:** Block 4 is complete only after stale JD and account-isolation checks pass.

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
- `manual`: reserved for a manually named custom goal-path target and must not include `jdMatch`

Only `latest_jd` targets can show JD Match. Other targets must say JD Match is not available yet and ask the user to paste a JD for target-specific matching.

Manual targets are not generic typed roles. In Block 4, a manual target means a custom goal-path target, so it recommends the Ultimate Goal Path. A future UI must make that intent clear before exposing manual entry.

## JD Match Freshness

A JD Match score belongs to the active resume analysis that produced it.

For JD-based Active Targets, SkillMint stores a lightweight resume-context fingerprint with the JD Match snapshot. When the active resume context changes, the target intention can remain saved, but the old JD Match score becomes stale.

Stale JD Match behavior:

- do not show the old numeric JD Match as current
- do not feed the stale score into roadmap or mission generation
- show copy such as "Re-run this JD match for the current resume"
- keep Career IQ, Proof Confidence, Profile-fit roles, and mission status unchanged

Old JD Match data without resume context is treated as stale for current-score display. It can guide the user back to ATS, but it must be recalculated before being trusted for the active resume.

## Local Persistence

Active Target is saved in this browser during beta. The storage value is versioned and scoped to the current signed-in user when an account is present.

It is not:

- account-level persistence
- saved job history
- a job tracker
- a synced target record
- a Supabase table
- a payment gate

Signed-in user A's Active Target must not be shown to signed-in user B in the same browser. Signed-out anonymous targets remain available only while signed out. Account-level Active Target sync remains deferred until Data Controls + Trust Center.

Invalid or old stored target shapes should be ignored safely and must not crash the product.

Browser export and browser clear use the registered data-controls boundary. They do not make a stale JD Match current, fabricate a target score, or weaken the resume-context freshness check.

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
- JD Match is tied to the resume-analysis context that produced it.
- Stale JD Match results must be recalculated for the current resume.
- Profile-fit roles are separate from JD Match.
- Only add missing skills if you actually used them. Otherwise, build proof first.
- Marked done does not verify proof.
- Re-upload your resume so SkillMint can check whether evidence is now visible.
- Saved in this browser during beta.
- Account-level target sync is not part of Block 4.

Avoid claims such as job readiness, hiring chance, placement chance, auto apply, score boosts, or externally verified proof.
