# Supabase Schema V1 Draft

**Status:** Draft for Sprint 6.1

**Purpose:** Document the first persistent data model for SkillMint. This SQL is a planning baseline only; Sprint 6.1 does not connect app writes to Supabase yet.

---

## Principles

- Private career data must never be publicly readable.
- Every user-owned row must be scoped to `auth.uid()`.
- Browser clients must use the publishable key with Row Level Security.
- Service role keys must not be exposed in the app.
- LocalStorage remains active until later Sprint 6 migration units.

---

## SQL Draft

```sql
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  career_goal text,
  target_role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.resume_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  file_name text not null,
  file_type text not null,
  extracted_text text,
  parsed_profile jsonb,
  user_profile jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.job_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  job_title text,
  company_name text,
  job_description text not null,
  match_result jsonb,
  improvement_plan jsonb,
  rewrite_plan jsonb,
  roadmap jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.career_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  career_iq jsonb,
  recruiter_confidence jsonb,
  salary_projection jsonb,
  role_matches jsonb,
  created_at timestamptz not null default now()
);
```

---

## Row Level Security Draft

```sql
alter table public.profiles enable row level security;
alter table public.resume_analyses enable row level security;
alter table public.job_matches enable row level security;
alter table public.career_snapshots enable row level security;

create policy "Users can select their own profile"
on public.profiles
for select
using (auth.uid() = id);

create policy "Users can insert their own profile"
on public.profiles
for insert
with check (auth.uid() = id);

create policy "Users can update their own profile"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "Users can delete their own profile"
on public.profiles
for delete
using (auth.uid() = id);

create policy "Users can select their own resume analyses"
on public.resume_analyses
for select
using (auth.uid() = user_id);

create policy "Users can insert their own resume analyses"
on public.resume_analyses
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own resume analyses"
on public.resume_analyses
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own resume analyses"
on public.resume_analyses
for delete
using (auth.uid() = user_id);

create policy "Users can select their own job matches"
on public.job_matches
for select
using (auth.uid() = user_id);

create policy "Users can insert their own job matches"
on public.job_matches
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own job matches"
on public.job_matches
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own job matches"
on public.job_matches
for delete
using (auth.uid() = user_id);

create policy "Users can select their own career snapshots"
on public.career_snapshots
for select
using (auth.uid() = user_id);

create policy "Users can insert their own career snapshots"
on public.career_snapshots
for insert
with check (auth.uid() = user_id);

create policy "Users can update their own career snapshots"
on public.career_snapshots
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "Users can delete their own career snapshots"
on public.career_snapshots
for delete
using (auth.uid() = user_id);
```

---

## Access Rules

- Users can select only their own rows.
- Users can insert only rows owned by their own `auth.uid()`.
- Users can update only their own rows.
- Users can delete only their own rows.
- No public access is allowed for private career data.

---

## Future Notes

- Add indexes on `user_id` and `created_at` before production scale.
- Add `updated_at` triggers when update workflows are introduced.
- Consider resume version labels once persistent resume history ships.
- Consider soft deletion for auditability after private beta validation.
