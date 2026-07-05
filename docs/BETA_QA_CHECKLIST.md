# SkillMint Beta QA Checklist

Use this checklist before inviting beta testers and after each production deployment.

## 1. Public Pages

- `/` loads without errors.
- `/login` loads without errors.
- `/signup` loads without errors.
- Landing CTAs route to valid pages.

## 2. Auth Flow

- Signup creates an account.
- Email confirmation behavior matches Supabase Auth settings.
- Login works after signup/confirmation.
- Signed-out users can still access local-first flows where expected.
- Signed-out account-only states show helpful messages.

## 3. Career Setup

- `/setup` loads.
- Target role setup saves locally.
- Career field saves locally without changing scoring.
- Signed-in target role setup syncs to profile.
- Failed profile sync does not block local save.

## 4. Resume Intelligence

- `/upload` loads.
- Valid PDF upload works.
- Valid DOCX upload works if supported in the deployed environment.
- Invalid or empty upload shows a clear error state.
- `/resume` results render after analysis.
- Extracted text is hidden by default.
- Account sync message appears for signed-in users.
- Local-only message appears when signed out or sync is unavailable.

## 5. ATS Matcher

- Short JD validation works.
- Long JD paste works.
- JD textarea auto-expands.
- Match result appears.
- Match history persists locally.
- Signed-in match history syncs to account when Supabase is ready.

## 6. Roadmap

- Roadmap generation works with resume and JD data.
- Account sync message appears when a persisted match is available.
- Empty states guide users to setup, upload, or ATS as appropriate.

## 7. Dashboard

- Career IQ is visible.
- Gauge widgets render.
- Mission panel renders.
- No obvious empty or broken sections appear.
- Sidebar is sticky on desktop.
- Navigation remains horizontal on mobile.

## 8. Feedback

- Signed-in feedback syncs to Supabase.
- Signed-out feedback saves locally.
- Supabase unavailable fallback saves locally.
- Short message validation works.
- Feedback modal can open and close without disrupting the page.

## 9. Responsive QA

- Mobile width renders without horizontal overflow.
- Tablet width renders without broken layout.
- Desktop width renders with sticky sidebar and balanced dashboard sections.

## 10. Regression Checks

- No console crashes.
- No hydration mismatch warnings.
- No broken navigation links.
- No private environment values are visible in the browser.
- No service-role keys are present in client code or docs.

## 11. Production Flow Clarity

- Login, signup, profile, and settings do not show stale Supabase configuration copy when production env vars are configured.
- Setup clearly explains career direction.
- ATS Match clearly explains one-job-description comparison.
- Roadmap explains whether it is using setup, resume intelligence, and the latest job match.
- Landing dashboard visuals are labeled as product preview, not the user's real dashboard.
- `npm run smoke:production` passes after redeploy.

## 12. Activation And Paid Interest

- Major app pages show a compact next best action.
- Upgrade-interest buttons save local interest without opening payment.
- Free beta language does not imply a hard paywall.
- No paid entitlements or payment provider code is present.
