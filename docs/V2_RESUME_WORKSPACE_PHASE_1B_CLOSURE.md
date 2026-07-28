# Version 2 Resume Workspace Phase 1B Closure

**Date:** July 28, 2026
**Status:** Isolated hosted engineering and synthetic automated Preview-flow verification complete
**Verdict:** Phase 1B is closed for its authorized non-Production scope. The next decision remains evidence-gated; Product Slice 2 is not authorized.

## Repository and PR chronology

Phase 1A Resume Workspace v1 merged through PR #21, **Add Version 2 Resume Workspace foundation**, at merge commit `9eb2318269f835a7f9cc249e8ab014c73a9271ae`. PR #22, **Normalize lifecycle function ACLs before V8**, then merged at `9db3a832e5ffd2c806a787a8438dfb3946fea879`, which is the Phase 1B repository baseline.

The ordered forward migrations were:

1. `20260727000750_lifecycle_function_acl_normalization.sql`
2. `20260727000800_schema_v8_active_resume_selections.sql`

The historical Version 2 transition baseline remains `783e1837028b92cf1edbf29f4699acdaa50df9f8`; it is not the Phase 1B closure SHA.

## Authorized environment boundary

Verification used only the isolated staging Supabase project `skillmint-block6-test` (`fowxrrgntlsgyyuoiesx`) and the protected Vercel Preview associated with it. The Production Supabase project `skillmint-beta` (`iylxqtpnhgckdbomfvtz`) was not contacted or modified. No Phase 1B result is Production evidence.

## Migration and hosted catalog result

The ACL-normalization migration and V8 were each recorded exactly once on isolated staging. Migration history aligned through V8, and the final dry run reported zero pending migrations. Hosted public-schema lint passed.

Hosted catalog verification passed and confirmed:

- `active_resume_selections` contained `user_id`, `resume_analysis_id`, and `selected_at`;
- the owner-qualified composite foreign key, database-controlled selection-write trigger, and all four authenticated owner policies were present;
- RLS was enabled;
- authenticated table and column access was least privilege;
- anonymous and `service_role` raw-table access were denied; and
- lifecycle-function execution matched the intended authenticated or protected server caller.

## Hosted behavior result

The rollback-contained hosted behavior probe passed **18/18**. It covered owner selection insert; rejection of client-controlled `selected_at` and owner `user_id` mutation; cross-owner reference and cross-account insert denial; cross-account read isolation; no-op and changed-selection timestamp behavior; anonymous and `service_role` raw-table denial; explicit selection clearing; selected-analysis cascade behavior; bulk saved-report RPC cleanup; authenticated denial of protected account deletion; protected account-deletion cleanup; rollback restoration; and absence of synthetic rows after rollback.

The probe's two disposable Auth users were hard-deleted. Final Auth, resume-analysis, and Workspace-selection counts returned to zero.

## Preview target and synthetic signed-in flow

The relevant Vercel Preview was protected by Vercel Authentication. A separately created temporary automation bypass was used only for the authorized test. Runtime request interception showed that the deployed Preview login targeted `fowxrrgntlsgyyuoiesx.supabase.co`; the captured password-token request was aborted before network transmission during this target-identification check. The bypass header was restricted to the Preview host, and no Production Supabase request was made.

The synthetic automated Preview checks showed that setting or changing the account Workspace resume did not silently change the browser-active report. A fresh browser discovered the account selection but did not activate it automatically; explicit activation loaded the selected saved analysis. Both analyses remained visible, the correct Workspace indicator appeared, and clearing the selection preserved both saved history and the browser-active report. Disposable users were hard-deleted, and final staging Auth, profile, resume-analysis, and Workspace-selection counts returned to zero. The final fresh-browser slice passed **8/8**.

A separate saved-history diagnostic received HTTP 200 for password authentication and authenticated identity verification, HTTP 200 with two rows for `resume_analyses`, and HTTP 200 for `active_resume_selections`. The authorization header was present, both saved-analysis cards rendered, and cleanup returned staging to zero.

## Diagnostic observation

One automated diagnostic observed two duplicate `GET /auth/v1/user` requests ending in `net::ERR_ABORTED`, with matching console “Failed to fetch” messages. That run also recorded multiple successful HTTP 200 identity requests, successful HTTP 200 saved-analysis and selection requests, both cards rendering, zero page errors, and complete cleanup. The final fresh-browser slice later passed with zero benign aborted Auth requests.

This is a non-blocking automated-test/navigation observation that was not reproduced in the final slice. Its internal cause was not conclusively established, and this closure does not classify it as a confirmed product defect.

## Cleanup and credential revocation

The temporary Vercel automation bypass was revoked, no longer reached the protected SkillMint Preview, and Preview protection was restored. The temporary Supabase secret key was revoked and then returned HTTP 401. Both local temporary credential files were removed, the clipboard was cleared, and the pre-existing isolated-staging database-password file was retained.

Final isolated-staging Auth, profile, resume-analysis, and Workspace-selection counts were zero. The verification run ended with the repository clean at the Phase 1B baseline. Production was not contacted.

## Limitations and non-claims

This closure records isolated hosted engineering and synthetic automated Preview-flow verification. It does not establish general product validation, real-user evidence, Production readiness or rollout, public-beta authorization, legal or support readiness, operational readiness, accessibility certification, permanent reliability, or market validation. It changes no scoring, proof, mission, Active Target, JD freshness, analytics, browser ownership, export, Clear workspace, saved-report deletion, or protected account-deletion contract.

## Remaining real-user evidence gate

Moderated comprehension and repeat-use evidence must still show that intended users:

- understand the difference among saved resume analyses, the account Workspace resume, and the browser-active report;
- return to and deliberately use more than one saved analysis; and
- find that comparison would improve a useful next decision instead of encouraging score chasing.

Synthetic automated verification does not replace that evidence.

## Next decision

Review the real-user evidence, then choose exactly one outcome for Resume Workspace v1: **preserve, revise, defer, remove, or authorize Product Slice 2**. Resume Progress and Comparison v1 remains unauthorized unless that review explicitly selects the final option.
