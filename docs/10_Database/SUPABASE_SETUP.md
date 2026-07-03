# Supabase Setup

**Status:** Sprint 6.1 foundation

Sprint 6.1 adds Supabase dependencies, client utilities, environment placeholders, and schema documentation. It does not migrate SkillMint data yet.

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

## Sprint 6.1 Behavior

- Supabase packages are installed.
- Browser and server client utilities exist.
- Proxy session refresh is wired defensively.
- The app continues to work if Supabase env vars are empty.
- LocalStorage remains active for resume analysis, JD matches, history, and roadmap inputs.
- No application data is written to Supabase yet.

---

## Later Sprint 6 Work

Next units should add:

- Auth screens.
- Session-aware navigation.
- User profile creation.
- Database writes for resume analyses.
- Database writes for JD matches.
- Migration from localStorage history to persistent user records.
