# SkillMint Beta Freeze Criteria

Use this before creating a beta freeze tag.

## Automated Checks

- `npm run lint` passes.
- `npm run build` passes.
- `npm run smoke:production` passes against the production URL.
- Safety grep shows no payment provider implementation or service-role secrets in app code.

## Manual QA Gates

- Signup and login work in production.
- A fresh account in the same browser does not inherit stale local workflow data.
- Setup career field saves without breaking old setup data.
- Resume upload and resume analysis work.
- ATS Match works for one real job description.
- Roadmap generation works after resume analysis, and becomes more specific after a job match.
- Feedback can be submitted or saved safely.
- Upgrade-interest saves locally and does not open payment.
- No service-role secrets are exposed.
- No payment provider code or checkout flow is present.
- No major UX dead ends remain across landing, setup, upload, resume, ATS, roadmap, dashboard, profile, or settings.
- Manual QA passes in a fresh browser or incognito session.

## Freeze Rule

Create the beta freeze tag only after automated checks and manual QA both pass.
