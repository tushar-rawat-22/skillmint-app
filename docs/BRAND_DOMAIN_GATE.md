# Pre-Block-6 Brand & Domain Decision Gate

## Purpose

This gate selects a public product name, a backup, and a reservable domain before public labels, founder-facing presentation, launch documentation, support identity, metadata, and external communications accumulate naming debt. It is a product and communication sequencing choice, not a technical dependency for analytics.

The gate is an approved sequencing step before Block 6. It is not Block 6, does not renumber the seven-block roadmap, and is limited to one focused working day, with a second day only if availability or risk screening requires it.

## Decision rationale

- **CEO:** Resolve the public identity before public presentation and launch preparation create avoidable naming debt.
- **CFO:** Spend at most a bounded amount on a usable reservation; do not fund a broad rebrand, migration, or production rollout at this stage.
- **CTO and architecture:** Centralize public-facing brand values while preserving brand-neutral analytics identifiers, stable internal identifiers, and frozen Block 1–5 behavior.
- **Product and UX:** Keep one coherent public name across visible surfaces without redesigning the implemented premium light-first system.
- **Security:** Domain selection and reservation must not change trusted origins, redirect allowlists, secrets, authentication, or deletion-origin behavior.
- **QA:** Verify the public-brand foundation in proportion to the surfaces it changes while preserving unrelated frozen behavior.
- **Growth:** Choose a name users can hear, spell, remember, search for, and distinguish without making unsupported product claims.

## Required outputs

| Decision | Status |
| --- | --- |
| Selected public name | `Pending` |
| Backup public name | `Pending` |
| Selected domain to reserve | `Pending` |

The working project name remains SkillMint until these fields are decided.

The gate must produce:

1. an initial name shortlist;
2. three finalists;
3. documented domain availability review;
4. basic competitor, confusion, pronunciation, spelling, and trademark-risk screening;
5. one selected public name and one backup;
6. one usable domain reservation;
7. a bounded public-brand foundation plan;
8. a preservation-check result before merge.

Basic risk screening is a decision aid, not a legal trademark clearance. Unresolved material risk blocks selection or requires qualified review.

## Naming and domain criteria

The selected name should be distinctive enough to avoid obvious category confusion, pronounceable for the intended audience, easy to spell after hearing it, and compatible with SkillMint's proof-aware career positioning. It must not imply guaranteed employment, verified credentials, recruiter endorsement, or regulatory status.

The domain should be usable, affordable within the approved reservation budget, free of obvious typo/confusion risk, and compatible with later HTTPS, email, canonical URL, and authentication requirements. Availability at review time is not ownership; reservation must be confirmed before the gate closes.

## Public-only rename boundary

After selection, create one bounded public-brand foundation branch. Add centralized public-brand configuration and change only user-facing brand surfaces that need the selected public name.

Internal SkillMint identifiers may remain indefinitely. Preserve:

- `skillmint:*` browser-storage keys;
- `skillMintStorageRegistry` and TypeScript identifiers;
- repository, local folder, and package names;
- environment-variable names;
- Supabase tables, functions, schema filenames, and migrations;
- fixtures, frozen evidence, historical documents, commits, and tags.

This boundary avoids storage migrations, cache loss, schema risk, evidence invalidation, and repository churn that provide no user benefit.

Brand may affect UI labels, founder-dashboard headings, metadata, documentation, support channels, launch copy, and public report presentation. It must not affect analytics event IDs, account IDs, browser keys, database identifiers, schema names, API contracts, or frozen evidence.

Analytics event IDs, event schema names, persistent identifiers, storage contracts, and data keys must remain brand-neutral and independent of the public name. Illustrative identifiers such as `resume_analysis_completed`, `active_target_created`, `jd_match_completed`, `mission_started`, and `mission_completed` are examples only, not approval of an event taxonomy. This gate does not authorize an analytics provider, schema, event list, persistence model, or implementation.

## Prohibited changes

The gate is not a full rebrand or visual redesign. It does not authorize:

- production changes or a public launch;
- domain activation, DNS changes, or email setup;
- Vercel project, branch, or environment changes;
- Supabase Site URL or redirect changes;
- allowed-origin, canonical URL, or password-reset changes;
- schema changes, migrations, storage migration, or browser-key migration;
- repository, folder, package, environment-variable, TypeScript, database, fixture, or historical-evidence renaming.

## Regression requirements

Verify the future public-brand foundation in proportion to its changed surfaces:

- run lint and the TypeScript/build checks;
- review primary routes, responsive header/navigation/footer behavior, metadata and browser titles, auth labels, and privacy/trust labels;
- review export filenames only if the brand appears in them;
- confirm internal identifiers are unchanged and no storage migration occurred;
- confirm no scoring, mission, Active Target, export, deletion, schema, API, or route behavior changed;
- run affected Playwright coverage and fixtures only where the changed public surfaces are covered.

A text-only label change does not require every unrelated test. These checks do not authorize a redesign, new routes, storage changes, domain activation, or production work. Merge and synchronize the public-brand layer before Block 6 begins.

## Domain activation belongs to Block 7

Reservation does not activate the domain. Block 7 must coordinate the Vercel production branch, domain mapping, Preview and Production environment scopes, `NEXT_PUBLIC_APP_URL`, allowed origins, Supabase Site URL, redirect allowlists, password-reset links, canonical URLs, privacy/support email, auth and deletion-origin smoke tests, monitoring, and rollback.

No production change is authorized by this document.
