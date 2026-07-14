# Block 5 Engineering Closure

## Verdict and scope

Block 5 engineering closed on July 13, 2026 on branch `data-controls-trust-center`, with pre-closure HEAD `000dce391660a08b8ca2d35d4cd2a3b568c447ed` unchanged.

- 5.1 Browser Data Safety — CLOSED AND FROZEN
- 5.2 Export and Trust Center Reliability — CLOSED AND FROZEN
- 5.3 Deletion, Database, Privacy, and Release Safety — CLOSED AND FROZEN
- BLOCK 5 — CLOSED AND FROZEN

`BLOCK_5_ENGINEERING_STATUS=CLOSED_AND_FROZEN`

`BETA_RELEASE_READINESS=BLOCKED_PENDING_PRODUCTION_ROLLOUT_AND_EXTERNAL_PRIVACY_CONTACT`

## Evidence identity and schema

- Authorized isolated project-reference SHA-256: `ff15e0b7e0699288a6e0d171f6e751cf8ef215e7a3c2980b7d57e4a24ba1229b`
- Disposable run ID: `b5close-20260713-35538c72`
- Bootstrap order and hashes:
  1. `schema_v1.sql` — `af7a9a7314b699d1e38fe6998bc382489a33532315f188d77d0f8f739b5357e5`
  2. `schema_v2_feedback.sql` — `213fae232e106ff82cd6e300fc27507d77a612dd8c5f128bd91601f114f33701`
  3. `schema_v3_data_controls.sql` — `a130483eac5ffafdbf293b3938e18dabea57a0e36c7d8617fb8bc448ae042959`
  4. `schema_v4_account_deletion_security.sql` — `3ff175e86b79516ee896578d01b6b64fb747aa2b371187fa63f8225c09807587`
- Forward-fix SQL: none; forward-fix count `0`.
- Normalized deployed catalog digest: `f68ed9fb4107d36d1e37825ae9fe2174f445d975a04605c10bb19c2698738889`.

The test project began with zero Auth users, zero public application tables, zero Storage buckets/objects, and no applied SkillMint manifest. Each schema file was transactionally validated, applied only in the locked order, and recorded by hash. The verifier compared exact normalized tables, columns, constraints, policies, grants, indexes, functions, owners, security modes, search-path configuration, ACLs, triggers, and absence of the obsolete deletion function.

## Data inventory and least privilege

| Table | Owner | Authenticated browser operations |
| --- | --- | --- |
| `profiles` | `id` | select, insert, update |
| `resume_analyses` | `user_id` | select, insert, delete |
| `job_matches` | `user_id` | select, insert, update, delete |
| `career_snapshots` | `user_id` | select only |
| `beta_feedback` | `user_id` | select, insert |

Anonymous access and every unlisted operation were denied. Every owner policy requires `is_active_skillmint_user()` and exact ownership. `delete_current_user_saved_reports()` is authenticated and active-user guarded. `prepare_account_deletion(uuid)` is service-role-only. No repository Supabase Storage caller was found.

## Disposable live-security results

Two run-owned marked accounts were created by the guarded runner; arbitrary identities were not accepted.

- Anonymous denial: PASS.
- Exact positive and forbidden operation matrix: PASS.
- Bidirectional Account A/Account B read, write, and RPC isolation: PASS.
- Ownership-transfer attempts: denied.
- Production account-export adapter boundary: supported Account A data exported without Account B; unsupported nonempty snapshot data failed closed.
- Wrong password: rejected; refreshed valid session preserved the original password AMR timestamp.
- Real local `POST /api/account/delete`: safe malformed/origin/auth failures and Account A success passed.
- Auth deletion semantics: explicit hard deletion via `deleteUser(id, false)`; Auth row absent afterward.
- Stale Account A JWT: read, write, and saved-report RPC denied; refresh denied.
- Concurrent writes during deletion: bounded attempts left zero surviving Account A rows.
- Account B stayed intact through every A assertion and was removed only during marked run cleanup.

Independent post-run read-only cleanup found zero Auth users, zero rows in all five account tables, zero Storage objects, and zero Storage buckets. Run state was `clean`. Every live artifact passed the secret-free validator and retained no URL, credential, token, email, raw UUID, row data, or provider payload.

## Block summaries

