# SkillMint Scoring System Audit

**Status:** Product Trust + Beta Readiness audit  
**Scope:** Current deterministic scoring and score display before the 50-user beta

## Summary

SkillMint currently shows deterministic, resume-derived signals. The system does not externally verify proof links, job outcomes, GitHub activity, LinkedIn details, LeetCode activity, employment history, or placement probability. Scores should be described as detected, inferred, estimated, proof-candidate-based, or JD-match-based.

Recommended global language:

- "Career IQ is a trust-adjusted readiness signal."
- "Proof Confidence is based on evidence candidates, not external verification."
- "Missing proof means unverified, not false."
- "Profile-fit roles are based on base resume signals."
- "Latest JD Match is specific to the job description you tested."
- "Base Resume Signals show what SkillMint detected in the resume, not final employability."

Recommended score bands:

| Band | Range | User-facing meaning |
| --- | ---: | --- |
| Critical | 0-39 | Major resume/proof inputs are missing or unusable. |
| Weak | 40-54 | Some signal exists, but trust and readiness are low. |
| Developing | 55-69 | A usable base exists, with important gaps. |
| Competitive | 70-84 | Directionally competitive, but still proof-sensitive. |
| Strong | 85-100 | High signal density; still not externally verified. |

## Displayed Scores

| Score | Where calculated or assembled | Where shown | Meaning | Inputs | Classification | Known limitations | Overclaiming risk | Recommended language |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Career IQ | `src/intelligence/core/careerIQ.ts`, then proof-adjusted in `src/intelligence/proof/proofScoring.ts`, then trust-capped in `src/modules/dashboard/hooks/useCareerData.ts` | `/dashboard`, share snapshot | Overall career readiness signal after base resume scoring and Proof Confidence adjustment. | Resume structure, skills, projects, experience, education, GitHub/LinkedIn signals, ATS/recruiter base scores, certifications, coding profile signals, optional proof signals, Proof Confidence. | Inferred and proof-candidate-based. | Deterministic heuristics; not market-calibrated yet; no external source scans; proof gaps can cap the score; active browser report only. | High if framed as talent, intelligence, placement chance, or verified employability. | "Career IQ: Competitive, but proof is still incomplete." |
| Proof Confidence | `src/intelligence/proof/proofScoring.ts` | `/dashboard`, `/resume`, share snapshot | Confidence that resume claims are supported by evidence candidates. | Parsed skills, projects, experience, certifications, resume text, extracted links, measurable outcomes, career field context. | Proof-candidate-based. | Link presence is not validation; generic links do not support every skill; missing proof is not disproof. | High if called verified proof or treated as truth. | "Proof Confidence is based on evidence candidates, not external verification." |
| ATS Readiness | `src/intelligence/core/ats.ts` using base signals from `src/lib/resume/buildUserProfileFromParsedResume.ts` | `/dashboard`, share snapshot | Resume structure and scan-readiness before a specific JD. | Base ATS signal, skills, projects, education, experience, resume structure, certifications, public proof hints, measurable impact. | Detected and inferred. | Not a real ATS parser; not job-specific; keyword coverage for a specific JD lives in JD Match. | Medium if users confuse it with one-company ATS pass probability. | "ATS Readiness checks base resume structure, not a guaranteed ATS outcome." |
| Recruiter Confidence | `src/intelligence/core/recruiter.ts`, then proof-adjusted in `src/intelligence/proof/proofScoring.ts` | `/dashboard`, share snapshot | Estimated initial recruiter shortlisting confidence from visible profile signals. | Projects, experience, skills, GitHub/LinkedIn, coding profiles, certifications, achievements, measurable impact, Proof Confidence. | Inferred and proof-candidate-based. | No real recruiter review; no company-specific screening model; no external source validation. | High if framed as recruiter approval. | "Recruiter Confidence estimates shortlisting trust from visible resume signals." |
| Profile-fit role match | `src/intelligence/core/roleMatch.ts` | `/dashboard`, `/resume` history | General role fit based on resume signals and predefined role skill sets. | Detected skills, project score, experience score, GitHub score, coding score, role required/bonus skills. | Inferred from base resume signals. | Limited role catalog; no live job market; not tied to the latest JD; salary ranges are broad static guidance. | Medium if called "best match" or confused with latest JD. | "Top profile-fit role based on your resume signals." |
| Latest JD Match | `src/intelligence/core/jobDescriptionMatch.ts` | `/ats`, `/dashboard`, job match history, roadmap context | Fit against one pasted job description. | Extracted JD skills/keywords, resume skills, project/experience overlap, public proof signals, certifications, education, strict caps for missing proof. | JD-match-based and inferred. | Only as good as the pasted JD; no employer-specific ATS; no external source verification; generic resumes can score poorly even with strong candidates. | High if treated as a job guarantee. | "Latest JD Match is specific to the job description you tested." |
| Base Resume Signals | `src/lib/resume/buildUserProfileFromParsedResume.ts`; scaled in `/resume` | `/resume` | Detection strengths for resume structure, skills, projects, experience, education, ATS base, recruiter base, Proof Confidence. | Parsed sections, section clarity, contact/proof links, measurable impact, skills/projects counts and text. | Detected and inferred. | Rule-based parser may miss formatting; base signals are not final career readiness. | Medium if called final resume quality. | "Base Resume Signals show what SkillMint detected, not final employability." |
| Roadmap readiness | `src/intelligence/core/careerRoadmap.ts` | `/roadmap` | Action-readiness label derived from the latest JD Match. | Latest JD Match score, missing skills/keywords, resume improvement plan, rewrite plan, setup target role/profile-fit context. | JD-match-based and inferred. | Generic without a JD; readiness can change with a new JD; no execution tracking yet. | Medium if treated as readiness for all roles. | "Roadmap readiness follows your latest JD Match; add a JD for a targeted plan." |
| Missions / next actions | `src/intelligence/core/missions.ts`, `src/intelligence/core/recommendations.ts`, proof next move in `src/intelligence/proof/proofScoring.ts` | `/dashboard`, `/roadmap`, next best action surfaces | Prioritized actions based on low scoring signals. | GitHub, projects, resume structure, LinkedIn, skills, recommendations, proof gaps. | Inferred action priority. | Not a scored task system yet; no completion persistence in this block. | Low unless framed as guaranteed improvement. | "Next action based on the weakest visible signal." |
| Salary estimate | `src/intelligence/core/salary.ts` | Not currently mounted in the active dashboard, but returned by `useCareerData()` and supported by `SalaryCard` | Conservative fresher-friendly salary estimate. | Career IQ, skills, projects, GitHub, ATS/recruiter base signals, coding profiles, certifications, experience. | Estimated. | No live compensation data; not personalized by location/company; should stay secondary until calibrated. | High if shown without caveats. | "Estimated range from resume signals, not an offer prediction." |

