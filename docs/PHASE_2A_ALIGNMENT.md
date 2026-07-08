# Phase 2A Alignment — Active Report System + Resume History Restore

## 1. Phase 1 / RC Learnings

### What Worked Well

- SkillMint's positioning as a proof-aware career operating system is clearer than a generic resume checker.
- The core loop is understandable: Upload resume -> Resume Reality -> Profile-fit roles -> Active Target -> Proof Confidence -> Career IQ -> Latest JD Match -> Roadmap / Missions -> Improve proof -> Re-score.
- Proof Confidence, Base Resume Signals, and Latest JD Match helped separate evidence trust from job-specific matching.
- Browser-first localStorage kept beta flows usable even when account sync was unavailable.
- The clear active workspace control reduced confusion between local state and account history.

### Challenges That Emerged

- Saved resume analyses can exist in the account while the dashboard has no active browser report.
- Users may expect saved analyses to appear automatically, but silent restore can create stale or surprising dashboard state.
- The dashboard must never show fake or stale metrics when there is no active report.
- Saved report history and active dashboard report need explicit product language.
- Explainability matters: users need to understand why a score or state appears.
- Empty states must answer what is missing, why it matters, and what to do next.
- Browser-local copy and synced account history must remain visibly separate.

### Stale Workspace Issue

The dashboard depends on the active browser workspace. If that workspace is cleared, saved account analyses may still exist, but they are not active until the user restores or selects one. Phase 2A preserves this rule so old metrics do not appear accidentally.

### No Fake Metrics Rule

If no valid active report exists, SkillMint must hide Career IQ, Proof Confidence, Profile-fit roles, readiness charts, shareable cards, and mission metrics. Empty states may preview what will be built after upload, but they must not show demo scores.

## 2. Decision Record

### SkillMint Remains A Career Operating System

**Decision:** SkillMint remains a proof-aware career operating system, not a resume builder clone.

**Rationale:** The product value is career clarity, proof-building guidance, role readiness, JD readiness, and structured progress.

**Trade-off:** Resume editing remains important, but it does not become the center of the product.

### Phase 2A Focuses On Active Report + Resume History

**Decision:** Phase 2A focuses on saved resume analysis visibility, restore, and active report selection.

**Rationale:** Users need a durable workspace before larger account features matter.

**Trade-off:** Resume comparison, analytics, and proof integrations stay out of scope.

### Use Existing Persistence Patterns

**Decision:** Use existing Supabase resume repository functions and current localStorage active report keys.

**Rationale:** The app already saves resume analyses and exposes latest/list functions.

**Trade-off:** The history UI depends on the current saved row shape and may need richer metadata later.

### No Algorithm Changes

**Decision:** Phase 2A does not change scoring, proof, ATS, or roadmap algorithms.

**Rationale:** This is a workspace/state sprint, not an intelligence sprint.

**Trade-off:** Some report outputs remain unchanged even if history UX exposes them more clearly.

### No Payment/Auth/Schema Rewrite

**Decision:** No payment, auth flow, environment, or Supabase schema rewrite in Phase 2A.

**Rationale:** The current database already supports multiple resume analyses.

**Trade-off:** Features that require extra columns, such as saved target role per report, remain future work.

### Saved Analyses Are Not Automatically Active

**Decision:** Saved analyses are not automatically active unless the user restores or selects one. Uploading a new resume remains the one allowed automatic active-report action.

**Rationale:** Silent restore can make the dashboard show metrics the user did not choose.

**Trade-off:** Returning users may need one click to restore an account report.

### Clear Workspace Remains Browser-Only

**Decision:** Clear active workspace removes browser workflow state only.

**Rationale:** Users must not believe they are deleting synced account history.

**Trade-off:** Full account data deletion needs a future settings/privacy flow.

## 3. Phase 2A Scope Boundaries

### In Scope

- Resume history list using existing saved analyses support.
- Restore latest saved resume analysis.
- Select saved analysis as active report.
- Active report status on dashboard/resume/settings.
- Empty, loading, and error states.
- Local versus synced explanation.
- Documentation and QA checklist.

### Out Of Scope

- Scoring/proof algorithm changes.
- ATS algorithm changes.
- Roadmap algorithm changes.
- Resume version comparison.
- GitHub/portfolio integrations.
- Payments/pricing.
- New AI chat layer.
- Job board/autofill.
- Supabase schema changes unless absolutely required and already supported.
- Destructive account deletion.

## 4. Technical Audit Notes

- Resume analyses are saved through `saveCurrentUserResumeAnalysis` in `src/modules/resume/services/resumeAnalysisRepository.ts`.
- Multiple saved analyses can already be fetched through `listCurrentUserResumeAnalyses(limit)`.
- The latest saved analysis can already be fetched through `getLatestCurrentUserResumeAnalysis()`.
- The active browser report is stored under `skillmint:resume-analysis`.
- Active sync status is stored under `skillmint:resume-sync-status`.
- Dashboard active detection reads `skillmint:resume-analysis` and must only show metrics for a valid active report.
- Dashboard no-active state already checks for saved account analyses through the existing resume repository.
- `/resume` previously auto-loaded and persisted the latest saved analysis when no local report existed. Phase 2A changes this to deliberate restore/select.
- Workspace update events are dispatched through `notifySkillMintWorkspaceUpdated()` and subscribed to via `subscribeToSkillMintWorkspaceUpdates()`.
- `clearSkillMintWorkspace()` removes browser workflow keys and dispatches the workspace update event.
- The active report shape in localStorage must include a usable `userProfile`; otherwise dashboard metrics risk falling back to mock profile data.
- Saved analysis rows may not contain target role metadata today. Top Profile-fit role can be derived when `userProfile` is available, but target role per saved report is future metadata.

## 5. Risks / Open Questions

- Saved analysis shape may differ from local active report shape.
- Account sync may be unavailable or blocked by missing Supabase config.
- Restoring a saved report may fail if the row is missing `user_profile` or parseable report data.
- Users may expect Clear active workspace to delete account history.
- Dashboard must not show stale metrics after clearing workspace.
- Resume history may need pagination later.
- Privacy/data deletion needs a future full settings flow.
- Saved analyses do not currently store target role per report.

## 6. Success Criteria

- User can see saved analyses.
- User can restore latest saved analysis.
- User can select a saved analysis as active.
- Dashboard updates after restore/select.
- No fake metrics are shown.
- No stale metrics appear after clearing workspace.
- Active versus saved state is understandable.
- Lint/build pass.
- Production smoke passes after merge/deploy.

## 7. Checkpoints

- **Checkpoint A:** Docs created.
- **Checkpoint B:** Existing resume persistence audited.
- **Checkpoint C:** Restore/select implemented.
- **Checkpoint D:** UI empty/error/loading states done.
- **Checkpoint E:** Manual QA complete.
- **Checkpoint F:** Production smoke after merge.

## 8. Living Document Process

- Update this doc when Phase 2A scope changes.
- Add decisions instead of silently changing behavior.
- Add unresolved questions to Risks / Open Questions.
- Put P2/P3 ideas in TODO, not code.
- Founder approval is required before expanding Phase 2A scope.
