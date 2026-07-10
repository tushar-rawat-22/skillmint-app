# SkillMint Scoring System

**Status:** Beta v1 Block 2 - Scoring Calibration + Truth Engine
**Scoring version:** `career-iq-v2-beta`
**Principle:** SkillMint does not ask whether a resume looks good. It asks what the resume can prove.

## Score Contract

All user-facing SkillMint scores are normalized to 0-100.

This includes:

- Career IQ
- Proof Confidence
- Recruiter Confidence
- ATS Readiness
- Profile-fit role score
- Latest JD Match
- Any displayed category/subscore

Internal parser inputs can still use smaller scales, but they must be normalized before being shown or used in the final Career IQ formula.

## Score Labels

| Range | Label |
| ---: | --- |
| 0-24 | Not enough usable information |
| 25-39 | Very weak proof |
| 40-54 | Early foundation |
| 55-69 | Developing |
| 70-79 | Promising profile-fit |
| 80-89 | Strong profile-fit |
| 90-100 | Exceptional proof-rich profile |

Avoid unsafe labels such as job ready, guaranteed, perfect, hireable, placement chance, or verified.

## Career IQ Meaning

Career IQ means: how strongly this resume proves the user is ready for realistic profile-fit roles.

Career IQ is not:

- a resume score
- a job guarantee
- a placement chance
- an externally verified truth score
- Latest JD Match
- ATS Readiness

## Locked Career IQ Formula

Career IQ uses normalized category scores first, then applies explainable caps.

```text
Career IQ =
0.10 x Career Direction Score
+ 0.08 x Resume Completeness Score
+ 0.18 x Skill Truth Score
+ 0.20 x Project / Experience Evidence Score
+ 0.10 x Impact & Outcomes Score
+ 0.14 x Profile-Fit Alignment Score
+ 0.08 x Recruiter / ATS Readiness Score
+ 0.08 x Proof Evidence Candidate Score
+ 0.04 x Consistency / Risk Control Score
```

Final score:

```text
Career IQ = clamp(round(weightedScoreAfterCaps), 0, 100)
```

Implementation lives in:

- `src/intelligence/scoring/scoreContract.ts`
- `src/intelligence/scoring/truthEngine.ts`
- `src/intelligence/core/careerIQ.ts`

## Weighted Categories

### Career Direction Score - 10%

Checks whether the resume tells a believable role story. It considers target role setup when available, strongest profile-fit role, applied evidence, and scattered positioning.

### Resume Completeness Score - 8%

Checks parseability, section clarity, education/contact signals, and basic formatting. Formatting matters, but it cannot dominate Career IQ.

### Skill Truth Score - 18%

Cross-checks claimed skills against projects, experience, certifications, and education.

Each claimed skill can be:

- `claimed_only`
- `lightly_supported`
- `moderately_supported`
- `strongly_supported`

The UI keeps old safe buckets:

- evidence-backed skills
- weakly supported skills
- unverified claimed skills

Five backed skills should beat 25 unsupported keywords.

### Project / Experience Evidence Score - 20%

Checks applied work: projects, internships, freelance/work experience, ownership language, action verbs, project depth, and non-generic descriptions.

### Impact & Outcomes Score - 10%

Checks results: numbers, scale, users, performance, accuracy, rankings, leadership, open source, research, or measurable improvements.

### Profile-Fit Alignment Score - 14%

Scores realistic role alignment from the whole resume. Profile-fit roles are general resume-fit suggestions and must stay separate from Latest JD Match.

### Recruiter / ATS Readiness Score - 8%

Checks parser and recruiter scan clarity while limiting keyword-only inflation. ATS keywords can help ATS Readiness, but Career IQ should stay limited when proof is weak.

### Proof Evidence Candidate Score - 8%

Checks evidence candidates such as GitHub, portfolio, live app, dashboards, reports, certificates, case studies, coding profiles, or research artifacts.

Evidence candidate means inspectable resume evidence. It is not external verification.

### Consistency / Risk Control Score - 4%

Controls for contradictions, scattered direction, unsupported claims, generic filler, and target-role mismatch.

## Signal Ledger

Block 2 adds a deterministic signal ledger with:

- positive, negative, and neutral signals
- category
- severity
- score impact where practical
- explanation
- evidence text where available

