# Resume Workspace v1 Architecture Decision

**Decision and status (July 28, 2026):** **Model C: a dedicated `active_resume_selections` table** is implemented for Version 2 Resume Workspace v1. The Phase 1A local V1–V8 replay, catalog/ACL/RLS probes, generated-type comparison, deterministic fixtures, and affected browser suites passed. Phase 1B then applied and verified V8 only on isolated staging and verified the staging-targeted protected Preview with synthetic automated signed-in flows. Production and public beta remain unauthorized. The later July 28 founder sequencing amendment makes bounded Phase 2 — Resume Progress and Comparison implementation the next authorized repository work.

## Current repository facts

`resume_analyses` is append-only account history in practice: each row has an immutable report payload, global UUID `id`, owner `user_id`, timestamp, and owner-scoped RLS. Browser-local `skillmint:resume-analysis` is the active dashboard report and is partitioned for anonymous, Account A, and Account B state. `resume-sync-status` may carry the saved row ID solely to describe its local sync relationship. A saved row is restored only through an explicit browser action; the dashboard does not silently replace a local report. Deleting that row detaches the local sync reference and preserves the browser report as local.

The repository has a one-row-per-account `profiles` table but profile creation is optional for resume persistence. Saved reports have owner-aware listing, current fixed-size display, browser restore, individual delete, bulk saved-report deletion, allowlisted account export, and protected account deletion. Phase 1A adds one account-owned Workspace selection, explicit set/change/clear controls, and an opt-in Dashboard offer without changing the current browser-active report automatically. Generated `Database` types are checked in under `src/lib/supabase/database.types.ts`. Existing V1–V7 migration files and frozen database evidence remain immutable.

## Models considered

| Model | Ownership and enforcement | State and lifecycle | Main risk |
| --- | --- | --- | --- |
| A. `profiles.active_resume_analysis_id` | `profiles.id` is the account owner, but a plain UUID FK cannot prove that the selected row has that same `user_id`. A composite unique `(user_id, id)` on analyses plus composite FK `(profiles.id, active_resume_analysis_id)` could enforce it. RLS remains profile-owner RLS. | Gives cross-device account selection, but setting a selection for an account with no profile creates or repurposes an identity/profile row. Clearing is nullable update; deleting the active analysis needs `ON DELETE SET NULL`. Browser-active remains separate. | Couples workspace state to profile lifecycle and makes an optional profile row carry a resume-workspace concern. The composite FK is easy to omit or weaken in a future change. |
| B. one-row-per-user `career_workspaces` | `user_id` can be the primary key and, with composite FK `(user_id, active_resume_analysis_id)` to an owner-qualified analysis key, can enforce same-owner selection. RLS is simple: `auth.uid() = user_id` plus active-user guard. | Clear is delete/null update; cross-device state is explicit. It provides a natural home for later workspace fields. | It creates a generic “workspace” abstraction before there is evidence for target/JD/mission persistence. Future fields can turn it into an unbounded dumping ground, and account deletion/export add another table immediately. |
| C. dedicated `active_resume_selections` | `user_id` is primary key and owner. A composite owner FK to `resume_analyses` provides database-level same-owner enforcement; RLS limits select/insert/update/delete to the active authenticated owner. | Exactly represents an account-level saved-analysis selection. Clear deletes the selection. Browser-active remains local; cross-device restore is an explicit offer. Deleting the selected analysis cascades only the selection. | Adds one table and lifecycle integration for a single pointer; if the product never uses cross-device selection, it is more persistence than needed. |

All three require explicit repository checks in addition to RLS: capture the expected user before an async request, re-confirm authenticated identity before publish, use owner/context epochs and request tokens in UI state, and discard delayed outcomes after account change. RLS protects data access, not stale browser publication.

### Model A detail — profile pointer

The profile row is owned by `profiles.id`, so a same-owner FK needs the composite pair described above; profile RLS alone prevents cross-account profile reads but does not validate a bare selected-analysis UUID. An account-active pointer can restore across devices, while the anonymous/browser-active report must remain a separate owner-partitioned value. Signed-out users have no profile pointer; selection and clearing are authenticated profile updates, and an active-analysis deletion needs `ON DELETE SET NULL` so history can remain immutable.

Export would add the pointer to the existing profile representation without exposing its owner; saved-report deletion and account deletion must clear/verify it before or through FK behavior. Resume listing pagination and future naming remain analysis concerns, but a profile pointer does not describe a named workspace or history ordering. Every profile update, export load, delete follow-up, and account switch needs stale-result guards. A forward migration must add the owner-qualified constraint and regenerate Supabase types; a failed or insufficient migration needs a forward fix, not alteration of V1–V7. This has the least new surface area but highest profile-coupling and optional-row risk, while future target/JD/mission expansion would either overload `profiles` or force another model later.

### Model B detail — generic workspace row

`career_workspaces.user_id` can own a one-row workspace and enforce a same-owner selected analysis through a composite FK and owner RLS. It permits a persistent account-active state independent of profiles, while signed-out/browser-active state stays local. Explicit selection is an insert/upsert and clearing is delete/null update; immutable history is not modified, and a deleted active analysis can cascade/delete or null the row according to the chosen lifecycle.

