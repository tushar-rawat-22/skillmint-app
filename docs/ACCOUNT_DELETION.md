# Account Deletion

> **Engineering status (July 13, 2026): CLOSED AND FROZEN.** The complete route, RLS, Auth, stale-token, concurrency, export, and cleanup lifecycle passed on the explicitly authorized isolated Supabase test project. Production was not contacted and production rollout remains pending.

> **Phase 1A local extension (July 28, 2026): VERIFIED LOCALLY.** The V8 preparation result now includes the internal `active_resume_selections_deleted` count and exact absence verification. Clean local replay and transactional lifecycle probes passed; no hosted or Production account was touched.

> **Auth convergence repair (November 12, 2026): VERIFIED WITH ISOLATED MOCKS.** A regression reproduced that an accepted provider deletion could be reported as success without a final identity lookup. The server now requires the same bounded provider-confirmed 404-plus-null absence result after every deletion response. This is deterministic engineering evidence, not a Production account-deletion claim.

`POST /api/account/delete` accepts only bounded JSON containing exact `DELETE MY ACCOUNT`. It rejects unexpected fields and client identity authority (`userId`, `user_id`, email, owner, or account fields). It derives the account from the provider-validated Bearer session, requires a present allowed Origin, and returns fixed no-store responses without provider errors, identifiers, or table names.

SkillMint currently supports email/password authentication. The browser sends the current password directly to Supabase `signInWithPassword`; it never enters the SkillMint request, URL, or browser storage. The route requires the validated provider identity and a signed detailed password AMR event no older than 600 seconds. Token issuance, refresh, confirmation text, and client timestamps are not reauthentication evidence. OAuth/social and malformed AMR evidence fail closed.

The ordered server sequence is: service-role database preparation for the server-derived account; an explicit verified no-op Storage stage because the repository has no Supabase Storage caller; then `deleteUser(id, false)` for explicit hard Auth deletion. `prepare_account_deletion(target_user_id uuid)` is `SECURITY DEFINER`, service-role-only, owner `postgres`, and uses a safe search path. Browser-authenticated clients cannot execute it. It explicitly removes and counts the account's zero-or-one `active_resume_selections` row before removing and verifying absence across `profiles`, `resume_analyses`, `job_matches`, `career_snapshots`, and account-owned `beta_feedback`. The count remains an internal server validation field and is never exposed by the generic HTTP response. No partial failure reports success.

Cross-process convergence is bounded and does not retry deletion. The route calls `deleteUser(id, false)` once, then a server-only helper makes at most three `getUserById` verification lookups at 0, 50, and 100 ms regardless of whether the provider accepted or rejected the delete request. Only the provider’s 404 plus a null user is treated as deleted. Any present user, non-404 error, malformed result, or thrown lookup remains a truthful generic failure. The maximum explicit added wait is 150 ms. The repair is confined to `src/lib/accountDeletion/authDeletionConvergence.ts` and `scripts/block-5-3-fixtures.mjs`; the route and public response contract are unchanged.

Every browser table policy also requires `is_active_skillmint_user()`, so an absent or soft-deleted Auth identity is inactive even if an old JWT reaches PostgREST. The isolated live run proved anonymous denial, the exact positive/negative operation matrix, bidirectional Account A/B isolation, ownership-transfer denial, stale-token read/write/RPC denial, refresh failure after hard deletion, and concurrent-write containment.

The final two-process repaired-runtime race returned two equivalent safe HTTP 200 successes, left no owned rows or Auth identity, denied all six stale-access operations and refresh reuse, made a later retry safely return 401 `not_authenticated`, and finished at independent exact zero. Production contact and credential exposure were both zero.

The applied V10 forward migration extends both database cleanup functions to
remove `proof_briefs` and `account_personas` and verify their absence. It keeps
the frozen saved-report and account-preparation return signatures unchanged, so
the protected HTTP contract and generic response do not expose new table names
or counts.

The applied V11 migration adds recruiter role maps and candidate evidence
reviews to the protected cleanup and absence checks. Reviews also disappear
when their related Proof Brief is deleted. Removing a recruiter-owned role map
only clears the internal reference, so feedback already delivered to a
candidate remains candidate-controlled. The frozen public deletion response and
count fields do not change.

The later applied V14 migration replaced `prepare_account_deletion(uuid)` to add
`candidate_job_lifecycle`, but omitted the two V11 recruiter tables from its
explicit cleanup and `verified_absent` predicate. Both tables still reference
`auth.users(id)` with `ON DELETE CASCADE`, so confirmed hard Auth deletion is
expected to remove them. The pre-Auth preparation result nevertheless no longer
attests to their absence, and an Auth-stage failure can leave recruiter-owned
rows after other account data was removed. Restoring that explicit preparation
coverage requires a separately reviewed forward migration and Production
authorization; it was not changed or applied by the November 12 repair.

After confirmed server success the Trust Center removes only the captured owner’s browser partitions, preserves anonymous/other-account/global data, and does not let late Account A completion sign out Account B.

Accepted limits remain: isolated test-project proof is not production proof; provider backup/log erasure and complete infrastructure-wide deletion were not proved; legal review is pending; the privacy/support contact is not externally verified; production schema rollout and operational ownership are pending.
