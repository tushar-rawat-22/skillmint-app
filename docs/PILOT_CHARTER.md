# SkillMint private pilot charter

## What this pilot is for

This pilot is meant to answer a practical question: can SkillMint help students and fresh graduates read their current resume evidence more clearly, choose a realistic direction, and identify one useful next improvement? It is a learning phase for the product, not a public launch or a hiring programme.

SkillMint will be evaluated on whether people understand what their resume currently supports, where the evidence is thin, and what they can truthfully improve next. A score is supporting detail. It is not the product outcome.

## Who it is for

The intended pilot users are students and fresh graduates preparing for early-career roles. SkillMint may describe profile-fit directions and compare a resume with one supplied job description, but it does not promise employment, recruiter interest, a shortlist, an interview, a salary, or any hiring result.

## Public demo and real analysis

The public `/demo` route contains one fixed synthetic candidate. Every resume detail, evidence source, job description, and Proof Brief item on that route is invented for product demonstration. The demo does not accept a file, create an account record, use browser storage, contact Supabase, send analytics, or make an external request.

Real-resume analysis is separate. It is available only to an authenticated existing user and uses the resume that user deliberately uploads. Public signup remains closed. The demo must never be described as a real candidate report, and real-resume analysis must never fall back to anonymous processing.

## What the analysis can and cannot establish

SkillMint applies deterministic rules to the text and structured signals available in a resume. Those rules can identify evidence candidates, gaps, role-fit signals, and job-description relevance. They can also miss context, misunderstand unusual formatting, or give too much weight to language that happens to match a rule.

SkillMint does not visit or independently verify repositories, portfolio links, employment, education, identity, project ownership, credentials, or candidate truthfulness. A detected link is an evidence candidate, not verified proof. Missing proof means unverified, not false.

Candidates remain responsible for reviewing the extracted information, correcting their source resume, and deciding whether any guidance is accurate and appropriate before using it. They must not treat a SkillMint result as a substitute for their own review or as a prediction of an employer's decision.

## Privacy and indexing boundary

The application is a private pilot and is marked `noindex, nofollow`. That is a request to compliant search engines, not a secrecy control. Access control, careful links, and the default-off demo flag remain necessary.

The synthetic demo handles no user data. Authenticated analysis processes a user-selected resume through the existing application flow and keeps the current account ownership, browser partition, saved-report, export, and deletion boundaries. This PR does not change retention policy, database schema, provider configuration, or hosted data controls.

## What is deliberately outside this PR

This PR does not open public signup or add GitHub OAuth. It does not add Proof Brief editing, activate analytics, introduce payments, create permanent sharing links, or authorize a public launch. It also does not change scoring weights or claim external proof verification.

## Exit criteria for the validation phase

The later validation phase can close only when all of the following are recorded from the controlled cohort:

- participants can distinguish the synthetic demo from authenticated real-resume analysis;
- participants can explain, in their own words, what the resume supports, the strongest support, the main gap, and the next move;
- participants do not interpret Career IQ, Proof Confidence, ATS readiness, role fit, or JD relevance as a hiring guarantee;
- candidates consistently review the extracted evidence and can identify material mistakes or missing context;
- the demo remains free of Supabase, analytics, storage writes, uploads, parsing, and external network calls in automated regression coverage;
- authenticated resume analysis remains account-owned and no anonymous analysis path is observed;
- accessibility, mobile use, error handling, and support load are acceptable for the intended cohort;
- recurring feedback identifies whether the evidence-first hierarchy is useful enough to retain, revise, or remove;
- the separate Production-readiness, privacy/support ownership, legal, operational, and hosted-security gates required for any broader release have passed.

Meeting these criteria permits a new review decision. It does not automatically authorize public signup, analytics, payment collection, wider acquisition, or public launch.
