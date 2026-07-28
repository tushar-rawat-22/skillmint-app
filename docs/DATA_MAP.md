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

All policies require the active-Auth-user guard plus exact ownership. The Workspace-resume selection also has a composite owner-qualified foreign key to `resume_analyses(user_id, id)`, so a malformed cross-owner reference fails at the database boundary. Anonymous and all unlisted browser operations are denied. Saved-report deletion is authenticated and owner-derived; full account preparation is service-role-only.

No repository Supabase Storage caller was found. The isolated target independently verified zero buckets and zero objects before and after the disposable run. This does not prove that production or out-of-band provider storage is empty.
