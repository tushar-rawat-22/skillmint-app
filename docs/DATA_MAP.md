# SkillMint Data Map

> **Engineering verification (July 13, 2026): CLOSED AND FROZEN.** The then-authorized V1–V4 source definitions and isolated-project catalog matched exactly. Production was not contacted; production catalog rollout remains pending. Later forward migrations do not rewrite that dated evidence.

> **Phase 1A local extension (July 28, 2026): VERIFIED LOCALLY.** A clean local V1–V8 replay and exact catalog/ACL/RLS/lifecycle probes verified `active_resume_selections`. V8 was not applied to a hosted or Production database.

## Browser registry

| Key | Owner / module | v | Personal | Clear / export | Legacy behavior |
| --- | --- | ---: | --- | --- | --- |
| `skillmint:resume-analysis` | resume active report | 1 | yes | yes / yes | anonymous object |
| `skillmint:resume-sync-status` | resume sync | 1 | no | yes / yes | anonymous object |
| `skillmint:jd-match` | latest JD Match | 1 | yes | yes / yes | anonymous object |
| `skillmint:jd-match-history` | JD history | 1 | yes | yes / yes | anonymous array |
| `skillmint:jd-match-sync-status` | JD sync | 1 | no | yes / yes | anonymous object |
| `skillmint:active-target:v1` | Active Target | 1 | yes | yes / yes | anonymous valid target |
| `skillmint:target-role-setup` | onboarding setup | 1 | yes | yes / yes | anonymous object |
| `skillmint:mission-status:v1` | mission status | 1 | yes | yes / yes | anonymous object |
| `skillmint:selected-career-path:v1` | mission path | 1 | yes | yes / yes | anonymous string |
| `skillmint:beta-feedback` | feedback fallback | 1 | yes | yes / yes | anonymous array |
| `skillmint:onboarding-dismissed` | onboarding preference | 1 | no | yes / yes | global |
| `skillmint:upgrade-interest` | activation interest | 1 | no | yes / yes | global |

Descriptors are aggregated by `src/lib/storage/skillMintStorageRegistry.ts`. Account-aware containers preserve anonymous, Account A, and Account B partitions independently. Unsupported, corrupt, future-version, and partial envelopes fail closed.

Resume Workspace v1 adds no browser-storage key or descriptor. Its account selection remains separate from the existing owner-partitioned active report and resume sync-status values.

## Account tables and least privilege

| Table | Owner | Browser operations | Export | Saved reports | Account deletion |
| --- | --- | --- | --- | --- | --- |
| `profiles` | `id` | select, insert, update | allowlisted; owner excluded | preserve | remove and verify |
| `resume_analyses` | `user_id` | select, insert, delete | allowlisted; keyset pagination | delete | remove and verify |
| `active_resume_selections` | `user_id` | owner-only select, insert, selection update, delete | allowlisted; zero-or-one; owner excluded | delete before analyses and verify | remove, count, and verify |
| `job_matches` | `user_id` | select, insert, update, delete | allowlisted; keyset pagination | delete | remove and verify |
| `career_snapshots` | `user_id` | select only | nonempty fails closed | delete via RPC | remove and verify |
| `beta_feedback` | `user_id` | select, insert | allowlisted; owner/status excluded | preserve | remove owned rows and verify |
| `account_personas` | `user_id` | owner-only select; server-owned insert only after V11 | allowlisted; owner excluded; zero-or-one | preserve | remove and verify |
| `proof_briefs` | `user_id` | owner-only select; same-origin authenticated server mutation only | allowlisted; keyset pagination; owner and token hash excluded | delete before analyses and verify | remove and verify |
| `recruiter_role_evidence_maps` | `user_id` | owner-only select; server mutation only | allowlisted; keyset pagination; owner excluded | preserve | remove and verify |
| `candidate_evidence_reviews` | `user_id` | candidate-owner select; server mutation only after live-token review authorization | allowlisted; keyset pagination; owner and internal role-map reference excluded | delete with related Proof Brief | remove and verify |

All policies require the active-Auth-user guard plus exact ownership. The Workspace-resume selection and Proof Brief tables have composite owner-qualified foreign keys to `resume_analyses(user_id, id)`, so a malformed cross-owner reference fails at the database boundary. Candidate reviews likewise bind `(user_id, proof_brief_id)` to the same Proof Brief owner. Anonymous table access and all unlisted browser operations are denied. Proof Brief mutations are owned by the authenticated same-origin server route, which reloads the exact owned saved analysis and derives the public payload rather than accepting one from the browser. Public evidence labels must match the server-owned canonical skill vocabulary; free-form stored profile labels are discarded. V11 removes browser persona writes. Recruiter role maps and candidate reviews can be written only through service-only functions after verified persona and role ownership; role-map limits are serialized, and the review function locks and rechecks the live link in the same transaction as insertion. A narrowly scoped anonymous/authenticated function can return only the derived payload and sharing timestamp for an active `LINK_ONLY` token hash. Saved-report deletion is authenticated and owner-derived; full account preparation is service-role-only.

No repository Supabase Storage caller was found. The isolated target independently verified zero buckets and zero objects before and after the disposable run. This does not prove that production or out-of-band provider storage is empty.
