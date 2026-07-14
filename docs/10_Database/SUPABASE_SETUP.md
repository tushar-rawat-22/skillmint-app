# Supabase Setup

**Status:** Sprint 6.5 job intelligence persistence

Sprint 6.1 added Supabase dependencies, client utilities, environment placeholders, and schema documentation. Sprint 6.3 added the SQL schema file and basic profile persistence. Sprint 6.4 saves resume analyses for signed-in users. Sprint 6.5 saves job match intelligence for signed-in users.

LocalStorage remains active as the fallback for resume analysis, JD matches, ATS history, and roadmap inputs.

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

## Block 5 schema sequence

For a new empty environment, the locked forward-only order is:

1. `supabase/schema_v1.sql`
2. `supabase/schema_v2_feedback.sql`
3. `supabase/schema_v3_data_controls.sql`
4. `supabase/schema_v4_account_deletion_security.sql`

The four files were hash-locked, transactionally applied, and exactly catalog-verified only on the authorized isolated test project. Do not replay them blindly against an existing production database. Production was not contacted during Block 5 closure; production rollout requires its own inventory, backup/rollback plan, approval, and post-application catalog verification.

V4 enforces the observed least-privilege browser operation matrix, active-Auth-user owner policies, authenticated saved-report deletion, service-role-only full account preparation, and explicit helper-function grants. The application also requires server-only `SUPABASE_SECRET_KEY` for the protected deletion route; never expose it to browser code or commit it.

---

## Sprint 6.5 Behavior

- Supabase packages are installed.
- Browser and server client utilities exist.
- Proxy session refresh is wired defensively.
- The app continues to work if Supabase env vars are empty.
- LocalStorage remains active for resume analysis, JD matches, history, and roadmap inputs.
- Signed-in users can save and load a basic profile row when the schema exists.
- Signed-in users now attempt to save resume analyses to the `resume_analyses` table.
- Uploads still save to `skillmint:resume-analysis` first and redirect normally if database sync is unavailable.
- The resume page can restore the latest saved database resume analysis when localStorage is empty.
- Signed-in users now attempt to save JD match results, improvement plans, and rewrite plans to the `job_matches` table.
- The ATS page can restore recent `job_matches` into local history when browser history is empty.
- Roadmap sync stores generated roadmap JSON in `job_matches.roadmap` when the latest JD match has a database id.
- LocalStorage remains the first write and fallback if env vars, auth, schema, or RLS are not ready.

---

## Later Sprint 6 Work

Next units should add:

- Sprint 6.6 user account dashboard.
- Sprint 6 QA freeze.
