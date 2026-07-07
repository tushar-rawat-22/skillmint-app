# RC-1E QA Checklist

**Release:** RC-1E Final Beta Closeout

**Status:** Manual QA passed by founder before RC-1E.

## Production Checklist

### Landing

- Landing page loads.
- Product positioning is clear.
- Product Preview / How it works / What you get stay on the landing page.
- Login routes to `/login`.
- Start Free routes to `/signup`.

### Auth

- Signup page loads.
- Login page loads.
- Forgot password page loads.
- Reset password page loads.
- Auth copy does not imply payment is required during beta.

### Setup

- Setup page loads.
- Career direction can be saved locally.
- Setup explains intent versus Resume Reality.
- Setup does not claim it rewrites resume analysis.

### Upload

- Upload page loads.
- Resume upload and processing path is visible.
- Upload status stages are understandable.
- No fake progress percentages are shown.

### Resume

- Resume page loads.
- Empty state points to upload.
- Base Resume Signals are detection signals, not final readiness.
- Proof Confidence explains evidence candidates and trust limits.

### Dashboard Full State

- Dashboard shows full metrics only when an active resume report exists.
- Career IQ, Proof Confidence, Latest JD Match, and Profile-fit roles are distinct.
- Next missions explain what to do next.
- No fake/demo metrics are shown.

### Clear Workspace State

- Settings includes Clear active workspace.
- Confirmation says the account is not deleted.
- Clearing removes the active browser workspace.
- Dashboard after clear does not show stale metrics.
- If synced analyses exist, Dashboard says no active resume report is selected.

### ATS JD Match

- ATS page loads.
- Copy is framed around matching one real job description.
- Match result saves locally.
- History remains available when local history exists.

### Roadmap

- Roadmap page loads.
- Roadmap source is visible.
- Active Target is clear.
- Tasks include priority, effort, and impact labels without implying fake precision.

### Profile

- Profile page loads.
- Career direction summary is understandable.
- Profile does not duplicate Setup as a confusing second source of truth.

### Settings

- Settings page loads.
- Account status is clear.
- Local browser workspace language is clear.
- Sign out works.
- Clear active workspace does not claim account deletion.

### Logout/Login

- User can sign out.
- User can return to login.
- Browser workspace fallback remains available.

### Mobile

- No horizontal overflow blocks core actions.
- Feedback button does not block important buttons.
- Dashboard cards wrap cleanly.
- Roadmap labels wrap cleanly.

### Smoke Production

- `npm run smoke:production` passes after deployment.
- `/api/health/config` validates Supabase public env status without exposing values.

## Final Release Rule

Create the beta release tag only after production smoke passes and founder manual QA remains accepted.
