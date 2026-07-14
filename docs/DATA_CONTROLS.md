# Data Controls

> **Block 5 engineering status (July 13, 2026): CLOSED AND FROZEN.** Blocks 5.1, 5.2, and 5.3 passed their final fixtures, browser gates, isolated live-security lifecycle, and cleanup. Beta release remains blocked pending production rollout and external privacy-contact verification.

## Authority and ownership

Browser data and account data are separate authorities. `skillMintStorageRegistry.ts` is the browser inventory used by summary, export, import, owner removal, and browser-wide clear. The product never calls `localStorage.clear()`.

Owner-aware values use separate anonymous and account partitions. Authentication loading is unresolved ownership, not signed-out ownership. The Trust Center displays only the current owner partition and never exposes another owner’s identifiers or content. Legacy unscoped values remain anonymous until an explicit guarded import succeeds.

Browser-wide clear removes every registered clearable SkillMint key in that browser and reports partial failure; it does not delete account rows. Confirmed account deletion removes only the captured deleted owner’s partition. Same-tab and cross-tab notifications are refresh hints, not transactional synchronization.

## Account actions

Counts and exports are authenticated, owner-bound, epoch/token checked, and rejected on provider-identity mismatch. Count failure stays distinct from zero. Account export uses explicit field allowlists and fails closed for unsupported nonempty data; browser download copy claims only that a download was requested.

Delete saved reports removes resume analyses, JD matches, and career snapshots through the authenticated owner-bound RPC, then detaches only proven deleted references from the same browser owner. Profiles and feedback remain.

Account deletion requires recent provider password AMR and the protected server route. The route uses a service-role-only preparation RPC for the server-derived user, a verified non-applicable Storage stage, and explicit hard Auth deletion. Active-user-guarded RLS blocks stale identities. Isolated live proof covered exact grants, RLS, A/B isolation, export, stale tokens, concurrency, route failures, deletion, and cleanup.

Data controls never alter Career IQ, Proof Confidence, Profile-fit Roles, Latest JD Match, Active Target freshness, mission scoring, or roadmap truth.

Production was not contacted. Production rollout, contact ownership/monitoring, legal review, provider backup/log retention proof, and operational ownership remain open.
