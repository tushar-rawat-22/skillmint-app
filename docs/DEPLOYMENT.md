# SkillMint Deployment Notes

## Supabase

- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the deployment environment.
- Run `supabase/schema_v1.sql` in the Supabase SQL editor before testing account persistence.
- Run `supabase/schema_v2_feedback.sql` before beta testing feedback sync.
- Configure production auth redirect URLs in Supabase before inviting beta users.

LocalStorage fallback remains active when Supabase is unavailable or sync fails.
