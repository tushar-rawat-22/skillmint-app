# SkillMint Beta v1 Build Roadmap

**Status:** Locked roadmap for Beta v1 completion; Block 5 engineering CLOSED AND FROZEN on July 13, 2026 after authorized isolated live-security proof. Beta release remains blocked pending production rollout and external privacy-contact verification.
**Historical original Beta v1 planning estimate:** Realistic 5-6 weeks; conservative 7-8 weeks. This is not a current launch date or a new estimate.
**Rule:** No users until Beta v1 Complete unless the founder explicitly changes strategy.

**Sequencing amendment:** A one-to-two-day Pre-Block-6 Brand & Domain Decision Gate is approved after this documentation alignment. It is not an eighth block and does not change the seven-block numbering.

## Current State

SkillMint already has resume upload; deterministic, proof-aware scoring; active browser report state; saved resume analyses and dashboard restore; Career IQ, Proof Confidence, and Harsh Truth; Profile-fit roles and Latest JD Match; mission execution and Career Path; Active Target and JD freshness controls; owner-aware browser partitions; the Trust Center; browser and account exports; saved-report deletion; browser-only clear workspace; and protected backend account deletion.

Beta v1 is now about making the product trustworthy enough for students, freshers, and early-career users to accept direct scoring, proof gaps, and career guidance without mistaking signals for guarantees.

## Why This Roadmap Is Locked

The product needs trust before expansion. New phases, payments, AI chat, job boards, or analytics implementation can distract from the core promise: show users where they stand, which roles fit, what proof is missing, and what to fix next.

Every future block must preserve previous block outputs. No block should collapse active versus saved report semantics, proof trust language, or the difference between Profile-fit roles and Latest JD Match.

## Locked Beta v1 Roadmap

1. Premium Product UI System
2. Scoring Calibration + Truth Engine
3. Mission Execution System
4. Active Target + JD Workflow
5. Data Controls + Trust Center
6. Analytics + Founder Dashboard
7. Beta Launch Readiness

Current status:

| Sequence | Status |
| --- | --- |
| Blocks 1-3 | Complete and frozen |
| Block 4 | Complete, hardened, merged, and frozen |
| Block 5 | Complete, verified, merged, synchronized, and frozen |
| Pre-Block-6 Brand & Domain Decision Gate | Approved next sequence; not a block |
| Block 6 | In progress; Block 6.1 merged and frozen pending rollout; Block 6.2 repository-only implementation pending final independent review |
| Block 7 | Not started |

## Block Purposes And Boundaries

### 1. Premium Product UI System

Status: Complete and preserved.

Purpose: Make SkillMint feel premium, minimal, light-toned, trustworthy, and screenshot-friendly without changing product logic.

Out of scope: scoring math, proof math, JD match logic, role matching logic, roadmap generation, auth, schema, payments, analytics, mission completion, active target workflow, deletion, AI chat, or job board.

Dependencies: Existing dashboard, resume, ATS, roadmap, settings, upload, setup, auth, and docs.

### 2. Scoring Calibration + Truth Engine

Status: Completed before Block 3.

Purpose: Calibrate Career IQ, Proof Confidence, ATS Readiness, Recruiter Confidence, Profile-fit roles, Latest JD Match, and trust language against representative resumes.

Block 2 scope: deterministic 0-100 score contract, locked Career IQ formula, signal ledger, claimed-versus-backed skill behavior, explainable caps, role-aware evidence handling, fixture checks, old-report compatibility, and scoring documentation.

Out of scope: UI redesign, mission execution, payments, AI chat, job board, fake proof verification, or launch claims.

Dependencies: Block 1 premium light UI must remain intact.

### 3. Mission Execution System

Status: Completed before Block 4.

Purpose: Turn roadmap and next actions into mature career execution without making SkillMint childish or game-like.

Block 3 scope: mission contract, deterministic mission generation, mission prioritization, local mission status, evidence-detected state from re-analysis, Career Path Engine, Closest Role Path, Latest JD Path, Ultimate Goal Path, and 30/60/90 proof plans.

Out of scope: arcade XP, coins, leaderboards, over-celebration, payments, AI chat, job board, backend mission persistence, mission completion analytics, external proof verification, active target workflow, saved JD history, or score manipulation.

Dependencies: Blocks 1 and 2 must remain intact.

### 4. Active Target + JD Workflow

Status: Completed and frozen; preservation fixtures remain required.

Purpose: Add one browser-local Active Target focus layer so users can focus ATS/JD workflow, dashboard target summary, mission priority, and roadmap emphasis without changing scores.

Block 4 scope: Active Target contract, local storage adapter, Active Target engine, resume-context freshness checks for JD Match snapshots, account-safe browser-local target isolation, JD Match to Active Target flow, latest JD conversion, dashboard Active Target card, target-aware mission priority, roadmap recommended path behavior, clear/replace target, copy target summary, fixtures, and docs.

Out of scope: score boosts, scoring math changes, fake JD scores for non-JD targets, saved JD history, multi-job tracker, job board, job scraping, auto apply, cover letters, resume version generation, backend target persistence, Supabase migration, payment gates, or employer-specific guarantees.

Dependencies: Blocks 1-3 must remain intact.

Block 4 remains subject to its independent audit. Block 5 adds data controls without changing Block 4 score, ownership, or freshness contracts.

