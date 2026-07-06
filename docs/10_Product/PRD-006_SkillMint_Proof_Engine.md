# PRD-006: SkillMint Proof Engine V2

## Purpose

SkillMint should not only score what a resume claims. It should verify claims against proof.

The future Proof Engine should help users understand which skills, projects, and achievements are supported by evidence, which are weakly supported, and which need better proof before being used confidently in applications.

Sprint 7.10C documented the long-term direction. Sprint 7.11 implements the first Proof-Aware Scoring MVP without external source scanning, parser changes, ATS changes, roadmap changes, or Supabase schema changes.

## Sprint 7.11 MVP

The MVP uses only data SkillMint already has:

- Resume text extracted from the uploaded file
- Parsed skills, projects, experience, certifications, and links
- Existing UserProfile proof signals
- Career field from Setup when available

The MVP does not:

- Call GitHub APIs
- Scrape LeetCode
- Validate external links
- Add profile-link database schema
- Change ATS matching logic
- Change roadmap generation logic

Sprint 7.11 adds Proof Confidence as a separate signal from Career IQ. Career IQ becomes proof-aware in the user-facing dashboard blend, but Proof Confidence remains visible as its own explanation layer so users can see whether claims are backed, weakly supported, or unverified.

MVP outputs include:

- Proof Confidence Score
- Proof Coverage Label
- Extracted proof links
- Link type counts
- Evidence-backed skills
- Weakly supported skills
- Claimed but unverified skills
- Strongest evidence
- Weakest evidence
- Next proof move
- Scoring reasons

Full source validation remains future work.

## Proof Engine Role In Product Hierarchy

Proof Confidence is the trust layer in SkillMint's product hierarchy.

It should:

- Influence Career IQ.
- Explain how much claimed resume evidence is supported.
- Keep claimed skills, weakly supported skills, and evidence-backed skills separate.
- Treat extracted links as evidence candidates, not verified sources.
- Make clear that missing proof means unverified, not false.

It should not:

- Replace Profile-fit Roles.
- Replace Latest JD Match.
- Externally verify GitHub, LinkedIn, LeetCode, or portfolio sources in the MVP.
- Present generic links as proof for every skill.
- Allow Career IQ to appear highly trustworthy when Proof Confidence is weak.

Proof Confidence answers: "How trustworthy are the claims behind this profile?"

Profile-fit Roles answer: "Which roles does this resume naturally fit?"

Latest JD Match answers: "Can this user compete for this exact job description?"

## Sprint 7.11A Calibration Patch

Sprint 7.11A tightens MVP skill proof classification.

Generic proof links must not support every claimed skill. LinkedIn, GitHub profile, LeetCode, blog, and certification links are evidence candidates, but they only help a specific skill when the skill appears in relevant project, work, certification, or proof context.

Calibration rules:

- GitHub repo, live project, portfolio, Kaggle, dashboard, and Hugging Face links are project proof signals only when the skill appears in project context.
- GitHub profile alone is a general evidence candidate, not proof for every listed skill.
- LinkedIn supports identity and experience context, but does not verify technical depth by itself.
- LeetCode can weakly support DSA, algorithms, problem solving, or programming-language claims only when those terms also appear in resume context.
- Certification links support specific skills only when those skills appear near certification/course context.
- Medium, Hashnode, and Dev.to links support a skill only when the skill appears in project, blog, or proof context.
- Good projects without links can still weakly support related skills through project context.
- Project links do not automatically make a skill evidence-backed if the skill only appears in the skills list.

This calibration preserves the MVP promise: Proof Confidence should be useful and conservative, not inflated by generic links.

## Core Idea

Every important career signal should be evaluated as:

- Claimed skill
- Verified evidence
- Missing proof

SkillMint must evaluate candidates using:

1. Claims extracted from the resume
2. Links extracted directly from the resume
3. Links manually added later by the user

Example:

- Claimed: React, Node.js, PostgreSQL
- Evidence: GitHub project uses React and REST APIs, README explains setup, deployment link exists
- Missing proof: no tests, no measurable outcome, low recent activity

Missing proof means unverified, not automatically false.

## Future Proof Link Extraction

SkillMint should eventually extract URLs from uploaded resume text and treat them as evidence candidates.

Extracted links should be classified by source type:

- GitHub
- GitHub repo
- LeetCode
- LinkedIn
- Portfolio
- Live project
- Kaggle
- Behance
- Figma
- Dribbble
- Medium
- Hashnode
- Dev.to
- Certification
- Dashboard
- App store
- Hugging Face
- Google Drive
- Other