The table must join account export, individual/bulk saved-report deletion, and account-deletion verification. It does not change analysis keyset pagination or future resume naming, but it risks becoming a second home for those future concerns. UI/repository stale guards, generated types, a new forward migration, and forward-only repair rules are the same as Model A. Its expansion point for targets, JDs, missions, and other workspace fields is attractive only after evidence; before then it is unnecessary abstraction with a broad semantic name.

### Model C detail — dedicated selection row

`active_resume_selections.user_id` is the owner and primary key; a composite FK makes a cross-owner selection impossible at the database boundary, while RLS provides owner-only active-user CRUD. It persists an account-active selection for cross-device discovery but leaves anonymous and browser-active state untouched. Authenticated users explicitly set/change/clear it; signed-out users cannot create it. It never mutates the selected analysis, and `ON DELETE CASCADE` removes only the pointer when its saved analysis is removed.

Account export includes a bounded selection reference; individual/bulk saved-report deletion and full account deletion remove it and verify the expected absence. Pagination and future analysis naming remain on `resume_analyses`, so an old selection can be resolved outside the first page without inventing another history list. Repository/UI stale guards remain mandatory during select, fetch, clear, export, deletion, and account switching. It requires one forward migration, generated types, data-map/export/deletion contract updates, and forward-only fixes. It creates no generic extension point for target/JD/mission persistence, which is intentional: those future models must independently prove their ownership, lifecycle, and value.

## Why Model C

The strongest argument is scope precision with enforceable ownership. A dedicated selection is neither a hidden profile side effect nor a speculative workspace platform. It can express exactly one owner-qualified account pointer, be cleared by deleting one record, cascade away when the selected immutable analysis is deleted, and be added to export/deletion verification without changing the existing browser-active contract. It also leaves a future target/JD/mission design free to earn its own data model instead of inheriting an accidental `career_workspaces` bucket.

The strongest counterargument is operational simplicity: Model A needs no new table and a profile is already one row per account. If future product discovery proves the profile is the settled account workspace container, a profile column would be easier to query and administer. That is not enough to outweigh the optional-profile and concern-coupling cost today.

Model A is rejected because selection is not profile identity and profiles may not exist. Model B is rejected because its name and apparent extensibility invite premature persistence for Active Target, JDs, missions, and unrelated workspace state. Model C is the smallest durable contract; it is not a commitment to a broad workspace aggregate.

## Implemented data contract

V8 implements this owner-qualified table:

```text
public.resume_analyses
  constraint resume_analyses_user_id_id_key unique (user_id, id)

active_resume_selections
  user_id uuid primary key references auth.users(id) on delete cascade
  resume_analysis_id uuid not null
  selected_at timestamptz not null default now()

  foreign key (user_id, resume_analysis_id)
    references resume_analyses(user_id, id)
    on delete cascade
```

V8 adds the named `public.resume_analyses_user_id_id_key` UNIQUE constraint required by the composite foreign key and removes only the now-redundant non-unique `resume_analyses_user_id_id_idx`. The separate `(user_id, created_at desc, id)` history index remains. Local catalog inspection confirmed the exact constraints and retained indexes.

The composite key is mandatory. A foreign key on `resume_analysis_id` alone is insufficient because it permits a selection row for Account A to reference Account B's analysis. `selected_at` is the one timestamp: it represents when the current selection was made, is retained for a no-op write, and is reset with database-controlled `statement_timestamp()` only when the selected analysis changes. There is no `updated_at` without a demonstrated separate lifecycle need. Ownership authority comes from the authenticated session, RLS, and the composite FK; client ownership input is never trusted. `resume_analyses.user_id` remains immutable for the user-facing repository and has no browser update path. The table has RLS enabled, no public/anonymous or service-role raw table access, revoked default privileges, authenticated column-level CRUD permissions, and exactly four policies requiring `is_active_skillmint_user()` and exact `auth.uid() = user_id`; privileged account-deletion preparation remains server-only.

The generated Supabase `Database` type contains the table, relationship, and adjusted function results. Default local generation from the reset V1–V8 database matches the checked-in content exactly; the checked-in copy removes only the CLI's extra blank line at EOF so `git diff --check` remains clean. No hand-waved `any`, mismatched generated type, or client-supplied owner is accepted.

## Exact user-visible behavior

- A signed-out user has only an anonymous browser-active report. There is no account-active selection, cross-device claim, or account selection write.
- A signed-in user can explicitly select one of their saved analyses as the account workspace resume. Selecting it never changes Career IQ, Proof Confidence, role fit, JD Match, Active Target, or missions.
- Selecting an account workspace resume does **not** silently overwrite the current browser-active report, including on another device. When no local active report exists, the UI may offer “Use your selected workspace resume”; accepting that offer writes the report into the current browser owner partition. The user can decline and upload/restore another report.
- The user can change or clear the account selection explicitly. Clearing removes only the account selection and leaves saved history and the current browser report unchanged.
- Saved analyses remain immutable history; a selection is only a pointer. Future resume naming can use a later optional display-name field on the analysis, not alter this selection contract.
- Deleting the selected saved analysis removes its selection through the FK cascade. The local browser report is preserved but its saved-row sync reference is detached, exactly as existing individual deletion behavior requires. Bulk saved-report deletion removes selections and leaves any browser report local. Full account deletion removes the selection with account data.

