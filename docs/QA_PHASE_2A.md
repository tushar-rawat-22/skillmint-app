# QA Checklist — Phase 2A Active Report System

## Scope

Phase 2A validates saved resume history, explicit restore/select, and active dashboard report behavior.

## Checklist

### No Saved Analyses

- Open `/resume` while signed out or with no saved analyses.
- Empty state explains what is missing.
- Upload Resume and Career Setup actions are visible.
- No fake saved history appears.

### Saved Analyses Exist But No Active Report

- Clear active workspace from Settings.
- Open `/dashboard`.
- Dashboard shows no active resume report selected when saved analyses exist.
- Dashboard does not show Career IQ, Proof Confidence, Profile-fit role metrics, charts, or shareable report.
- Actions include Restore latest saved report, Upload resume, Go to Resume, and Career setup when account history is found.
- Restore latest saved report does not run automatically on page load.

### Restore Latest Saved Report

- Open `/resume` with saved analyses and no active report.
- Click Restore latest saved report.
- Success message appears.
- Active report is written to browser workspace.
- Dashboard shows full metrics after restore.

### Select Older Saved Report As Active

- Open `/resume` with multiple saved analyses.
- Click Set as active report on an older item.
- Active badge moves to that item.
- Dashboard reflects the selected active report.

### Upload New Resume

- Upload a new resume.
- New analysis becomes active immediately after upload.
- New active report still saves to account when signed in and configured.

### Clear Active Workspace

- Use Settings -> Clear active workspace.
- Confirmation states account is not deleted.
- Copy says it clears the active browser workspace.
- Copy says it clears active resume analysis, JD matches, roadmap state, beta feedback, and upgrade interest.
- Browser workflow state clears.
- Synced account history remains untouched.

### Dashboard After Clear

- Dashboard does not show stale metrics.
- If saved analyses exist, Dashboard explains none is loaded as active.
- If no resume data exists, Dashboard asks the user to upload a resume.

### Resume Page History

- Saved resume analyses section loads.
- Current active report appears first as "Current active report".
- Latest 4 non-active saved analyses are shown by default.
- Older reports can be expanded with "Show older analyses" and collapsed with "Show fewer".
- Count text shows how many saved analyses are currently visible.
- Repeated filenames are distinguishable by analyzed date/time.
- Newest non-active item uses "Latest saved"; older items use "Saved".
- Cards show file name, analyzed date, "No target stored", top Profile-fit role, and active/restorable state.
- Active report has "View dashboard".
- Empty, loading, and error states are readable.
- Buttons wrap on mobile.

### Scoring Trust

- Career IQ explanation is visible.
- Proof Confidence explanation is visible.
- Score limitation language is visible.
- harsh truth section is visible.
- No external verification claims appear in score UI.
- No guaranteed job claims appear.
- Profile-fit role and Latest JD Match remain separated.

### Premium UX

- Core report areas feel calmer and less glow-heavy.
- No readability regression in dashboard score cards.
- Mobile layout works without horizontal overflow.
- Score cards remain readable on narrow screens.

### Account Sync Unavailable

- Missing config, signed-out state, or database error does not crash the page.
- Browser workspace remains usable.
- Copy does not imply account history was deleted or modified.

### Mobile Check

- Resume history cards do not overflow horizontally.
- Action buttons wrap.
- Dashboard no-active state remains readable.

### Production Smoke

- Run `git diff --check`.
- Run `npm run lint`.
- Run `npm run build`.
- Run `npm run smoke:production` after merge and deploy.
- Confirm `/api/health/config` and app routes pass.
