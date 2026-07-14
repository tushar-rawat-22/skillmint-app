# Account Deletion

> **Engineering status (July 13, 2026): CLOSED AND FROZEN.** The complete route, RLS, Auth, stale-token, concurrency, export, and cleanup lifecycle passed on the explicitly authorized isolated Supabase test project. Production was not contacted and production rollout remains pending.

`POST /api/account/delete` accepts only bounded JSON containing exact `DELETE MY ACCOUNT`. It rejects unexpected fields and client identity authority (`userId`, `user_id`, email, owner, or account fields). It derives the account from the provider-validated Bearer session, requires a present allowed Origin, and returns fixed no-store responses without provider errors, identifiers, or table names.

SkillMint currently supports email/password authentication. The browser sends the current password directly to Supabase `signInWithPassword`; it never enters the SkillMint request, URL, or browser storage. The route requires the validated provider identity and a signed detailed password AMR event no older than 600 seconds. Token issuance, refresh, confirmation text, and client timestamps are not reauthentication evidence. OAuth/social and malformed AMR evidence fail closed.

The ordered server sequence is: service-role database preparation for the server-derived account; an explicit verified no-op Storage stage because the repository has no Supabase Storage caller; then `deleteUser(id, false)` for explicit hard Auth deletion. `prepare_account_deletion(target_user_id uuid)` is `SECURITY DEFINER`, service-role-only, owner `postgres`, and uses a safe search path. Browser-authenticated clients cannot execute it. It removes and verifies absence across `profiles`, `resume_analyses`, `job_matches`, `career_snapshots`, and account-owned `beta_feedback`. No partial failure reports success.

Cross-process convergence is bounded and does not retry deletion. The route calls `deleteUser(id, false)` once; if it errors, a server-only helper makes at most three `getUserById` verification lookups at 0, 50, and 100 ms. Only the provider’s 404 plus a null user is treated as already deleted. Any present user, non-404 error, malformed result, or thrown lookup remains a truthful generic failure. The maximum explicit added wait is 150 ms. The repair is confined to `src/app/api/account/delete/route.ts`, `src/lib/accountDeletion/authDeletionConvergence.ts`, and `scripts/block-5-3-fixtures.mjs`.

Every browser table policy also requires `is_active_skillmint_user()`, so an absent or soft-deleted Auth identity is inactive even if an old JWT reaches PostgREST. The isolated live run proved anonymous denial, the exact positive/negative operation matrix, bidirectional Account A/B isolation, ownership-transfer denial, stale-token read/write/RPC denial, refresh failure after hard deletion, and concurrent-write containment.

The final two-process repaired-runtime race returned two equivalent safe HTTP 200 successes, left no owned rows or Auth identity, denied all six stale-access operations and refresh reuse, made a later retry safely return 401 `not_authenticated`, and finished at independent exact zero. Production contact and credential exposure were both zero.

After confirmed server success the Trust Center removes only the captured owner’s browser partitions, preserves anonymous/other-account/global data, and does not let late Account A completion sign out Account B.

Accepted limits remain: isolated test-project proof is not production proof; provider backup/log erasure and complete infrastructure-wide deletion were not proved; legal review is pending; the privacy/support contact is not externally verified; production schema rollout and operational ownership are pending.
