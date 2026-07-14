# SkillMint Data Map

> **Engineering verification (July 13, 2026): CLOSED AND FROZEN.** Source definitions and the authorized isolated-project catalog matched exactly. Production was not contacted; production catalog rollout remains pending.

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

## Account tables and least privilege

| Table | Owner | Browser operations | Export | Saved reports | Account deletion |
| --- | --- | --- | --- | --- | --- |
| `profiles` | `id` | select, insert, update | allowlisted; owner excluded | preserve | remove and verify |
| `resume_analyses` | `user_id` | select, insert, delete | allowlisted; keyset pagination | delete | remove and verify |
| `job_matches` | `user_id` | select, insert, update, delete | allowlisted; keyset pagination | delete | remove and verify |
| `career_snapshots` | `user_id` | select only | nonempty fails closed | delete via RPC | remove and verify |
| `beta_feedback` | `user_id` | select, insert | allowlisted; owner/status excluded | preserve | remove owned rows and verify |

All policies require the active-Auth-user guard plus exact ownership. Anonymous and all unlisted browser operations are denied. Saved-report deletion is authenticated and owner-derived; full account preparation is service-role-only.

No repository Supabase Storage caller was found. The isolated target independently verified zero buckets and zero objects before and after the disposable run. This does not prove that production or out-of-band provider storage is empty.