Important scores can now expose drivers, blockers, signals, and caps without requiring old saved reports to contain those fields.

## Caps

Caps are applied after weighted Career IQ is calculated. Every cap has an id, max score, reason, and optional evidence.

Implemented cap behavior:

- no usable resume text: max 25
- only education + skills, no project/experience: max 55
- no projects, no experience, no role-relevant proof: max 45
- no relevant projects/experience for technical fresher direction: max 58
- unclear or scattered direction: max 72
- Proof Confidence below 25: max 68
- more than 65% claimed skills unsupported: max 62
- strong ATS/recruiter keywords but weak evidence: max 70
- major target-role/evidence contradiction: max 65
- good formatting but weak proof: max 65
- strong proof but weak formatting is not capped below 78 only because of formatting

Caps are visible internally on Career IQ as `capsApplied`.

## Cross-Checks

The truth engine cross-checks resume-internal signals only:

- skills section against projects
- skills section against experience
- skills section against certifications/coursework
- project stack against project description
- target role against projects, experience, skills, and profile-fit scores
- links against proof-candidate presence
- metrics against action/context
- claimed skills against applied evidence
- ATS/recruiter scan strength against proof strength

It does not externally verify:

- GitHub content
- LinkedIn content
- certificate validity
- company employment
- project live status
- college status

External verification is future work, not Block 2.

## Role-Aware Evidence

The engine does not hardcode "no GitHub = weak resume" for every role. Evidence is role-aware where deterministic signals allow it.

Examples:

- Frontend/full-stack: GitHub, live links, portfolio, deployed apps, UI scope
- Data analyst: dashboards, datasets, SQL/Python projects, reports
- Business analyst: case studies, process docs, Excel/SQL dashboards, internships
- Product: PRDs, case studies, prototypes, research, metrics
- Marketing: campaigns, analytics, content, growth metrics
- Cloud/DevOps: deployments, infra projects, Docker/Kubernetes/Terraform, AWS/GCP/Azure work
- Cybersecurity: labs, CTFs, reports, tools, audits, writeups
- ML/Data science: datasets, models, metrics, notebooks, papers/projects

## Score Separation

Keep these concepts separate:

- Career IQ: proof-aware readiness for realistic profile-fit roles
- Proof Confidence: how much the resume supports its own claims
- Recruiter Confidence: how quickly a recruiter can understand value and role fit
- ATS Readiness: parser and base resume keyword readiness
- Profile-fit role score: 0-100 role-fit score from the whole resume
- Latest JD Match: 0-100 fit against one pasted JD only
- Salary estimate: conservative market-position estimate, not an offer prediction

Latest JD Match must not become Profile-fit role score. Profile-fit role score must not be called Best Match.

## Backward Compatibility

New fields are optional:

- `scoringVersion`
- `label`
- `drivers`
- `blockers`
- `signals`
- `capsApplied`
- `categoryScores`
- `skillTruth`

Old saved reports without these fields still load. Dashboard restore and resume history restore still work because reports can regenerate scoring from existing `userProfile`, parsed resume data, and extracted text.

No database migration is required.

## Fixture Coverage

Deterministic fixture checks live in:

```text
scripts/scoring-truth-fixtures.mjs
```

Covered scenarios:

- empty/very weak resume
- keyword-stuffed resume
- good student project resume
- strong fresher resume
- role-mismatched resume
- many claims with no proof
- strong profile with weak pasted JD
- weak profile with keyword-matching JD
- good formatting with weak proof
- poor formatting with strong proof
- all scores clamped to 0-100
- no NaN or Infinity scores
- missing optional fields do not crash
- old profile-shaped data still scores with safe fallbacks

## What Intentionally Did Not Change

- Auth logic
- Supabase/database schema
- Environment variables
- Package dependencies
- Payments or checkout
- Analytics implementation
- Mission completion
- Active target workflow
- Saved JD history workflow
- External proof verification
- AI API calls
- Job board
- Account deletion backend

## Trust Language To Preserve

- Career IQ is not a resume score.
- Career IQ is not a job guarantee.
- Proof Confidence is based on evidence candidates, not external verification.
- Missing proof means unverified, not false.
- Evidence candidate is not externally verified proof.
- Profile-fit roles and Latest JD Match are separate.
