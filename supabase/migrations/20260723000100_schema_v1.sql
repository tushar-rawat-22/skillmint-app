-- SkillMint Supabase schema v1
-- Run this file manually in the Supabase SQL editor for now.
-- Sprint 6.3 only connects basic profile persistence; resume/JD persistence
-- tables are prepared here for later Sprint 6 units.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

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

drop trigger if exists set_profiles_updated_at on public.profiles;

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.resume_analyses enable row level security;
alter table public.job_matches enable row level security;
alter table public.career_snapshots enable row level security;

create index if not exists resume_analyses_user_id_idx
on public.resume_analyses(user_id);

create index if not exists resume_analyses_created_at_idx
on public.resume_analyses(created_at desc);

create index if not exists job_matches_user_id_idx
on public.job_matches(user_id);

create index if not exists job_matches_created_at_idx
on public.job_matches(created_at desc);

create index if not exists career_snapshots_user_id_idx
on public.career_snapshots(user_id);

create index if not exists career_snapshots_created_at_idx
on public.career_snapshots(created_at desc);

drop policy if exists "Users can select their own profile" on public.profiles;
create policy "Users can select their own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can delete their own profile" on public.profiles;
create policy "Users can delete their own profile"
on public.profiles
for delete
to authenticated
using (auth.uid() = id);

drop policy if exists "Users can select their own resume analyses" on public.resume_analyses;
create policy "Users can select their own resume analyses"
on public.resume_analyses
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own resume analyses" on public.resume_analyses;
create policy "Users can insert their own resume analyses"
on public.resume_analyses
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own resume analyses" on public.resume_analyses;
create policy "Users can update their own resume analyses"
on public.resume_analyses
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own resume analyses" on public.resume_analyses;
create policy "Users can delete their own resume analyses"
on public.resume_analyses
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can select their own job matches" on public.job_matches;
create policy "Users can select their own job matches"
on public.job_matches
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own job matches" on public.job_matches;
create policy "Users can insert their own job matches"
on public.job_matches
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own job matches" on public.job_matches;
create policy "Users can update their own job matches"
on public.job_matches
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own job matches" on public.job_matches;
create policy "Users can delete their own job matches"
on public.job_matches
for delete
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can select their own career snapshots" on public.career_snapshots;
create policy "Users can select their own career snapshots"
on public.career_snapshots
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert their own career snapshots" on public.career_snapshots;
create policy "Users can insert their own career snapshots"
on public.career_snapshots
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their own career snapshots" on public.career_snapshots;
create policy "Users can update their own career snapshots"
on public.career_snapshots
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can delete their own career snapshots" on public.career_snapshots;
create policy "Users can delete their own career snapshots"
on public.career_snapshots
for delete
to authenticated
using (auth.uid() = user_id);
