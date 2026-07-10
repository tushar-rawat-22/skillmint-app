# SkillMint Scoring Truth Engine QA

**Scope:** Beta v1 Block 2 - Scoring Calibration + Truth Engine

## Manual QA

- [ ] `/dashboard` loads with an active report.
- [ ] `/dashboard` loads with no active report and shows no fake metrics.
- [ ] `/resume` history and restore still work.
- [ ] `/ats` still treats Latest JD Match as one pasted JD only.
- [ ] `/roadmap` still reads roadmap data without mission completion features.
- [ ] `/settings`, `/profile`, `/upload`, `/setup`, `/login`, and `/signup` still load.
- [ ] Block 1 premium light UI remains intact.

## Score QA

- [ ] Career IQ is 0-100.
- [ ] Proof Confidence is 0-100.
- [ ] Recruiter Confidence is 0-100.
- [ ] ATS Readiness is 0-100.
- [ ] Profile-fit role scores are 0-100.
- [ ] Latest JD Match is 0-100.
- [ ] No user-facing score shows 8/10, 16/20, or raw parser points.
- [ ] No score is NaN or Infinity.

## Fixture Expectations

- [ ] Empty/very weak resume: very low Career IQ and no-usable-evidence cap.
- [ ] Keyword-stuffed resume: limited ATS/JD keyword credit, low Skill Truth, low Proof Confidence, capped Career IQ.
- [ ] Good student project resume: beats keyword-stuffed resume and gives a clear next proof move.
- [ ] Strong fresher resume: strong Career IQ, strong project/experience evidence, strong profile-fit role score.
- [ ] Role-mismatched resume: explains target-role mismatch without saying the user lacks the skill.
- [ ] Many claims/no proof: detects unsupported skill ratio and applies cap.
- [ ] Strong profile/weak pasted JD: Career IQ remains separate from low Latest JD Match.
- [ ] Weak profile/keyword JD: JD/ATS get limited keyword credit, Career IQ does not inflate.
- [ ] Good formatting/weak proof: formatting does not overpower missing evidence.
- [ ] Poor formatting/strong proof: proof is not destroyed only because formatting is weak.

## Wording QA

- [ ] No job guarantee or placement claim.
- [ ] No "resume score" framing for Career IQ.
- [ ] No "Proof score" label.
- [ ] No "Best Match" label for Profile-fit roles.
- [ ] No "verified proof" wording.
- [ ] Missing proof is described as unverified, not false.
- [ ] Evidence candidates are not described as externally verified.

## Compatibility QA

- [ ] Old saved reports without `scoringVersion` still load.
- [ ] Old reports without `signals`, `capsApplied`, or `categoryScores` do not crash.
- [ ] Active browser report still powers dashboard.
- [ ] Saved resume analysis remains account history.
- [ ] Dashboard restore latest saved report still works.

## Production Route Checks

- [ ] `/`
- [ ] `/dashboard`
- [ ] `/resume`
- [ ] `/ats`
- [ ] `/roadmap`
- [ ] `/settings`
- [ ] `/profile`
- [ ] `/upload`
- [ ] `/setup`
- [ ] `/login`
- [ ] `/signup`
