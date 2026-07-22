# SkillMint Project Status

**Last updated:** July 22, 2026

**Implementation baseline audited:** `3cb5e28050cf93e42e53405f0f2be9d12e756e27`

This is the current-state entry point for the founder, maintainers, developers, and future AI sessions. Before planning new work, fetch the current `main` branch and confirm its HEAD; this SHA records the implementation baseline audited for this document, not a promise that it will remain current.

## Repository context

SkillMint is a proof-aware Career Operating System for students, freshers, job seekers, and early-career users. It helps a user understand current resume evidence, realistic role direction, proof gaps, one job-specific match, and the next truthful improvements.

```text
Resume Reality
-> Profile-fit Roles
-> Active Target
-> Proof Confidence
-> Career IQ
-> Latest JD Match
-> Roadmap / Missions
-> Re-analysis and Re-score
```

## Product boundaries

- Career IQ is a deterministic, proof-aware readiness signal. It is not hiring probability, a placement chance, or a job guarantee.
- Proof Confidence measures resume-internal support and evidence candidates. It is not third-party proof verification; missing proof means unverified, not false.
- Profile-fit Roles describe general resume fit. Latest JD Match applies to one pasted job description and the resume context used for that match.
- Active Target changes focus and priority, not scores. Stale JD context must not appear current.
- Mission completion is self-progress. Scores move only after evidence changes and re-analysis detects it.
- Saved analysis is account history. The active report powers the current browser dashboard.
- Anonymous and account-owned browser state are separate owner partitions. One account must not consume another account's browser partition.
- Clear workspace removes registered SkillMint browser data only. Saved-report deletion and backend account deletion are separate operations.

## Beta v1 status

| Sequence | Status | Boundary |
| --- | --- | --- |
| Block 1: Premium Product UI System | Complete and preserved | Premium light-first UI; no broad redesign |
| Block 2: Scoring Calibration + Truth Engine | Complete and frozen | Scoring and proof contracts are locked |
| Block 3: Mission Execution + Career Path Engine | Complete and frozen | Missions do not manipulate scores |
| Block 4: Active Target + JD Workflow | Complete, hardened, merged, and frozen | Target focus, owner isolation, and JD freshness remain locked |
| Block 5: Data Controls + Trust Center | Complete, verified, merged, synchronized, and frozen | Isolated engineering proof; no production claim |
| Pre-Block-6 Brand & Domain Decision Gate | Approved next sequence | One to two focused working days; not a roadmap block |
| Block 6: Privacy-safe Analytics + Founder Dashboard | In progress; Block 6.1 merged and frozen pending rollout; Block 6.2 repository-only implementation pending final independent review | Repository-only event collection and protected aggregate visibility; no live rollout |
| Block 7: Beta Launch Readiness | Not started | Production rollout, final QA, operations, and launch/no-launch decision |

Block 5 feature commit: `5a8364b25f3f0ae657f55a9a354158d6181f1083`

Block 5 merge commit: `3cb5e28050cf93e42e53405f0f2be9d12e756e27`

Blocks 1–5 are frozen. Future work may extend the product only while preserving their behavior, evidence, identities, and non-claims.

Block 6 is in progress. Block 6.1 is merged and frozen pending rollout; it is not pending another repository engineering review. The Block 6.2 protected founder aggregation/dashboard implementation exists only in the repository and remains pending final independent review. Counts describe events, never people: there is no identity analytics, unique-person, retention, cohort, or session contract. Both migrations remain unapplied; the founder UUID, WAF, purge schedule, and analytics collection flags remain unconfigured or disabled; no live service was contacted and no deployment or production rollout occurred. See [Privacy-safe Analytics Collection](ANALYTICS.md).

## Release boundary

Public beta is not currently authorized. Block 5 passed isolated engineering verification, but production rollout was not performed by that closure.

The current release blocker is:

```text
Production rollout
+ externally verified and monitored privacy/support contact operations
```

Production schema inventory and rollout, environment/origin coordination, operational ownership, incident and rollback handling, legal review, and provider backup/log retention claims remain outside the verified repository closure. A Vercel deployment or successful build does not by itself satisfy this boundary.

## Approved next sequence

**Sequencing override — 2026-07-19:** The Brand & Domain Gate remains paused by founder decision. Block 6 may proceed using brand-neutral internal identifiers. Final public branding remains required before external beta or public-launch configuration.

1. Documentation alignment, completed by this update.
2. Run the [Brand & Domain Decision Gate](BRAND_DOMAIN_GATE.md).
3. Select one public name and one backup; reserve a usable domain.
4. Add a bounded, centralized public-brand layer that changes user-facing surfaces only.
5. Preserve internal SkillMint identifiers and rerun Block 1–5 preservation checks.
6. Merge and synchronize that layer.
7. Begin Block 6.
8. Defer domain activation and production auth/origin changes to Block 7.

The public name, backup name, and domain are all pending. The gate does not authorize production, DNS, Supabase, Vercel, authentication, schema, storage, repository, or package changes.

## Question-specific authority

Use the evidence relevant to the question instead of one universal ranking:

- **Implementation truth:** inspect fetched Git chronology, current source, tests, schemas and configuration, and current implementation contracts. Code proves implementation, not strategy; tests prove only exercised behavior; build or deployment success does not prove release readiness.
- **Frozen verification evidence:** use SHA-pinned closure, QA, and frozen contract documents for the result and scope they record. Do not rewrite historical evidence, combine separate test layers, or claim that historical `/tmp` artifacts remain available.
- **Current product intent:** use explicit founder decisions durably recorded in the repository, the current approved roadmap and decision documents, then constitution, vision, strategy, and compatible product requirements that have not been superseded. A conversation-only decision must be recorded in the repository before implementation. Code cannot silently cancel founder-approved strategy, and product documents do not prove implementation.
- **Historical material:** older UX, UI, architecture, API, database, AI, sprint, and launch documents preserve rationale when clearly classified. They do not prove implementation or grant current authorization when superseded.
- **Conflict rule:** identify the question and its relevant authority, record the contradiction, do not reinterpret a frozen contract, and obtain and document a founder decision when sequencing remains unresolved.

## Authoritative references

- [Beta v1 Build Roadmap](BETA_V1_BUILD_ROADMAP.md)
- [Brand & Domain Decision Gate](BRAND_DOMAIN_GATE.md)
- [Scoring System](SCORING_SYSTEM.md)
- [Mission System](MISSION_SYSTEM.md)
- [Career Path Engine](CAREER_PATH_ENGINE.md)
- [Active Target Workflow](ACTIVE_TARGET_WORKFLOW.md)
- [JD Workflow](JD_WORKFLOW.md)
- [Data Controls](DATA_CONTROLS.md)
- [Data Export](DATA_EXPORT.md)
- [Data Map](DATA_MAP.md)
- [Account Deletion](ACCOUNT_DELETION.md)
- [Trust Center](TRUST_CENTER.md)
- [Block 5 Closure](BLOCK_5_CLOSURE.md)
- [Deployment Safety Guide](DEPLOYMENT.md)
- [Release Notes](RELEASE_NOTES.md)
- [Documentation Map](README.md)
