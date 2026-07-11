# SkillMint JD Workflow

**Status:** Beta v1 Block 4 - Active Target + JD Workflow
**Route:** `/ats`
**Rule:** Latest JD Match is one pasted JD only.

## Purpose

The JD workflow helps users compare their active resume against one pasted job description and optionally set that JD as the Active Target.

It must keep these concepts separate:

- Profile-fit roles are general resume-fit suggestions.
- Latest JD Match is fit against one specific pasted JD.
- Active Target focuses next actions and roadmap emphasis.
- Active Target does not change scores.

## Workflow

The ATS page supports:

- Active Target status panel
- pasted JD input
- JD analysis against the active resume
- matched skills
- missing skills and missing keywords
- truth-safe recommendations
- Set as Active Target
- Replace Active Target
- Clear Active Target
- Copy target summary

If no active resume report exists, the page should not show fake JD readiness. It should point the user back to upload or restore an active report.

If an old/latest JD match exists but no Active Target exists, the page can offer conversion to Active Target without deleting the old JD data.

If the active resume changes after a JD Match is calculated, the old match must not be displayed as a current score. The ATS page should ask the user to re-run the JD match for the current active resume.

## JD Target Rules

JD-based Active Targets can include:

- JD Match score
- resume-context fingerprint for freshness checks
- verdict
- matched skills
- missing skills
- missing keywords
- strengths
- weaknesses
- recommendations

Non-JD targets must not receive fake JD scores. They should show that JD Match is not available yet.

JD targets without valid resume context are treated as stale until the user re-runs the match.

## Recommendations

Recommendations must stay proof-first.

Correct intent:

- Build or show real skill proof before adding missing skills to the resume.
- Re-upload the resume so SkillMint can check whether evidence is now visible.

Incorrect intent:

- Add keywords just to pass ATS.
- Claim the user is job ready.
- Claim hiring or placement chances.
- Claim proof is externally verified.
- Boost scores because a target was selected.

## Out Of Scope

Block 4 does not add:

- saved JD history
- multi-job tracker
- target comparison
- job scraping
- job board
- auto apply
- cover letter generation
- resume version generation
- backend target persistence
- account-level Active Target sync
- Supabase migration
- payment gates
