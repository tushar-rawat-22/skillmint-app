# SkillMint Release Notes

## Unreleased — Documentation alignment

- Block 5 is merged into `main` through feature commit `5a8364b25f3f0ae657f55a9a354158d6181f1083` and merge commit `3cb5e28050cf93e42e53405f0f2be9d12e756e27`.
- Blocks 1–5 are complete and frozen. Their behavior, evidence identities, and non-claims remain unchanged.
- The one-to-two-day Brand & Domain Decision Gate is the approved pre-Block-6 sequence. It is not Block 6, does not renumber the roadmap, and defers domain activation to Block 7.
- Added a current project-status entry point and aligned roadmap, TODO, deployment, maintainer, and onboarding documentation with the merged repository.
- This documentation pass changes no application behavior and implies no production rollout, public-beta authorization, selected public name, selected domain, or domain activation.

## Block 5 engineering closure — July 13, 2026

Block 5 engineering is **CLOSED AND FROZEN**. The exact v1→v4 bootstrap was applied to an authorized initially empty isolated project, the normalized deployed catalog matched, and a two-account run proved least-privilege grants/RLS, A/B isolation, production export boundaries, real password AMR and refresh behavior, the actual local deletion route, explicit hard Auth deletion, stale-token denial, concurrent-write containment, and exact cleanup. The final regression recorded 107 passed, 0 failed, 0 skipped, 0 retries, and 0 flakes.

Beta release remains **BLOCKED**. Production was not contacted. Still required: production schema rollout, externally verified privacy/support contact ownership and monitoring, legal review, provider backup/log retention proof, and operational ownership. WebKit is not Safari certification, automated structure is not real screen-reader speech certification, and browser-download acceptance is not permanent OS-save proof.

On July 14, the server account-deletion path received a bounded cross-process convergence repair. Auth deletion is still attempted exactly once; only three verification lookups at 0/50/100 ms can prove that another server already completed deletion. The repaired source passed deterministic fixtures, one fresh 667-artifact production build, 25/25 runtime checks, and a two-server live race with two equivalent truthful successes, stale-access and refresh denial, exact-zero cleanup, and zero production or credential exposure. The 193-case browser result was reused after exact comparison proved no browser-facing change. This closes the repaired-runtime engineering gate without changing the production-rollout blocker.

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
- Production schema rollout beyond the current deployed production state.
- Resume history selector or active-report picker.
- Advanced analytics/events.
- Institution dashboards.
- Recruiter-facing proof profiles.
- Production billing or pricing enforcement.
- Production operational account-deletion rollout or a verified privacy/support contact.

### Data Controls Verification Status

Block 5.2 reconciles the integrated Trust Center, v2 browser/account export contracts, requested-only download copy, owner-bound request publication, feedback fallback, dialog accessibility contracts, and cross-browser regression coverage. It is closed and frozen as engineering evidence; its stated manual accessibility and OS-save limitations remain non-claims.

Block 5.3 closed its isolated engineering gates. This is not a production-readiness, legal-compliance, provider-retention, or external-contact declaration. Production rollout and the verified privacy/support contact remain release blockers.

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
