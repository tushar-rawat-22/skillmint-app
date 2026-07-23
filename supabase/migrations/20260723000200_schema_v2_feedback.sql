-- SkillMint Supabase schema v2: beta feedback
-- Run this file manually in the Supabase SQL editor after schema_v1.sql.
-- This adds feedback capture for beta testing without changing existing
-- resume, profile, job match, or career snapshot tables.

create extension if not exists pgcrypto;

create table if not exists public.beta_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  feedback_type text not null,
  sentiment text not null,
  message text not null,
  page_path text,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  constraint beta_feedback_type_check
    check (feedback_type in ('bug', 'confusion', 'ui', 'idea', 'other')),
  constraint beta_feedback_sentiment_check
    check (sentiment in ('negative', 'neutral', 'positive')),
  constraint beta_feedback_message_length_check
    check (char_length(message) between 10 and 1000)
);

alter table public.beta_feedback enable row level security;

create index if not exists beta_feedback_user_id_idx
on public.beta_feedback(user_id);

create index if not exists beta_feedback_created_at_idx
on public.beta_feedback(created_at desc);

drop policy if exists "Users can insert their own beta feedback"
on public.beta_feedback;
create policy "Users can insert their own beta feedback"
on public.beta_feedback
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can select their own beta feedback"
on public.beta_feedback;
create policy "Users can select their own beta feedback"
on public.beta_feedback
for select
to authenticated
using (auth.uid() = user_id);

-- No public select policy is created. Private beta feedback should only be
-- readable by the submitting user here; admin review should use Supabase's
-- dashboard or future server-side admin tooling.
