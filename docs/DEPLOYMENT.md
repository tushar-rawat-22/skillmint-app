# SkillMint Production Deployment Guide

SkillMint is a Next.js app preparing for production beta deployment. This guide covers the practical deployment path, Supabase setup, smoke testing, and rollback checklist.

## 1. Deployment Target

Recommended target: Vercel.

Vercel is the preferred beta deployment target because SkillMint is built with Next.js and uses standard Next.js build/start behavior.

## 2. Required Environment Variables

Set these variables in the production deployment environment:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Do not commit real values. Do not add service-role keys to the app or deployment environment.

## 3. Supabase Setup Checklist

- Run `supabase/schema_v1.sql` in the Supabase SQL editor.
- Run `supabase/schema_v2_feedback.sql` in the Supabase SQL editor.
- Review Supabase Auth email confirmation settings before beta invites.
- Configure the production Site URL in Supabase Auth.
- Add production redirect URLs for the deployed app URL.
- Keep Row Level Security enabled on private career data tables.
- Do not enable public reading for `beta_feedback`.

## 4. Vercel Deployment Checklist

- Import the GitHub repository into Vercel.
- Confirm the framework preset is Next.js if Vercel does not detect it automatically.
- Add the required production environment variables.
- Deploy from the `main` branch.
- Verify the Vercel build succeeds.
- Open the production URL and confirm the app loads.

## 5. Production Smoke Test Checklist

- Landing page loads.
- Signup works.
- Login works.
- Dashboard loads.
- Profile save syncs.
- Setup target role syncs.
- Resume upload works.
- Resume analysis syncs.
- ATS matcher works.
- ATS history syncs.
- Roadmap syncs.
- Feedback sync works.
- Signed-out feedback saves locally.
- Mobile layout renders cleanly.
- Sidebar remains sticky on desktop.

## 6. Rollback Checklist

- Revert to the previous working GitHub commit if needed.
- Redeploy the previous working Vercel build.
- Confirm Supabase schema changes are additive and should not be rolled back casually.
- If a database issue appears, pause new beta testing and inspect RLS/schema policies before changing production data.

LocalStorage fallback remains active when Supabase is unavailable or sync fails.