Block 5.1 closed the registered browser inventory, owner partitions, export/clear distinction, corrupt/future data fail-closed behavior, and payload-free refresh events. Block 5.2 closed current-owner browser/account export, requested-only download truth, count failure semantics, saved-report deletion, feedback fallback, owner-transition safety, dialog accessibility structure, responsive behavior, and Trust Center hierarchy. Block 5.3 closed exact schema/RLS least privilege, recent authentication, service-only account preparation, explicit hard Auth deletion, stale-user defense, concurrency containment, and complete run-owned cleanup.

Data controls preserve Career IQ, Proof Confidence, ATS/JD scoring, Active Target freshness, mission paths, and roadmap truth.

## Final regression

The package-script dependency graph was expanded to 26 leaf commands and each required underlying suite ran with zero retries. Totals: **107 passed, 0 failed, 0 skipped, 0 retries, 0 flakes**, duration 206,431 ms.

- Static/fixture gates: all Block 5.1, Block 5.2, Block 5.3, Active Target, mission-path, and scoring-truth families passed.
- Engineering gates: `git diff --check`, TypeScript, targeted ESLint across 59 changed code/test files, repository lint, and sanitized isolated build passed.
- Block 5.2 browser: Chromium 38, Firefox critical 17, WebKit critical 17 passed.
- Block 5.3 browser: Chromium 11, Firefox critical 2, WebKit critical 2 passed.
- Browser engines: Chromium `149.0.7827.55`, Firefox `151.0`, WebKit `26.5`.
- Exact deployed catalog, artifact redaction, secret-free live-result, and release-readiness diagnostic gates passed.

## Accepted limitations and release blockers

- Live security was verified only on the isolated test project; production was not contacted.
- Production schema rollout and post-rollout verification remain pending.
- The monitored privacy/support contact remains externally unverified.
- Legal review remains pending.
- Provider backup/log deletion and retention were not proved.
- Operational ownership for production deletion, incidents, and rollback remains unresolved.
- WebKit coverage is not Safari certification.
- Automated ARIA, axe, focus, and keyboard evidence is not real screen-reader speech certification.
- Browser download acceptance is not permanent OS-save proof.
- No infrastructure-wide immediate-erasure or legal-compliance claim is made.

These limitations block beta/production release readiness but do not invalidate the completed isolated engineering gates.

## Repaired-runtime final verification — July 14, 2026

A cross-process race could previously report `auth_deletion_failed` after another server had already completed the hard Auth deletion. The bounded convergence repair is limited to `src/app/api/account/delete/route.ts`, `src/lib/accountDeletion/authDeletionConvergence.ts`, and `scripts/block-5-3-fixtures.mjs`. It calls `deleteUser(id, false)` exactly once. On an error it performs at most three verification lookups at 0, 50, and 100 ms; only a 404 with a null user proves convergence, and the maximum explicit added wait is 150 ms.

- Repaired source: 378 paths; digest `f5f3aec06d57929d48654cbbfaab7b44a3719b3e160233c47d2327e8430c2b60`.
- Deterministic repair evidence before the final build: repair invariants 14/14, convergence fixture 2/2, Block 5.3 fixture 20/20, and Block 5.2.8 integration fixture 13/13; TypeScript, lint, and `git diff --check` passed.
- One ordinary production build from the repaired source produced 667 artifacts; build digest `85440028c18f30e5fa2266c2bf69cb37df0a66e5b18a3de0b6230fa4d364b93d`, build-manifest SHA-256 `b75842260ea27afcdc1e992f024f34b80ddbcb904103bdc34b56d4962af9fd53`.
- Runtime verification passed 15/15 application-route checks and 10/10 deletion rejection/failure checks, with safe responses and zero credential-bearing or fatal logs.
- Browser evidence was reused after an exact manifest comparison proved that the only post-browser changes were the server deletion route, server-only convergence helper, and Node fixture: 193 passed, 0 failed, 0 skipped, 0 retries, 0 flakes.
- Race `block5-race-mrksrbpy` returned two safe HTTP 200 responses with no error code and classification `TWO_EQUIVALENT_TRUTHFUL_IDEMPOTENT_SUCCESSES`. All six stale-authority operations were denied, refresh was denied, the later retry safely returned 401 `not_authenticated`, unrelated-account changes were zero, and final isolated-project state was exact zero.
- Production contact count and exact credential-exposure count were zero. The earlier external-`node_modules` symlink rejection and custom build-guard diagnostic are superseded environmental evidence; neither was used as repaired-runtime proof.

Final engineering verdict: `PASS_READY_FOR_TERMINAL_COMMIT_MANIFEST`. Production deployment impact remains unverified, so the frozen engineering status and beta-release blocker above remain unchanged.
