# Privacy Notice Source

The public `/privacy` page describes current beta behavior: browser-local state, optional account-synced rows, resume/JD interpretation, evidence candidates rather than verified proof, Active Target as a non-scoring focus layer, and Career IQ as neither a hiring guarantee nor placement probability.

Browser-local means registered values stored by this browser. Owner-aware values can hold separate anonymous and account partitions on a shared device; the current owner cannot read or export another partition. Browser-wide clear removes all registered clearable keys. Browser export contains only the visible partition and registered global preferences. Account export is a separate authenticated allowlisted collection, not provider history or an atomic snapshot.

Anonymous feedback is browser-local. Signed-in feedback first attempts an account save and may fall back to that account’s browser partition. There is no background queue, automatic retry, or future-sync promise. Browser export excludes operational `syncError`; account export excludes moderation status.

Block 5.3 requires direct provider password reauthentication, signed recent-password AMR, active-user-guarded owner RLS, verified account-table cleanup, and explicit hard Auth deletion. These behaviors passed on an authorized isolated test project, including A/B isolation, stale-token and concurrent-write containment, and complete disposable cleanup. Production was not contacted and production rollout remains pending.

SkillMint does not claim GDPR/DPDP certification, end-to-end encryption, total security, data never leaving the device, permanent provider-wide erasure, or production readiness. Provider backup/log deletion and legal compliance were not proved. `SKILLMINT_PRIVACY_CONTACT_EMAIL` is optional centralized configuration; missing or malformed configuration is a release blocker and no address is fabricated. Code cannot prove external ownership or monitoring.
