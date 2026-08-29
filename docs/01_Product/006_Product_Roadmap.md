# Product Roadmap

**Document ID:** ROAD-001

**Status:** Active sequencing authority

**Last reconciled:** August 29, 2026

This roadmap defines the order of work, not launch permission. Current repository state, CI, deployment evidence, and the applicable launch/security gates must be re-verified from `main` before acting on it.

## Product direction

SkillMint is a focused career-intelligence product for candidates and recruiters. The core promise is evidence-backed career guidance: show what the resume supports, where the evidence is weak, what action is most useful next, and what changed after re-analysis.

The product must not imply hiring probability, placement certainty, recruiter approval, salary certainty, or model quality that is not grounded in actual contracts and data.

## Preserved foundation

The following capabilities are established and should be treated as preservation boundaries rather than prompts for broad rewrites:

- proof-aware resume analysis and deterministic scoring;
- Profile-fit Roles, Active Target, JD Match, missions, and re-analysis;
- account-owned saved analyses plus separate browser-active report state;
- Resume Workspace and evidence-only report comparison;
- Trust Center, export, saved-report deletion, protected account deletion, and owner isolation;
- privacy-safe analytics implementation with analytics disabled by default;
- controlled-access public candidate and recruiter demos using synthetic data;
- candidate Proof Brief sharing with default-private, revocable, link-only publication;
- recruiter evidence review with candidate-owned structured feedback;
- application-level public signup gate that defaults closed;
- server-owned OAuth provider gates that default closed;
- guarded OAuth PKCE initiation and callback handling;
- one immutable server-owned Candidate or Recruiter account persona;
- one canonical persona-creation path used by OAuth onboarding and authenticated product flows.

## Current launch sequence

### 1. Authorization consistency

**Status:** Active.

Every authenticated Candidate-only and Recruiter-only surface must consume the server-owned immutable persona as authorization context. Do not infer authorization from client state, labels, routes, or requested actions.

Recent work removed duplicate persona creation authority and enforced Candidate persona on Proof Brief operations. Continue only where repository evidence shows a remaining role-boundary gap.

### 2. Production schema and auth reconciliation

**Status:** `NO-GO` until current Production evidence and rollout prerequisites are satisfied.

Repository migrations now extend beyond the older V1-V9 rollout plan and include the two-sided beta/persona foundation. Production migration history, live grants, backup/restore evidence, and other rollout prerequisites must be re-established before any schema write.

OAuth code being present in `main` does **not** authorize provider activation. Public signup and OAuth providers remain fail-closed unless explicitly enabled through their reviewed server-side gates and the hosted provider configuration is separately verified.

### 3. Controlled onboarding readiness

**Status:** Pending the preceding authorization and Production gates.

Candidate onboarding must reach a useful evidence result quickly and explain what is known, what is missing, and what to do next. Recruiter onboarding must remain evidence-review focused rather than becoming a generic dashboard.

Required quality characteristics:

- useful empty, loading, retry, and error states;
- keyboard-accessible and responsive primary flows;
- clear separation between candidate evidence, recruiter review, and synthetic demo data;
- no fabricated activity, outcomes, confidence, salary, or recruiter behavior;
- explicit user control over evidence publication and revocation.

### 4. Controlled beta evidence

**Status:** Not a substitute for engineering verification.

Once launch gates permit real controlled users, collect only evidence needed to answer product questions: whether candidates understand the evidence hierarchy, whether the next action is useful, whether recruiters can judge support efficiently, and where users abandon or become confused.

Do not expand scope because a metric is unavailable. Analytics remains privacy-safe and disabled until separately authorized.

### 5. Commercial expansion

**Status:** Deferred.

Billing, premium plans, university/company portals, public APIs, native applications, broad AI chat, and job-board expansion are not current launch work. Introduce them only after the core candidate/recruiter evidence loop demonstrates recurring value and the security/privacy/operational model can support the added surface.

## Prioritization rules

Choose work in this order:

1. demonstrated security, privacy, authorization, or data-integrity defects;
2. launch blockers with a clear safe repository fix;
3. candidate or recruiter workflow defects that obstruct the core evidence loop;
4. accessibility, responsive, reliability, and failure-state defects on primary flows;
5. maintainability or cost work that removes a demonstrated operational risk;
6. new capability only when it directly strengthens validated product value.

Do not create speculative hardening, dependency churn, documentation churn, or cosmetic work to manufacture progress.

## Launch boundaries

- GitHub `main` and exact-head CI are the engineering source of truth.
- A successful merge or Vercel deployment is not proof that Production database or hosted Auth state matches repository expectations.
- Production schema writes require the current rollout authority, verified rollback/recovery evidence, and explicit authorization.
- Hosted OAuth/provider settings, credentials, billing, destructive Production data actions, and irreversible account-level changes require founder intervention.
- Public signup, OAuth providers, and analytics must remain fail-closed unless their independent launch gates are satisfied.
- Free/low-cost architecture remains preferred; recurring spend needs a demonstrated business or reliability requirement.

## Historical roadmap

The original Phase 0-5 roadmap described a broad progression from foundation to commercial expansion. It is preserved in Git history, but it is no longer safe as current sequencing because the implemented product now includes Version 2 workspace/comparison work, two-sided beta flows, Proof Briefs, recruiter evidence review, OAuth foundations, and immutable account personas while Production rollout remains gated.
