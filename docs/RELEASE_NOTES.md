# SkillMint Release Notes

## RC-1E Final Beta Closeout

**Date:** July 7, 2026

**Latest commit before RC-1E:** `974e022 fix: harden workspace clearing and empty dashboard states`

### Product Positioning

SkillMint is a proof-aware career operating system for students, freshers, and early-career professionals.

SkillMint is not just a resume analyzer, ATS checker, AI resume writer, roadmap generator, or score dashboard. Those are product surfaces inside a larger loop: users discover Resume Reality, understand Profile-fit roles, choose an Active Target, inspect Proof Confidence, read Career IQ, compare a Latest JD Match, follow Roadmap / Missions, improve proof, and re-score.

### Core User Journey

1. Land on SkillMint and understand the product promise.
2. Create an account or continue with browser-first progress.
3. Choose career direction in Setup.
4. Upload a resume to create Resume Reality.
5. Review Proof Confidence, Base Resume Signals, and Profile-fit roles.
6. Paste one job description for Latest JD Match.
7. Generate a 30/60/90 roadmap and next missions.
8. Improve proof, update resume, match another job, and re-score.

### What Is Ready

- Landing page and conversion path.
- Email/password auth, password reset, and browser-first fallback.
- Guided career setup.
- Resume upload and extraction.
- Resume Reality report.
- Proof-aware scoring MVP.
- Dashboard command center.
- Profile-fit role reasoning.
- Latest JD Match with history.
- Resume improvement and rewrite suggestions.
- Career roadmap and missions.
- Feedback widget.
- Account status and sync visibility.
- Clear active browser workspace control.
- Production smoke test script.

### What Is Intentionally Not Included Yet

- External GitHub, LinkedIn, LeetCode, or portfolio scanning.
- Verified proof claims.
- Payment, checkout, subscriptions, or hard paywalls.
- Supabase schema changes after the current beta schema.
- Resume history selector or active-report picker.
- Advanced analytics/events.
- Institution dashboards.
- Recruiter-facing proof profiles.
- Production billing or pricing enforcement.

### Known Non-Blocking Future Improvements

- Real user feedback collection and prioritization.
- Analytics/events for activation funnel visibility.
- Resume history restore/select flow.
- Stronger onboarding for first-time users.
- Portfolio and GitHub proof integrations.
- Payments/pricing exploration later.
- Advanced AI roadmap guidance later.
- More mobile polish after user testing.

### Beta Tester Instructions

1. Start from the landing page and use the normal CTA path.
2. Sign up or log in.
3. Complete Career Setup.
4. Upload a resume.
5. Review the Resume and Dashboard pages.
6. Paste one real job description in ATS Match.
7. Generate and review Roadmap.
8. Use Feedback for confusing, broken, or high-value moments.
9. Use Settings only for account status, sign out, or clearing the active browser workspace.

### Bug Classification

**P0: Release blocker**

- App crash on core routes.
- Resume upload cannot complete.
- Login/signup impossible.
- Dashboard shows fake or stale metrics as active user data.
- Any payment or secret exposure.

**P1: Trust blocker**

- Proof is described as verified when it is only an evidence candidate.
- Profile-fit roles and Latest JD Match are confused.
- Clear workspace implies account deletion.
- Roadmap clearly targets the wrong active role.
- A core CTA leads nowhere.

**P2: Beta polish**

- Mobile spacing or wrapping issues that do not block task completion.
- Empty states that could be clearer.
- Minor copy hierarchy improvements.
- Better onboarding explanation.

**P3: Future product**

- New integrations.
- Advanced analytics.
- Payment implementation.
- Recruiter/institution products.
- AI coach expansion.
