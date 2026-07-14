# Block 5.3 implementation and verification

> **5.3 Deletion, Database, Privacy, and Release Safety — CLOSED AND FROZEN (July 13, 2026).** Closure is engineering-only and is based on the authorized isolated test project. It is not a production rollout, legal-compliance, external-contact, or provider-retention claim.

## Architecture

- The authoritative account tables are `profiles`, `resume_analyses`, `job_matches`, `career_snapshots`, and `beta_feedback`.
- The forward-only bootstrap is v1, v2 feedback, v3 data controls, then v4 account-deletion security. All four were hash-locked and transactionally applied to the initially empty isolated project; no forward fix was needed.
- Browser grants and policies match observed callers exactly. Every owner policy includes the trusted active-Auth-user guard. Anonymous access, forbidden operations, and ownership transfer are denied.
- `delete_current_user_saved_reports()` is active-user guarded and authenticated-only. `prepare_account_deletion(uuid)` is service-role-only. Helper function execution is revoked from public, anonymous, and authenticated roles where not required.
- Email/password reauthentication occurs directly against Supabase. The route requires provider-validated identity and a recent signed password AMR event; refresh alone does not manufacture recency.
- The route performs verified database cleanup, a verified non-applicable Storage stage, then explicit hard Auth deletion. Database cleanup is retry-safe but is not described as atomic with the provider Auth operation.
- Artifacts retain only the authorized project-reference SHA-256 and safe digests/counts. URL, credentials, tokens, email addresses, raw UUIDs, provider payloads, and row data are forbidden.

## Verification

Run `b5close-20260713-35538c72` proved the full least-privilege matrix, Account A/B isolation and preservation, the production account-export adapter boundary, wrong-password rejection, AMR preservation across refresh, safe route failures, the real local deletion route, stale-token/RPC/refresh denial, bounded concurrent-write containment, hard Auth deletion, and exact cleanup. Final Auth users, all five account tables, Storage objects, and Storage buckets were zero.

The normalized deployed catalog digest is `f68ed9fb4107d36d1e37825ae9fe2174f445d975a04605c10bb19c2698738889`. The final regression ran 26 leaf commands: 107 passed, 0 failed, 0 skipped, 0 retries, and 0 flakes.

## Safe command boundaries

Live commands default to refusal. They require the hash-authorized target markers from the ignored mode-600 test environment, sanitized child environments, explicit execution flags, a run ID, fresh successful artifacts, and exact destructive confirmation. Arbitrary user IDs and emails are rejected. The bootstrap applies only the exact four-file manifest and resumes only a verified applied prefix. Cleanup operates only on current-run marked resources.

Production was never contacted. Production schema rollout, a monitored privacy/support contact, legal review, provider backup/log retention proof, and operational ownership remain beta-release blockers.
