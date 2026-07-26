# SkillMint Project Status

**Last updated:** July 26, 2026

**Block 7.1 merge baseline:** `2401db7b8613879119a000b4a5019f7f68d88ef4`

This is the current-state entry point for the founder and maintainers. Before planning new work, fetch the current `main` branch and confirm its HEAD; this SHA records the implementation baseline audited for this document, not a promise that it will remain current.

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
| Pre-Block-6 Brand & Domain Decision Gate | Paused by founder decision; still required before external beta | One to two focused working days; not a roadmap block |
| Block 6: Privacy-safe Analytics + Founder Dashboard | Engineering implementation and isolated verification complete | Production rollout and activation are deferred; no Production-readiness claim |
| Block 7: Beta Launch Readiness | In progress; Block 7.1 complete | The broader gate remains incomplete; Block 7.2 is the next read-only beta-release decision gate |

Block 5 feature commit: `5a8364b25f3f0ae657f55a9a354158d6181f1083`

Block 5 merge commit: `3cb5e28050cf93e42e53405f0f2be9d12e756e27`

Blocks 1–5 are frozen. Future work may extend the product only while preserving their behavior, evidence, identities, and non-claims.

Block 6 engineering implementation and isolated verification are complete. The isolated hosted migration and ACL verification passed, including the V7 additive ACL repair, and the isolated live-security gate passed. These results do not prove Production behavior or authorize Production rollout.

Post-Block-6 maintenance completed the founder invalid-token repair and the data-control provider-status and account-reauthentication repairs. PostCSS CVE-2026-45623 / GHSA-6g55-p6wh-862q was patched. As verified on July 24, 2026, GitHub reported zero open Dependabot alerts; this is a dated observation, not a permanent guarantee.

Block 7.1 confirmed and repaired a resume owner-isolation race. Account A data can no longer be rebound to Account B at persistence or publication time, and an already Account-A-authenticated request may finish only as Account A. The repair merged through PR #17 at `2401db7b8613879119a000b4a5019f7f68d88ef4` and received the independent verdict `PASS_SAFE_FOR_COMMIT_GATE`. See [Block 7.1 Closure](BLOCK_7_1_CLOSURE.md).

Analytics collection remains disabled. Production rollout has not occurred, and persistent Production founder configuration, Vercel WAF configuration, retention scheduling, legal approval, and operational ownership approval remain deferred. Vercel Preview and Production currently share the same two public Supabase variables, so Preview is not an isolated database environment. Counts describe events, never people; there is no identity, unique-person, active-user, retention, cohort, or session metric contract. See [Privacy-safe Analytics Collection](ANALYTICS.md) and the [Block 6 Rollout Runbook](BLOCK_6_ROLLOUT_RUNBOOK.md).

## Release boundary

Public beta is not currently authorized. Blocks 5 and 6 passed their applicable isolated engineering gates, but those results are not Production rollout or Production-readiness evidence.

The current release blocker is:

```text
Production rollout
+ externally verified and monitored privacy/support contact operations
```

Production schema inventory and rollout, environment/origin coordination, operational ownership, incident and rollback handling, legal review, and provider backup/log retention claims remain outside the verified repository closure. A Vercel deployment or successful build does not by itself satisfy this boundary.

The automatic fail-closed deployment is not a Production database rollout claim. Production V5, V6, and V7 remain unapplied, and no collection flag is enabled.

## Approved next sequence

**Sequencing override — 2026-07-19:** The Brand & Domain Gate remains paused by founder decision. This override permitted Block 6 to proceed using brand-neutral internal identifiers. Final public branding remains required before external beta or public-launch configuration.

1. Run Block 7.2 as a read-only beta-release decision gate; do not treat the completed Block 7.1 repair as release authorization.
2. Keep later Block 7 ordering evidence-driven while preserving its full launch-readiness scope.
3. Prove the Production V1–V4 catalog and migration-history baseline.
4. Prepare WAF, founder authorization, retention, monitoring, and kill switches.
5. Separately authorize Production V5, V6, and V7.
6. Enable server persistence, then browser delivery, only after those gates.
7. Finish public branding and domain work before external beta.

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
- [Block 6 Rollout Runbook](BLOCK_6_ROLLOUT_RUNBOOK.md)
- [Block 7.1 Closure](BLOCK_7_1_CLOSURE.md)
- [Release Notes](RELEASE_NOTES.md)
- [Documentation Map](README.md)
