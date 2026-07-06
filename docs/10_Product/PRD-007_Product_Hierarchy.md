# PRD-007: Product Hierarchy

SkillMint must keep a stable product hierarchy so future features do not confuse resume fit, job fit, proof confidence, and readiness.

## 1. Resume Reality

Resume Reality is what the resume currently contains.

Signals:

- Skills
- Projects
- Experience
- Education
- Certifications
- Links
- Extracted text
- Structure quality

Resume Reality is detection, not external verification.

## 2. Profile-Fit Roles

Profile-fit roles are the roles the resume naturally matches right now.

Purpose:

- Help students discover what roles they should consider applying for.
- Give direction before the user pastes a specific job description.

Important:

- Profile-fit roles are general career suggestions.
- Profile-fit roles are not the same as Latest JD Match.

## 3. Active Target

Active Target is the role or job SkillMint is currently guiding the user toward.

Priority:

1. Latest selected JD
2. User-selected profile-fit role
3. Setup target role
4. Top profile-fit role

Current MVP note:

- User-selected profile-fit role may not exist yet.
- Until then, latest JD takes priority when present.

## 4. Proof Confidence

Proof Confidence explains how much the resume's claims are supported by evidence candidates.

Important:

- Evidence candidates are not externally verified yet.
- Missing proof means unverified, not false.
- Claimed skills and backed skills must stay separate.

## 5. Career IQ

Career IQ is the final trust-adjusted readiness signal.

Rules:

- Career IQ must be influenced by Proof Confidence.
- Career IQ should not look high when proof is weak.
- Career IQ is not just a resume score.
- Career IQ is not just ATS readiness.

## 6. Latest JD Match

Latest JD Match is the match against one specific pasted job description.

Important:

- Latest JD Match answers: "Can I apply to this exact job?"
- Latest JD Match should not replace Profile-fit Roles.
- Latest JD Match should drive rewrite suggestions and roadmap when present.

## 7. Roadmap / Missions

Roadmap and Missions are the 30/60/90-day action plan for the Active Target.

Rules:

- Roadmap must not drift away from Active Target.
- If Active Target is AI Intern at Oracle, roadmap should not say generic full-stack or backend role.
- Roadmap should focus on truthful proof-building.

## 8. Re-Score Loop

Users improve proof, update resume, match another JD, and re-score.

This loop is the retention engine.