## Base Signal Inputs

`buildUserProfileFromParsedResume()` creates the underlying profile scores:

- `resumeScore`: section presence, meaningful length, structure, measurable impact, contact/proof links.
- `skillsScore`: detected skill count with caps for skill-heavy resumes lacking projects.
- `projectsScore`: project count, implementation/proof keywords, generic-project caps.
- `experienceScore`: internship/work/freelance/developer signal count.
- `educationScore`: education presence, degree/domain/GPA signals.
- `githubScore`: GitHub link plus project count.
- `linkedinScore`: LinkedIn link plus experience/certification/project context.
- `atsScore`: base parse/readability signals before JD matching.
- `recruiterScore`: base human trust signals before Proof Confidence adjustment.
- `activityScore`: GitHub, LinkedIn, projects, certifications, coding profiles, hackathon/open-source/achievement terms.

## Trust Controls Already Present

- Placeholder extraction caps scores aggressively.
- Career IQ caps high scores when public proof, projects, ATS base, or strong evidence density is missing.
- Proof-aware Career IQ blends Career IQ with Proof Confidence and applies additional trust caps.
- Recruiter Confidence is proof-adjusted.
- JD Match uses strict caps for missing role categories, weak overlap, no projects, no public/coding proof, and missing exceptional evidence.
- Dashboard hides all report metrics when no active browser report exists.

## Calibration TODOs

- Build a labeled test set of student/fresher resumes and expected score bands.
- Add snapshot tests for representative weak, developing, competitive, and strong profiles.
- Compare Career IQ, Proof Confidence, ATS Readiness, and JD Match outputs against human reviewer expectations.
- Track beta confusion around Career IQ versus Proof Confidence versus JD Match.
- Tune score caps only after beta evidence, not from isolated anecdotes.
- Add confidence intervals or "data strength" labels if users read scores too precisely.
- Decide whether salary estimates should stay hidden until calibrated with realistic fresher market data.
- Add account-level history for score changes over time after active/saved report semantics are stable.