## Implemented repository boundary

The bounded implementation consists of the V8 forward SQL source/migration and manifest entry; generated `src/lib/supabase/database.types.ts`; owner-qualified resume-selection and saved-analysis repositories under `src/modules/resume/services`; resume types/exports; explicit Resume and Dashboard orchestration; existing browser sync/storage integration only where a deleted saved reference must detach; account count/export/deletion contracts; updated data-control documentation; deterministic fixtures; and focused Playwright coverage. Business rules remain in repositories, intelligence, storage, and protected deletion modules rather than presentation components.

No existing migration, frozen schema file, RLS policy, export format, browser key, Active Target contract, JD freshness rule, score contract, mission rule, or account-deletion identity derivation may be rewritten. Use one new timestamped forward migration, validate against the staging-only environment when authorized, and roll a discovered defect forward with another reviewed migration. Do not edit applied SQL, repair migration history, or attempt an unreviewed rollback. If a migration fails before use, stop and use the reviewed rollback/forward-fix plan; do not improvise hosted repair.

## Verification completed for the local engineering gate

**Database and deterministic checks** proved: clean local V1–V8 replay; exact catalog, policy, privilege, trigger, function, and index shape; same-owner composite-FK enforcement; anonymous and inactive-user denial; Account A/B CRUD isolation; selection only for an owned existing analysis; insert/replace/no-op timestamp semantics; explicit replace and clear; deletion cascades; individual and bulk saved-report deletion; protected account-deletion cleanup/count/absence; export allowlisting and owner-ID omission; selected analysis outside the first history page; generated-type provenance; stale owner/context/request rejection; and preserved browser partition, Clear workspace, scoring, target, JD freshness, mission, analytics, and Block 5 contracts.

**Browser checks** covered: signed-out state; explicit set/change/clear; browser-active versus Workspace copy; a fresh-browser offer that requires acceptance; user decline; Account A/B switches during selection/load/delete; late Account A results after B is current; selected-analysis deletion while browser-active; bulk saved-report deletion; full account-deletion follow-up; export and ownership behavior; keyboard/focus/error/status semantics; reduced motion; narrow-screen wrapping; and critical Firefox/WebKit paths.

These checks close the local Phase 1A engineering gate. They preserve the original local verification history and do not themselves establish hosted behavior.

## Bounded hosted Phase 1B verification

Phase 1B used the isolated `skillmint-block6-test` project (`fowxrrgntlsgyyuoiesx`) and its Vercel Authentication-protected Preview. The ACL-normalization migration and V8 were recorded exactly once, migration history aligned through V8, the final dry run had zero pending migrations, and hosted public-schema lint and catalog verification passed. The hosted catalog confirmed the owner-qualified composite foreign key, RLS, four authenticated owner policies, database-controlled selection trigger, least-privilege authenticated grants, denial of anonymous and `service_role` raw-table access, and intended lifecycle-function execution.

A rollback-contained hosted behavior probe passed 18/18 across ownership, cross-account isolation, timestamp control, raw-table denial, clearing, cascades, bulk cleanup, and protected account-deletion behavior. Synthetic Preview checks confirmed that set/change/clear actions preserve saved history and browser-active authority, while fresh-browser activation remains explicit; the final fresh-browser slice passed 8/8. Runtime interception proved the Preview login targeted staging, and the target-identification token request was aborted before network transmission. Temporary credentials were revoked, disposable data returned to zero, Preview protection was restored, and Production was not contacted.

One diagnostic saw two duplicate aborted Auth identity requests and matching console messages alongside successful identity, saved-analysis, and selection responses, two rendered cards, zero page errors, and full cleanup. It was not reproduced in the final fresh-browser slice, is recorded as a non-blocking automated-test/navigation observation, and has no conclusively proven internal cause. See [Version 2 Resume Workspace Phase 1B Closure](V2_RESUME_WORKSPACE_PHASE_1B_CLOSURE.md).

Phase 1B is synthetic automated engineering evidence, not real-user product validation. Moderated comprehension, repeat use of more than one saved analysis, and evidence that comparison improves a useful next decision remain required during controlled early access and may cause Phase 1 or Phase 2 to be preserved, revised, deferred, or removed.

## Smallest complete implementation boundary and non-goals

The smallest complete boundary is one account-owned selection pointer, owner-enforced at the database layer, explicit UI controls, cross-device **offer** rather than auto-activation, lifecycle integration for export and deletion, generated types, deterministic fixtures, and focused browser tests. It does not include resume editing, content/version generation, comparison, resume naming, account-level Active Target/JD/mission persistence, generic workspace fields, redesign, AI, applications, interview preparation, integrations, payments, or Production rollout.
