# SkillMint deployment

This is the current operator path for deploying SkillMint. Historical rollout notes belong in release records, not here.

## Current authority

- GitHub `main` is the source of truth for releasable code.
- Vercel is the active web host. Production must resolve to the exact `main` commit that passed required checks.
- Supabase project `skillmint-beta` is the active Auth and data backend.
- Public self-service account creation is **not launch-ready** while GitHub issue #130 remains open. Do not remove controlled-admission behavior or claim open signup until that gate is closed with Production evidence.
- `/support`, `/privacy`, authentication and recovery surfaces are production-facing and must remain usable even while signup is controlled.
- A READY deployment is necessary but not sufficient. Release acceptance requires exact-head checks plus affected-route Production verification.

## Environment contract

Never commit secrets. Configure environment values in the provider and keep `.env.example` limited to non-secret names and safe examples.

Required browser-side Supabase values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Required server-side values depend on the deployed feature set and are validated by the application's readiness checks. Treat a missing critical server value as a failed deployment, not as a warning to work around.

Analytics remains opt-in. Do not enable analytics or founder-only surfaces merely to make a deployment pass.

## Release path

1. Start from the latest `main` and keep the change bounded.
2. Run the repository's required checks for the affected slice. A P0/P1 fix needs a regression first where practical.
3. Open a pull request and wait for exact-head required checks. Do not merge a stale or failing head.
4. Verify the Vercel Preview when the change affects runtime or UI behavior.
5. Merge only after the PR head is green and the change is understood.
6. Confirm Vercel Production deployed the resulting `main` SHA, not merely a nearby commit.
7. Re-test the affected Production routes and inspect runtime errors. For auth/security changes, also verify the relevant Supabase/provider state.
8. Record only material release evidence. Do not turn routine deployment into ceremony.

## Production acceptance

For every production release, verify at minimum:

- deployed Git SHA matches the intended `main` SHA;
- Vercel deployment state is READY;
- required GitHub checks passed for that exact head;
- changed public routes return the expected safe behavior;
- no new unexplained 5xx/runtime error appears in the acceptance window;
- auth, RLS, persona and privacy boundaries were not weakened by unrelated changes.

For public self-service work, issue #130 adds stricter gates: server-side CAPTCHA enforcement, production-suitable recovery email, recovery expiry/replay/non-enumeration behavior, candidate/recruiter persona authorization, abuse controls, privacy/deletion/support paths, and responsive/accessibility acceptance. Do not infer these from frontend presence or a successful build.

## Rollback

If a Production release introduces a P0/P1 regression:

1. contain exposure first;
2. identify the last known-good exact SHA;
3. revert or redeploy the smallest safe change through the normal protected path;
4. verify the affected Production slice again;
5. preserve evidence needed to understand the failure.

Do not bypass Auth/RLS controls, disable security checks, or mutate Production data merely to restore a green UI.

## Provider constraints

- Keep spend at zero unless the founder explicitly approves otherwise.
- Do not buy a domain or activate paid provider billing as part of routine deployment.
- A provider integration is not considered production-ready until its server-side configuration and real behavior are verified.
- Email/recovery delivery must not be described as reliable until a production-suitable sending path has been proven.

## Current launch blocker

The controlling public self-service gate is GitHub issue #130. Until it is closed with evidence, SkillMint may remain publicly viewable but signup must stay controlled and visitor-facing copy must explain the safe next step truthfully.