### 5. Data Controls + Trust Center

Status: 5.1 Browser Data Safety, 5.2 Export and Trust Center Reliability, and 5.3 Deletion, Database, Privacy, and Release Safety are CLOSED AND FROZEN. The authorized isolated project passed exact catalog, least-privilege RLS, export, recent-auth, real-route deletion, stale-token, concurrency, hard-delete, and cleanup gates. Production was not contacted. Production schema rollout, monitored privacy/support contact, legal review, provider backup/log retention proof, and operational ownership remain beta-release blockers.

Purpose: Make storage, privacy, delete controls, account state, browser-only state, and trust copy clear and honest.

Out of scope: fake delete, fake privacy controls, destructive account actions without backend support, payments, or analytics exposure.

Dependencies: Blocks 1-4 must remain intact.

## Pre-Block-6 Brand & Domain Decision Gate

**Status:** Approved sequencing amendment recorded after Blocks 1-5 were completed. This is not Block 6 and does not renumber the roadmap.

**Duration:** One focused working day, with a second day only if availability or risk screening requires it.

**Purpose:** Select one public name, one backup, and one usable domain before public labels, founder-facing presentation, launch documents, support identity, metadata, and external communications accumulate naming debt. The public name and domain are currently pending. This product sequencing choice is not a technical dependency for analytics.

Block 6 event IDs, event schema names, persistent identifiers, storage contracts, and data keys must remain brand-neutral. Illustrative event IDs such as `resume_analysis_completed`, `active_target_created`, `jd_match_completed`, `mission_started`, and `mission_completed` are examples only, not an approved event taxonomy. This gate does not authorize an analytics provider, schema, event list, persistence model, or implementation.

Sequence:

1. Create an initial shortlist and select three finalists.
2. Review domain availability plus basic competitor, confusion, pronunciation, spelling, and trademark risk.
3. Select one public name and one backup.
4. Reserve a usable domain.
5. Create a bounded public-brand foundation branch with centralized public-brand configuration.
6. Change user-facing brand surfaces only.
7. Preserve internal SkillMint identifiers, including browser keys, TypeScript/database names, repository/package names, schemas, fixtures, commits, and frozen evidence.
8. Re-run frozen Block 1-5 preservation checks, merge, and synchronize the public-brand layer.
9. Begin Block 6.

The gate is not a full rebrand or visual redesign. It does not authorize production, DNS, Vercel, Supabase, authentication, schema, storage, repository, or package changes. Domain activation and production configuration belong to Block 7. See [Brand & Domain Decision Gate](BRAND_DOMAIN_GATE.md).

### 6. Analytics + Founder Dashboard

Status: In progress. Block 6.1 is merged and frozen pending rollout and is not pending another repository engineering review. The Block 6.2 current-environment aggregation and isolated protected founder dashboard exist only in the repository and remain pending final independent review. Events are never people, and the implementation adds no identity, unique-person, retention, cohort, or session analytics. Windows use exact elapsed 24/168/720-hour `received_at` boundaries, and the unapplied purge contract uses an exact 1,080-hour threshold with at most 10,000 deletions per invocation. Production migration, live collection, founder UUID configuration, mandatory Vercel WAF enforcement, authorized `pg_cron` scheduling, operational monitoring, and Block 6 closure are not complete. No live service was contacted and no deployment occurred.

Purpose: Give the founder safe product-health visibility for beta readiness and learning.

Out of scope: exposing private user data, adding public analytics surfaces, or using analytics to overclaim readiness.

Dependencies: Blocks 1-5 must remain intact.

### 7. Beta Launch Readiness

Status: Not started.

Purpose: Final QA, smoke testing, copy review, onboarding readiness, and launch/no-launch decision.

Out of scope: overclaiming launch readiness, adding major new features, payments, AI chat, or job board.

Dependencies: Blocks 1-6 must remain intact.

## Global Constraints Before Beta v1 Complete

- No users until Beta v1 Complete unless the founder explicitly changes strategy.
- No payments before Beta v1 Complete.
- No AI chat before Beta v1 Complete.
- No job board before Beta v1 Complete.
- No fake metrics, fake proof verification, fake deletion, or fake privacy controls.
- Every future block must preserve previous block outputs.

## Preservation Rules

- Block 2 must not undo premium light UI.
- Block 3 must not make missions childish/gamified.
- Block 4 must not confuse Profile-fit roles with Latest JD Match.
- Block 5 must not fake delete/privacy controls.
- Block 6 must not expose private user data.
- Block 7 must not overclaim launch readiness.
- All future blocks must preserve scoring trust language.

## Scoring Trust Language To Preserve

- Career IQ is not a job guarantee.
- Proof Confidence is based on evidence candidates, not external verification.
- Missing proof means unverified, not false.
- Profile-fit roles are general resume-fit suggestions.
- Latest JD Match is one specific pasted JD.
- Latest JD Match is tied to the resume-analysis context that produced it.
- Stale JD Match results must be recalculated before showing a current score.
- Active Target focuses next actions and does not change core scores.
- Saved analysis is account history.
- Active report powers this browser dashboard.
- Clear workspace is browser-only.
- Delete must not be faked.
- Data controls must not mutate Career IQ, Proof Confidence, ATS/JD scoring, mission scoring, or Active Target freshness.