Extracted links are evidence candidates, not verified proof immediately.

SkillMint should not trust a link only because it exists. Links must be validated source-by-source later.

Future validation rules:

- A GitHub profile proves skills only through repositories, languages, commits, README quality, project structure, and recency.
- A GitHub repo proves skills only if it contains relevant code, candidate ownership or activity, and meaningful project depth.
- A portfolio proves skills only through project or case-study content, not design alone.
- A certificate supports learning but should not outweigh project or work proof.
- LinkedIn supports identity and experience context but should not automatically verify technical depth.
- Broken, private, inaccessible, generic, or unrelated links should lower verification confidence.
- Missing proof means unverified, not false.

Manual links added later by the user should go through the same evidence-candidate and validation flow as links extracted from the resume.

## Future Score Dimensions

- Resume Quality Score
- Skill Proof Score
- Project Depth Score
- GitHub Evidence Score
- DSA / LeetCode Evidence Score
- Experience Relevance Score
- Recency / Consistency Score
- Verification Confidence

Career IQ and Proof Confidence should remain separate. Career IQ can describe overall readiness, while Proof Confidence describes how much external evidence supports the claims.

## Proof Grades

- A = strongly verified
- B = partially verified
- C = weak evidence
- D = claimed but unverified
- F = contradicted or suspicious

Grades should be explainable and conservative. SkillMint should not punish a user for missing proof as if they lied; it should tell them what evidence is missing.

## GitHub Future Signals

Potential signals:

- Repository ownership
- Commit history
- Languages used
- Frameworks and libraries detected
- README quality
- Deployment link
- Tests
- Project structure
- Recency
- Originality
- Fork penalty

Anti-gaming checks should watch for empty repos, copied projects, fork-only portfolios, one-day commit dumps, screenshots-only proof, and claims that do not match repository contents.

## LeetCode Future Signals

Potential signals:

- Solved count
- Easy / medium / hard distribution
- Recent activity
- Badges
- Streaks
- Contest history if available

Do not overweigh LeetCode for non-tech careers. DSA evidence can help software roles, but it should not dominate readiness for design, sales, marketing, finance, operations, or other fields.

## Other Proof Sources By Career Field

SkillMint should eventually support proof beyond software engineering.

- Portfolio sites
- LinkedIn
- Kaggle
- Behance
- Figma
- Blogs
- Certifications
- Case studies
- Dashboards
- Campaign proof
- Sales proof
- Finance reports

Proof requirements should adapt to the career family selected in Setup.

## Future Proof Coverage Outputs

The Proof Engine should generate user-facing coverage outputs such as:

- Proof Coverage
- Verified Skills
- Weakly Supported Skills
- Claims Needing Proof
- Strongest Evidence
- Weakest Evidence
- Reality Check

## Anti-Gaming Rules

Future proof scoring should reduce confidence for:

- Copied projects
- Empty repositories
- Fake claims
- Screenshots-only proof
- Forked repositories presented as original work
- One-day commit dumps
- Inconsistent dates
- Links that do not open
- Claims that cannot be matched to evidence

The system should be careful with uncertainty. Suspicious does not mean false; it means SkillMint should avoid making recruiter-facing claims until evidence is reliable.

## Recruiter-Facing Claims

Do not build recruiter-facing proof claims until evidence collection is reliable.

SkillMint can tell the user:

- "This skill is claimed but unverified."
- "This project has weak public proof."
- "This GitHub evidence partially supports the claim."

SkillMint should not tell recruiters that a claim is verified unless the evidence is strong, recent, and traceable.

Future recruiter-facing outputs may include:

- Evidence-backed skills
- Unverified claims
- Project proof depth
- Consistency signal
- Verification confidence

These outputs should remain conservative and should not imply certainty when the evidence is incomplete.

## Suggested Future Evaluation Flow

1. Extract claims from resume.
2. Extract and classify links from resume.
3. Ask user to add missing proof links.
4. Validate each source.
5. Match evidence to claimed skills and projects.
6. Generate Career IQ and Proof Confidence separately.

This flow is future direction only. It is not implemented in Sprint 7.10C.

## Product Direction

The Proof Engine should make SkillMint feel more like a career operating system than a resume checker.

The user should understand:

- What they claim
- What they can prove
- What proof is missing
- What to build or link next

The goal is not to shame users. The goal is to help them stop applying blindly and strengthen the evidence behind their career story.
