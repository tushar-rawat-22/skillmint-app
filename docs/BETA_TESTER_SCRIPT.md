# SkillMint controlled beta tester script

> **Status: controlled cohort only.** Use this for the first 5–10 individually invited candidates. It does not authorize public outreach, public signup, analytics, billing, or a wider launch.

## Before the session

Each candidate must already have access through the current controlled activation process. Do not tell candidates to create an account while public signup is closed.

Use `skillmint.operations@gmail.com` for one-to-one onboarding, support, and follow-up. Keep candidate resumes, names, email addresses, screenshots containing personal data, and free-form feedback out of the repository.

The candidate should use a real resume only if they are comfortable testing with their own information. Remind them that SkillMint can miss context and does not verify employment, education, repositories, portfolio ownership, identity, or hiring outcomes.

## Invitation message

Hey, I am testing SkillMint with a small group before inviting more users. It helps students and freshers understand what their resume currently supports, where the proof is weak, which roles fit their current signals, and what to improve next.

Your access will be activated individually. Public signup is not open. If you hit an access or product problem, reply to `skillmint.operations@gmail.com` rather than creating another account.

This is a beta, so I am not looking for politeness. I want to know what felt useful, inaccurate, confusing, or untrustworthy.

Plan for about 15 minutes.

## Candidate session

1. Sign in with the account that was activated for the session.
2. Confirm or update the target role in Setup.
3. Upload the resume you want to test and review the extracted analysis.
4. On Resume and Dashboard, check Career IQ, Proof Confidence, profile-fit roles, evidence, gaps, and the current Active Target.
5. Open ATS Match and paste one real job description you are genuinely considering.
6. Review the match, set that job as the Active Target, and check whether the next action changes coherently.
7. Open Roadmap and decide whether the proposed next step is specific enough to act on.
8. Create a private Proof Brief. Confirm that it is private and that nothing is shared merely by creating it.
9. Report anything misleading, broken, or unexpectedly public before treating the session as complete.

## Feedback questions

- In one sentence, what do you think SkillMint does?
- What became clearer after using it?
- What felt inaccurate, fake, confusing, or too confident?
- Which score or recommendation did you trust least, and why?
- Could you distinguish profile-fit roles from the Active Target / latest job match?
- Could you tell what was evidence-backed versus unverified?
- Did the next action feel specific enough to do this week?
- Did anything make you unsure about privacy or who could see your information?
- Would you return after improving your resume? Why or why not?
- What would have to become more useful before this could be worth paying for later?

## Bug report format

- Candidate ID: `C01`–`C10` only; do not record the person's name or email in GitHub
- Device:
- Browser:
- Page:
- What they tried:
- What happened:
- What was expected:
- Reproducible with synthetic/non-personal data: yes / no / unknown
- Screenshot or recording stored outside GitHub if it contains personal data: yes / no / not applicable

## Privacy-safe activation record

For each session, record only the minimum operational evidence needed to judge the cohort. A repository note or issue may contain fields like these, but no candidate identity, resume text, job-description text, contact address, authentication token, or private screenshot.

```text
Candidate ID: C01
Session date: YYYY-MM-DD
Access before session: PASS / FAIL
Core loop reached: PASS / FAIL
Active Target set: PASS / FAIL
Private Proof Brief created: PASS / FAIL
Support needed: none / access / upload / analysis / navigation / privacy / other
Material blocker: short non-personal description or none
Candidate understood evidence vs hiring guarantee: yes / no / unclear
Follow-up required: yes / no
```

A candidate is **activated** only when they can sign in, complete a real-resume analysis, set a real job as the Active Target, and reach a private Proof Brief without an unresolved access, privacy, or core-flow blocker. Completion is evidence for the pilot; it is not authorization to open signup or charge users.

## Founder review

After 5–10 sessions, review recurring evidence before proposing product changes. Prioritize failures in access, resume extraction, Active Target state, Proof Brief privacy, mobile/browser completion, misleading confidence, and support burden. A one-off preference is not a redesign mandate; repeated confusion or failure should become a regression case or a narrowly scoped product change.
