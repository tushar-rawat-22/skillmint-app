# Supabase Setup

**Status:** Sprint 6.4 resume persistence foundation

Sprint 6.1 added Supabase dependencies, client utilities, environment placeholders, and schema documentation. Sprint 6.3 added the SQL schema file and basic profile persistence. Sprint 6.4 saves resume analyses for signed-in users.

JD match history, ATS history, and roadmap persistence still come later. LocalStorage remains active until those migration units ship.

---

## Create a Supabase Project

1. Open the Supabase dashboard.
2. Create a new project.
3. Choose the organization, project name, region, and database password.
4. Wait for the project to finish provisioning.

---

## Copy Project Credentials

In the Supabase dashboard:

1. Open the project.
2. Go to project settings.
3. Open the API settings.
4. Copy the project URL.
5. Copy the publishable key.

Use the publishable key for the Next.js app. Do not use the service role key in browser or committed files.

---

## Configure Local Environment

Create a local env file from the example:

```bash
cp .env.example .env.local
```

Fill in:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Do not commit `.env.local`.

---

## Run Locally

Install dependencies:

```bash
npm install
```

Start the app:

```bash
npm run dev
```

Verify the existing local flows still work:

- `/upload`
- `/resume`
- `/dashboard`
- `/ats`
- `/roadmap`

---

## Run the Schema SQL

The schema file is:

```text
supabase/schema_v1.sql
```

To install it:

1. Open your Supabase project.
2. Go to the SQL editor.
3. Create a new query.
4. Paste the full contents of `supabase/schema_v1.sql`.
5. Run the query.
6. Confirm the `profiles`, `resume_analyses`, `job_matches`, and `career_snapshots` tables exist.
7. Confirm Row Level Security is enabled on all four tables.

If the SQL has not been run yet, SkillMint should still load. The profile and resume pages will show helpful table/schema errors instead of crashing.

---

## Sprint 6.4 Behavior

- Supabase packages are installed.
- Browser and server client utilities exist.
- Proxy session refresh is wired defensively.
- The app continues to work if Supabase env vars are empty.
- LocalStorage remains active for resume analysis, JD matches, history, and roadmap inputs.
- Signed-in users can save and load a basic profile row when the schema exists.
- Signed-in users now attempt to save resume analyses to the `resume_analyses` table.
- Uploads still save to `skillmint:resume-analysis` first and redirect normally if database sync is unavailable.
- The resume page can restore the latest saved database resume analysis when localStorage is empty.
- JD matches, history, and roadmap data are not written to Supabase yet.

---

## Later Sprint 6 Work

Next units should add:

- Database writes for JD matches.
- Migration from localStorage history to persistent user records.
