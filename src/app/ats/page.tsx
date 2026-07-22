"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import {
  premiumBadge,
  premiumCompactSurface,
  premiumEyebrow,
  premiumHeroSurface,
  premiumInput,
  premiumPrimaryCta,
  premiumSecondaryCta,
  premiumSurface,
  premiumTextarea,
} from "@/components/ui/premium";
import {
  analyzeJobDescriptionMatch,
  type JobDescriptionMatchResult,
} from "@/intelligence/core/jobDescriptionMatch";
import {
  buildActiveTargetCopyText,
  buildActiveTargetEngineResult,
  clearActiveTarget,
  createActiveTargetResumeContextFromStoredAnalysis,
  createActiveTargetFromLatestJd,
  createActiveTargetFromProfileFitRole,
  createActiveTargetFromUltimateGoal,
  getActiveTargetSourceLabel,
  isResumeContextCurrent,
  parseActiveTarget,
  readActiveTargetStorageSnapshot,
  setActiveTarget,
  type ActiveTargetEngineResult,
  type ActiveTargetResumeContext,
  type ActiveTargetSuggestion,
} from "@/intelligence/target";
import {
  generateResumeImprovementPlan,
  type ResumeImprovementPlan,
} from "@/intelligence/core/resumeImprovement";
import { calculateRoleMatches } from "@/intelligence/core/roleMatch";
import {
  generateResumeRewritePlan,
  type ResumeRewritePlan,
  type ResumeRewriteSuggestion,
} from "@/intelligence/core/resumeRewrite";
import type { UserProfile } from "@/intelligence/types/profile";
import {
  subscribeToSkillMintWorkspaceUpdates,
} from "@/lib/storage/skillMintStorageEvents";
import { resolveBrowserWorkspaceWriteOwner } from "@/lib/storage/skillMintStorageTypes";
import {
  clearCurrentJobMatchSnapshot,
  readCurrentJobMatchSnapshot,
  readCurrentJobMatchSyncStatusSnapshot,
  writeCurrentJobMatchSnapshot,
  writeCurrentJobMatchSyncStatus,
  type BrowserJobMatchSyncStatus,
} from "@/lib/storage/jdMatchCurrentStorage";
import {
  NextBestActionPanel,
  UpgradeInterestCard,
} from "@/modules/activation";
import {
  clearSavedJobMatches,
  deleteSavedJobMatch,
  getAccountHistoryRestoreMessage,
  getLatestJobMatch,
  getSavedJobMatches,
  replaceSavedJobMatches,
  saveJobMatch,
  type SavedJobMatch,
} from "@/lib/storage/jdMatchHistory";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import {
  deleteCurrentUserJobMatch,
  listCurrentUserJobMatches,
  saveCurrentUserJobMatch,
  type PersistentJobMatch,
} from "@/modules/jobMatch";
import { getTargetRoleSetup } from "@/modules/onboarding/storage/targetRoleSetupStorage";
import {
  readActiveResumeReportSnapshot,
} from "@/modules/resume/services/activeResumeReportStorage";
import {
  fireAndForgetAnalytics,
  getAnalyticsDurationBucket,
  getBrowserAnalyticsRuntime,
} from "@/platform/analytics";
const MIN_JOB_DESCRIPTION_LENGTH = 80;
const JOB_DESCRIPTION_MIN_HEIGHT = 140;
const JOB_DESCRIPTION_MAX_HEIGHT = 420;

type ActiveJobMatch = {
  id?: string;
  databaseId?: string;
  syncStatus?: "synced" | "local-only" | "pending" | "failed";
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  result: JobDescriptionMatchResult;
  improvementPlan: ResumeImprovementPlan | null;
  rewritePlan: ResumeRewritePlan | null;
  roadmap?: unknown;
  resumeContext?: ActiveTargetResumeContext;
  analyzedAt: string;
};

type JobMatchSyncStatus = BrowserJobMatchSyncStatus;

export default function ATSMatcherPage() {
  const {
    user,
    isConfigured,
    isLoading: isAuthLoading,
  } = useAuthSession();
  const currentUserId = isAuthLoading ? undefined : user?.id ?? null;
  const userId = user?.id ?? null;
  const analytics = getBrowserAnalyticsRuntime({
    isAuthResolved: !isAuthLoading,
    hasAccount: Boolean(user),
  });
  const storedAnalysis = useSyncExternalStore(
    subscribeToStoredAnalysis,
    () => readStoredAnalysis(currentUserId),
    getServerSnapshot,
  );
  const storedActiveTarget = useSyncExternalStore(
    subscribeToStoredAnalysis,
    () => readStoredActiveTarget(currentUserId),
    getServerSnapshot,
  );
  const userProfile = useMemo(
    () => getStoredUserProfile(storedAnalysis),
    [storedAnalysis],
  );
  const resumeContext = useMemo(
    () => createActiveTargetResumeContextFromStoredAnalysis(storedAnalysis),
    [storedAnalysis],
  );
  const activeTarget = useMemo(
    () => parseActiveTarget(storedActiveTarget, {
      currentUserId,
    }),
    [currentUserId, storedActiveTarget],
  );
  const roleMatches = useMemo(
    () => userProfile ? calculateRoleMatches(userProfile) : [],
    [userProfile],
  );
  const targetRoleSetup = getTargetRoleSetup({
    currentUserId,
  });
  const [jobDescription, setJobDescription] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState("");
  const [savedJobMatches, setSavedJobMatches] = useState<SavedJobMatch[]>([]);
  const [activeMatch, setActiveMatch] = useState<ActiveJobMatch | null>(null);
  const [syncStatus, setSyncStatus] = useState<JobMatchSyncStatus | null>(
    null,
  );
  const [historySyncMessage, setHistorySyncMessage] = useState("");
  const [deleteSyncMessage, setDeleteSyncMessage] = useState("");
  const [targetActionMessage, setTargetActionMessage] = useState("");
  const [targetCopyState, setTargetCopyState] =
    useState<"idle" | "copied" | "failed">("idle");
  const [hasLoadedLocalHistory, setHasLoadedLocalHistory] = useState(false);
  const jobDescriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const activeTargetResult = useMemo(
    () =>
      buildActiveTargetEngineResult({
        activeTarget,
        hasResumeAnalysis: Boolean(userProfile),
        resumeContext,
        roleMatches,
        latestJobMatch: activeMatch
          ? {
              title: activeMatch.jobTitle,
              companyName: activeMatch.companyName,
              roleTitle: activeMatch.jobTitle,
              jobDescription: activeMatch.jobDescription,
              result: activeMatch.result,
            }
          : null,
        targetRole: targetRoleSetup?.targetRole,
        careerField: targetRoleSetup?.careerField,
      }),
    [
      activeMatch,
      activeTarget,
      roleMatches,
      resumeContext,
      targetRoleSetup,
      userProfile,
    ],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const ownerContext = {
        currentUserId,
      };
      const savedMatches = getSavedJobMatches(ownerContext);
      const latestStoredMatch = readLatestJobMatch(ownerContext) ??
        getLatestJobMatch(ownerContext);
      const currentLatestMatch = getCurrentJobMatchForResume(
        latestStoredMatch,
        resumeContext,
      );

      setSavedJobMatches(savedMatches);
      setActiveMatch(currentLatestMatch);
      setSyncStatus(readJobMatchSyncStatus(ownerContext));
      if (latestStoredMatch && !currentLatestMatch) {
        setHistorySyncMessage(
          "Latest JD Match was calculated for another or unknown resume. Re-run it for the current resume.",
        );
      }
      setHasLoadedLocalHistory(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [currentUserId, resumeContext]);

  useEffect(() => {
    const textarea = jobDescriptionTextareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = `${JOB_DESCRIPTION_MIN_HEIGHT}px`;
    const nextHeight = Math.min(
      JOB_DESCRIPTION_MAX_HEIGHT,
      Math.max(JOB_DESCRIPTION_MIN_HEIGHT, textarea.scrollHeight),
    );

    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY =
      textarea.scrollHeight > JOB_DESCRIPTION_MAX_HEIGHT ? "auto" : "hidden";
  }, [jobDescription]);

  useEffect(() => {
    if (
      !hasLoadedLocalHistory ||
      savedJobMatches.length > 0 ||
      !isConfigured ||
      isAuthLoading ||
      !userId
    ) {
      return;
    }

    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      void restoreJobMatchHistoryFromDatabase();
    }, 0);

    async function restoreJobMatchHistoryFromDatabase() {
      setHistorySyncMessage("");

      try {
        const result = await listCurrentUserJobMatches(20);

        if (!isActive) {
          return;
        }

        if (!result.ok) {
          setHistorySyncMessage(result.error);
          return;
        }

        const restoredMatches = result.data.flatMap((match) => {
          const savedMatch = mapPersistentJobMatchToSavedMatch(match);

          return savedMatch ? [savedMatch] : [];
        });

        if (!restoredMatches.length) {
          return;
        }

        const ownerContext = {
          currentUserId,
        };
        const nextMatches = replaceSavedJobMatches(
          restoredMatches,
          ownerContext,
        );
        if (!nextMatches) {
          setHistorySyncMessage("Could not save restored job matches in this browser.");
          return;
        }
        const nextActiveMatch = readLatestJobMatch(ownerContext) ??
          nextMatches[0] ?? null;

        setSavedJobMatches(nextMatches);
        setActiveMatch(nextActiveMatch);
        const didPersistLatest = nextActiveMatch
          ? persistLatestJobMatch(nextActiveMatch, ownerContext)
          : true;
        setHistorySyncMessage(getAccountHistoryRestoreMessage(didPersistLatest));
      } catch {
        if (!isActive) {
          return;
        }

        setHistorySyncMessage(
          "Could not load saved job matches from your account right now.",
        );
      }
    }

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [
    hasLoadedLocalHistory,
    isAuthLoading,
    isConfigured,
    currentUserId,
    savedJobMatches.length,
    userId,
  ]);

  if (!userProfile) {
    return (
      <DashboardLayout>
        <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center text-center">
          <p className={premiumEyebrow}>
            Match One Job
          </p>

          <h1 className="mt-5 text-4xl font-black md:text-5xl">
            Upload and analyze your resume first.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            SkillMint needs your latest resume intelligence before it can
            compare you against one specific job description. Setup is for
            your career direction; this page is for one pasted role.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/setup"
              className={premiumSecondaryCta}
            >
              Career Setup
            </Link>

            <Link
              href="/upload"
              className={premiumPrimaryCta}
            >
              Upload Resume
            </Link>
          </div>

          <ActiveTargetWorkflowPanel
            result={activeTargetResult}
            activeMatch={activeMatch}
            actionMessage={targetActionMessage}
            copyState={targetCopyState}
            onSetLatestJd={handleSetLatestJdAsActiveTarget}
            onSetSuggestion={handleSetSuggestionAsActiveTarget}
            onClear={handleClearActiveTarget}
            onCopy={handleCopyActiveTargetSummary}
          />

          <NextBestActionPanel className="mt-8 text-left" />
        </section>
      </DashboardLayout>
    );
  }

  function handleAnalyzeMatch() {
    if (!ensureBrowserWorkspaceWriteReady()) {
      return;
    }

    if (!userProfile) {
      setError("Upload and analyze your resume before matching a job description.");
      setActiveMatch(null);
      return;
    }

    const trimmedJobDescription = jobDescription.trim();

    if (trimmedJobDescription.length < MIN_JOB_DESCRIPTION_LENGTH) {
      setError(
        "Paste a fuller job description with responsibilities and required skills.",
      );
      setActiveMatch(null);
      return;
    }

    setError("");
    setDeleteSyncMessage("");
    setHistorySyncMessage("");
    const startedAt = Date.now();
    fireAndForgetAnalytics(() => analytics.jdMatchStarted());

    const result = analyzeJobDescriptionMatch(
      userProfile,
      trimmedJobDescription,
    );
    const plan = generateResumeImprovementPlan(
      userProfile,
      result,
      trimmedJobDescription,
    );
    const rewrite = generateResumeRewritePlan(
      userProfile,
      result,
      plan,
      trimmedJobDescription,
      {
        jobTitle,
        companyName,
        setupTargetRole: targetRoleSetup?.targetRole,
        profileFitRole: roleMatches[0]?.role,
      },
    );
    const analyzedAt = new Date().toISOString();
    const savedMatch: SavedJobMatch = {
      id: createSavedJobMatchId(analyzedAt),
      jobTitle: getFallbackText(jobTitle, "Untitled Role"),
      companyName: getFallbackText(companyName, "Unknown Company"),
      jobDescription: trimmedJobDescription,
      result,
      improvementPlan: plan,
      rewritePlan: rewrite,
      resumeContext: resumeContext ?? undefined,
      analyzedAt,
    };

    const nextMatches = saveJobMatch(savedMatch, {
      currentUserId,
    });
    const didPersistLatest = persistLatestJobMatch(savedMatch, {
      currentUserId,
    });

    if (!nextMatches || !didPersistLatest) {
      fireAndForgetAnalytics(() => analytics.productOperationFailed(
        "jd_match",
        {
          operation: "jd_match",
          error_code: "storage_write_failed",
          duration_bucket: getAnalyticsDurationBucket(startedAt, Date.now()),
        },
      ));
      setError("Could not save this match in your browser. Please try again.");
      return;
    }

    fireAndForgetAnalytics(() => analytics.jdMatchCompleted({
      duration_bucket: getAnalyticsDurationBucket(startedAt, Date.now()),
    }));
    setActiveMatch(savedMatch);
    setSavedJobMatches(nextMatches);
    void persistJobMatchToDatabase(savedMatch);
  }

  function handleViewSavedMatch(match: SavedJobMatch) {
    if (!ensureBrowserWorkspaceWriteReady()) {
      return;
    }

    setError("");
    setDeleteSyncMessage("");

    if (!getCurrentJobMatchForResume(match, resumeContext)) {
      setActiveMatch(null);
      setJobTitle(match.jobTitle);
      setCompanyName(match.companyName);
      setJobDescription(match.jobDescription);
      setHistorySyncMessage(
        "This saved JD Match belongs to another or unknown resume. Re-run the match for the current active resume.",
      );
      return;
    }

    if (!persistLatestJobMatch(match, {
      currentUserId,
    })) {
      setError("Could not update the active match in your browser. Please try again.");
      return;
    }
    setActiveMatch(match);
  }

  function handleDeleteSavedMatch(id: string) {
    if (!ensureBrowserWorkspaceWriteReady()) {
      return;
    }

    const matchToDelete = savedJobMatches.find((match) => match.id === id);
    const nextMatches = deleteSavedJobMatch(id, {
      currentUserId,
    });

    if (!nextMatches) {
      setDeleteSyncMessage("Could not update saved matches in your browser. Please try again.");
      return;
    }

    setSavedJobMatches(nextMatches);
    setDeleteSyncMessage("");

    if (activeMatch?.id !== id) {
      void deletePersistedJobMatch(matchToDelete);
      return;
    }

    const nextActiveMatch = nextMatches[0] ?? null;

    setActiveMatch(nextActiveMatch);

    if (nextActiveMatch) {
      if (!persistLatestJobMatch(nextActiveMatch, {
        currentUserId,
      })) {
        setDeleteSyncMessage("Saved matches were updated, but the active match could not be updated in this browser.");
      }
    } else {
      if (!clearLatestJobMatch({ currentUserId })) {
        setDeleteSyncMessage("Saved matches were updated, but the active match could not be cleared in this browser.");
      }
    }

    void deletePersistedJobMatch(matchToDelete);
  }

  function handleClearHistory() {
    if (!ensureBrowserWorkspaceWriteReady()) {
      return;
    }

    if (!window.confirm("Clear all saved job match history?")) {
      return;
    }

    if (!clearSavedJobMatches({ currentUserId })) {
      setDeleteSyncMessage("Could not clear saved matches in your browser. Please try again.");
      return;
    }
    setSavedJobMatches([]);

    if (activeMatch) {
      if (!persistLatestJobMatch(activeMatch, {
        currentUserId,
      })) {
        setDeleteSyncMessage("Saved matches were cleared, but the active match could not be updated in this browser.");
      }
    }
  }

  function handleSetLatestJdAsActiveTarget() {
    if (!ensureBrowserWorkspaceWriteReady()) {
      return;
    }

    if (!activeMatch) {
      setTargetActionMessage("Analyze or select a JD match first.");
      return;
    }

    if (!resumeContext) {
      setTargetActionMessage(
        "Upload or restore an active resume report before setting a JD Active Target.",
      );
      return;
    }

    const target = createActiveTargetFromLatestJd({
      title: activeMatch.jobTitle,
      companyName: activeMatch.companyName,
      roleTitle: activeMatch.jobTitle,
      jdText: activeMatch.jobDescription,
      result: activeMatch.result,
      resumeContext,
      targetRole: targetRoleSetup?.targetRole,
      careerField: targetRoleSetup?.careerField,
    });

    if (!setActiveTarget(target, { ownerUserId: currentUserId })) {
      fireAndForgetAnalytics(() => analytics.productOperationFailed(
        "jd_match",
        {
          operation: "active_target_selection",
          error_code: "storage_write_failed",
        },
      ));
      setTargetActionMessage("Could not save Active Target in this browser. Please try again.");
      return;
    }
    fireAndForgetAnalytics(() => analytics.activeTargetSelected({
      target_source: "latest_jd",
      selection_kind: activeTarget ? "replaced" : "created",
    }));
    setTargetActionMessage(
      activeTarget
        ? "Active Target replaced. Saved in this browser during beta."
        : "Latest JD set as Active Target. Saved in this browser during beta.",
    );
  }

  function handleSetSuggestionAsActiveTarget(
    suggestion: ActiveTargetSuggestion,
  ) {
    if (!ensureBrowserWorkspaceWriteReady()) {
      return;
    }

    if (suggestion.source === "latest_jd") {
      handleSetLatestJdAsActiveTarget();
      return;
    }

    if (suggestion.source === "profile_fit" && roleMatches[0]) {
      if (!setActiveTarget(
        createActiveTargetFromProfileFitRole({
          roleMatch: roleMatches[0],
          careerField: targetRoleSetup?.careerField,
        }),
        {
          ownerUserId: currentUserId,
        },
      )) {
        fireAndForgetAnalytics(() => analytics.productOperationFailed(
          "jd_match",
          {
            operation: "active_target_selection",
            error_code: "storage_write_failed",
          },
        ));
        setTargetActionMessage("Could not save Active Target in this browser. Please try again.");
        return;
      }
      fireAndForgetAnalytics(() => analytics.activeTargetSelected({
        target_source: "profile_fit",
        selection_kind: activeTarget ? "replaced" : "created",
      }));
      setTargetActionMessage(
        "Closest Role Path set as Active Target. Saved in this browser during beta.",
      );
      return;
    }

    if (suggestion.source === "ultimate_goal" && targetRoleSetup?.targetRole) {
      const target = createActiveTargetFromUltimateGoal({
        targetRole: targetRoleSetup.targetRole,
        careerField: targetRoleSetup.careerField,
        closestRole: roleMatches[0]?.role,
      });

      if (!target) {
        setTargetActionMessage("Set a target role before using Ultimate Goal.");
        return;
      }

      if (!setActiveTarget(target, { ownerUserId: currentUserId })) {
        fireAndForgetAnalytics(() => analytics.productOperationFailed(
          "jd_match",
          {
            operation: "active_target_selection",
            error_code: "storage_write_failed",
          },
        ));
        setTargetActionMessage("Could not save Active Target in this browser. Please try again.");
        return;
      }
      fireAndForgetAnalytics(() => analytics.activeTargetSelected({
        target_source: "ultimate_goal",
        selection_kind: activeTarget ? "replaced" : "created",
      }));
      setTargetActionMessage(
        "Ultimate Goal set as Active Target. Saved in this browser during beta.",
      );
      return;
    }

    setTargetActionMessage(
      suggestion.disabledReason ?? "This Active Target source is not available yet.",
    );
  }

  function handleClearActiveTarget() {
    if (!ensureBrowserWorkspaceWriteReady()) {
      return;
    }

    const priorTargetSource = activeTarget?.source;
    if (!clearActiveTarget({ currentUserId })) {
      fireAndForgetAnalytics(() => analytics.productOperationFailed(
        "jd_match",
        {
          operation: "active_target_clear",
          error_code: "storage_write_failed",
        },
      ));
      setTargetActionMessage("Could not clear Active Target in this browser. Please try again.");
      return;
    }
    if (priorTargetSource) {
      fireAndForgetAnalytics(() => analytics.activeTargetCleared({
        prior_target_source: priorTargetSource,
      }));
    }
    setTargetActionMessage("Active Target cleared from this browser.");
  }

  function ensureBrowserWorkspaceWriteReady(): boolean {
    if (resolveBrowserWorkspaceWriteOwner(currentUserId).status === "ready") {
      return true;
    }

    setError("Checking your account… Please try again in a moment.");
    setTargetActionMessage("Checking your account… Please try again in a moment.");
    return false;
  }

  async function handleCopyActiveTargetSummary() {
    if (!activeTargetResult.activeTarget) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        buildActiveTargetCopyText(
          activeTargetResult.activeTarget,
          activeTargetResult,
        ),
      );
      setTargetCopyState("copied");
    } catch {
      setTargetCopyState("failed");
    }
  }

  async function persistJobMatchToDatabase(match: SavedJobMatch) {
    try {
      const saveResult = await saveCurrentUserJobMatch({
        jobTitle: match.jobTitle,
        companyName: match.companyName,
        jobDescription: match.jobDescription,
        matchResult: match.result,
        improvementPlan: match.improvementPlan,
        rewritePlan: match.rewritePlan,
        roadmap: match.roadmap,
      });

      if (saveResult.ok) {
        const nextMatch: SavedJobMatch = {
          ...match,
          databaseId: saveResult.data.id,
          syncStatus: "synced",
        };
        const nextStatus: JobMatchSyncStatus = {
          status: "synced",
          message: "Job match saved to your SkillMint account.",
          syncedAt: new Date().toISOString(),
          databaseId: saveResult.data.id,
        };

        const savedMatches = saveJobMatch(nextMatch, {
          currentUserId,
        });
        const didPersistLatest = persistLatestJobMatch(nextMatch, {
          currentUserId,
        });
        const didWriteSyncStatus = writeCurrentJobMatchSyncStatus(nextStatus, {
          currentUserId,
        });

        if (!savedMatches || !didPersistLatest || !didWriteSyncStatus) {
          setHistorySyncMessage(
            "Your account saved this job match, but its browser status could not be updated. Please refresh and try again.",
          );
          return;
        }

        setSavedJobMatches(savedMatches);
        setActiveMatch((currentMatch) => {
          if (currentMatch?.id !== match.id) {
            return currentMatch;
          }

          return nextMatch;
        });
        setSyncStatus(nextStatus);
        return;
      }

      markJobMatchLocalOnly(match, saveResult.error);
    } catch {
      markJobMatchLocalOnly(
        match,
        "Job match saved in this browser. Account save did not finish.",
      );
    }
  }

  function markJobMatchLocalOnly(match: SavedJobMatch, message: string) {
    const nextMatch: SavedJobMatch = {
      ...match,
      syncStatus: "local-only",
    };
    const nextStatus: JobMatchSyncStatus = {
      status: "local-only",
      message: getLocalOnlySyncMessage(message),
    };

    const savedMatches = saveJobMatch(nextMatch, {
      currentUserId,
    });
    const didPersistLatest = persistLatestJobMatch(nextMatch, {
      currentUserId,
    });
    const didWriteSyncStatus = writeCurrentJobMatchSyncStatus(nextStatus, {
      currentUserId,
    });

    if (!savedMatches || !didPersistLatest || !didWriteSyncStatus) {
      setHistorySyncMessage("Could not update the browser-local save state. Please try again.");
      return;
    }

    setSavedJobMatches(savedMatches);
    setActiveMatch((currentMatch) => {
      if (currentMatch?.id !== match.id) {
        return currentMatch;
      }

      return nextMatch;
    });
    setSyncStatus(nextStatus);
  }

  async function deletePersistedJobMatch(
    match: SavedJobMatch | undefined,
  ) {
    const databaseId = getPersistedJobMatchId(match);

    if (!databaseId) {
      return;
    }

    try {
      const deleteResult = await deleteCurrentUserJobMatch(databaseId);

      if (!deleteResult.ok) {
        setDeleteSyncMessage(deleteResult.error);
        return;
      }

      setDeleteSyncMessage("Deleted synced job match from your account.");
    } catch {
      setDeleteSyncMessage(
        "Deleted in this browser. Account delete did not finish right now.",
      );
    }
  }

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-6xl">
        <div className={premiumHeroSurface}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className={premiumEyebrow}>
                ATS Match
            </p>

              <h1 className="mt-4 text-4xl font-black md:text-5xl">
                Match one real job
              </h1>

              <p className="mt-4 max-w-2xl text-slate-600">
                See where your resume can compete, then fix the proof gaps
                before applying. Setup is your direction; ATS Match is one
                specific job description.
              </p>
            </div>

            <Link
              href="/resume"
              className={premiumSecondaryCta}
            >
              View Resume Analysis
            </Link>
          </div>
        </div>

        <NextBestActionPanel className="mt-8" />

        <ActiveTargetWorkflowPanel
          result={activeTargetResult}
          activeMatch={activeMatch}
          actionMessage={targetActionMessage}
          copyState={targetCopyState}
          onSetLatestJd={handleSetLatestJdAsActiveTarget}
          onSetSuggestion={handleSetSuggestionAsActiveTarget}
          onClear={handleClearActiveTarget}
          onCopy={handleCopyActiveTargetSummary}
        />

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <article className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-sky-800">
              What this does
            </h2>

            <p className="mt-2 text-sm leading-6 text-sky-900">
              Compares your resume intelligence with one job description at a
              time.
            </p>
          </article>

          <article className={premiumCompactSurface}>
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
              What to paste
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-600">
              Use the full job description: responsibilities, requirements,
              tools, and qualifications.
            </p>
          </article>

          <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-800">
              What comes next
            </h2>

            <p className="mt-2 text-sm leading-6 text-emerald-950">
              SkillMint saves the match in this browser, builds fixes, and can
              feed a more job-specific roadmap.
            </p>
          </article>
        </section>

        <section className={`mt-10 ${premiumSurface}`}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <label
                htmlFor="job-description"
                className="text-xl font-bold text-slate-950"
              >
                Job description to match
              </label>

              <p className="mt-1 text-sm text-slate-600">
                Use the complete job description. Short snippets make the match less useful.
              </p>
            </div>

            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {jobDescription.trim().length} chars
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="job-title"
                className="text-sm font-semibold text-slate-700"
              >
                Job title
              </label>

              <input
                id="job-title"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="Frontend Intern"
                className={`mt-2 ${premiumInput}`}
              />
            </div>

            <div>
              <label
                htmlFor="company-name"
                className="text-sm font-semibold text-slate-700"
              >
                Company name
              </label>

              <input
                id="company-name"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Acme"
                className={`mt-2 ${premiumInput}`}
              />
            </div>
          </div>

          <textarea
            ref={jobDescriptionTextareaRef}
            id="job-description"
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            rows={5}
            placeholder="Paste the full job description here..."
            className={`mt-5 max-h-[420px] min-h-[140px] resize-none ${premiumTextarea}`}
          />

          {error && (
            <p className="mt-3 text-sm font-medium text-rose-700">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleAnalyzeMatch}
            className={`${premiumPrimaryCta} mt-5`}
          >
            Analyze Match
          </button>
        </section>

        {activeMatch ? (
          <>
            <MatchResultPanel
              match={activeMatch}
            />

            <JobMatchSyncStatusCard
              match={activeMatch}
              syncStatus={syncStatus}
              isConfigured={isConfigured}
              isAuthLoading={isAuthLoading}
              isSignedIn={Boolean(userId)}
            />

            <UpgradeInterestCard
              source="ats"
              title="Want deeper job-match guidance?"
              body="SkillMint is free during beta. Paid plans are not required for this match report. Paid beta interest only helps shape deeper role-specific coaching."
              cta="Get advanced career plan interest"
            />
          </>
        ) : (
          <section className={`mt-6 ${premiumSurface}`}>
            <h2 className="text-xl font-bold text-slate-950">
              Match result
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Your one-job match report will appear here after analysis.
            </p>
          </section>
        )}

        <JobMatchHistoryPanel
          matches={savedJobMatches}
          activeMatchId={activeMatch?.id ?? null}
          syncMessage={historySyncMessage || deleteSyncMessage}
          onView={handleViewSavedMatch}
          onDelete={handleDeleteSavedMatch}
          onClear={handleClearHistory}
        />
      </section>
    </DashboardLayout>
  );
}

type MatchResultPanelProps = {
  match: ActiveJobMatch;
};

type ActiveTargetWorkflowPanelProps = {
  result: ActiveTargetEngineResult;
  activeMatch: ActiveJobMatch | null;
  actionMessage: string;
  copyState: "idle" | "copied" | "failed";
  onSetLatestJd: () => void;
  onSetSuggestion: (suggestion: ActiveTargetSuggestion) => void;
  onClear: () => void;
  onCopy: () => void;
};

function ActiveTargetWorkflowPanel({
  result,
  activeMatch,
  actionMessage,
  copyState,
  onSetLatestJd,
  onSetSuggestion,
  onClear,
  onCopy,
}: ActiveTargetWorkflowPanelProps) {
  const target = result.activeTarget;

  return (
    <section className={`mt-8 ${premiumSurface}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className={premiumEyebrow}>
            ATS Match + Active Target
          </p>

          <h2 className="mt-3 break-words text-2xl font-black text-slate-950">
            {target ? formatActiveTargetTitle(target) : "No Active Target yet"}
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Active Target focuses your next actions. It does not change your
            core scores. JD Match is based on one pasted job description, and
            Profile-fit roles are separate from JD Match.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          {activeMatch && (
            <button
              type="button"
              onClick={onSetLatestJd}
              className={premiumPrimaryCta}
            >
              {target ? "Replace Active Target" : "Set as Active Target"}
            </button>
          )}

          {target && (
            <>
              <button
                type="button"
                onClick={onCopy}
                className={premiumSecondaryCta}
              >
                {copyState === "copied"
                  ? "Copied"
                  : copyState === "failed"
                    ? "Copy failed"
                    : "Copy target summary"}
              </button>

              <button
                type="button"
                onClick={onClear}
                className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-5 py-3 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
              >
                Clear Active Target
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <TargetSignal
          label="Status"
          value={target
            ? target.status === "needs_resume_analysis"
              ? "Needs active resume"
              : "Active"
            : "Not set"}
        />

        <TargetSignal
          label="Source"
          value={target ? getActiveTargetSourceLabel(target.source) : "Choose a target"}
        />

        <TargetSignal
          label="JD Match"
          value={getTargetJdMatchSignal(result)}
        />
      </div>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-semibold text-slate-950">
          Main gap
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-700">
          {result.mainGap}
        </p>

        <p className="mt-4 text-sm font-semibold text-slate-950">
          Next move
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-700">
          {result.nextBestMove}
        </p>
      </div>

      {!target && result.suggestions.length > 0 && (
        <div className="mt-5 grid gap-3 lg:grid-cols-3">
          {result.suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              disabled={suggestion.disabled}
              onClick={() => onSetSuggestion(suggestion)}
              className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-emerald-200 hover:bg-emerald-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className={premiumBadge}>
                {getActiveTargetSourceLabel(suggestion.source)}
              </span>

              <h3 className="mt-3 break-words text-base font-black text-slate-950">
                {suggestion.title}
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                {suggestion.disabled
                  ? suggestion.disabledReason
                  : suggestion.reason}
              </p>
            </button>
          ))}
        </div>
      )}

      <p className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
        Only add missing skills if you actually used them. Otherwise, build
        proof first. Saved in this browser during beta.
      </p>

      {actionMessage && (
        <p
          role="status"
          className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900"
        >
          {actionMessage}
        </p>
      )}
    </section>
  );
}

function getTargetJdMatchSignal(result: ActiveTargetEngineResult): string {
  if (result.jdMatchStatus === "current" && result.activeTarget?.jdMatch) {
    return `${Math.round(result.activeTarget.jdMatch.score)}/100`;
  }

  if (result.jdMatchStatus === "stale") {
    return "Re-run for current resume";
  }

  return "Not available yet";
}

type TargetSignalProps = {
  label: string;
  value: string;
};

function TargetSignal({ label, value }: TargetSignalProps) {
  return (
    <article className="min-w-0 rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-bold text-slate-950">
        {value}
      </p>
    </article>
  );
}

function MatchResultPanel({ match }: MatchResultPanelProps) {
  const { result, improvementPlan, rewritePlan } = match;

  return (
    <section className="mt-6 space-y-6">
      <article className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950 shadow-[0_14px_42px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
              Strict ATS Match
            </p>

            <h2 className="mt-3 text-2xl font-bold">
              {match.jobTitle}
            </h2>

            <p className="mt-1 text-sm text-emerald-800">
              {match.companyName} - {formatAnalyzedAt(match.analyzedAt)}
            </p>
          </div>

          {match.id && (
            <span className="w-fit rounded-full border border-emerald-300 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-800">
              Saved
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-6xl font-black leading-none text-slate-950 md:text-7xl">
              {result.matchScore}%
            </p>

            <h2 className="mt-4 text-2xl font-bold text-slate-950">
              {result.verdict}
            </h2>
          </div>

          <p className="max-w-2xl text-base leading-7 text-emerald-950">
            {result.brutalReality}
          </p>
        </div>
      </article>

      <section className="grid gap-4 lg:grid-cols-3">
        <DetailCard
          title="Matched Skills"
          items={result.matchedSkills}
          variant="success"
        />

        <DetailCard
          title="Missing Skills"
          items={result.missingSkills}
          variant="danger"
        />

        <DetailCard
          title="Missing Keywords"
          items={result.missingKeywords}
          variant="warning"
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <ListCard title="Strengths" items={result.strengths} />
        <ListCard title="Weaknesses" items={result.weaknesses} />
        <ListCard title="Recommendations" items={result.recommendations} />
      </section>

      {improvementPlan && (
        <ImprovementPlanPanel plan={improvementPlan} />
      )}

      {rewritePlan && (
        <RewritePlanPanel plan={rewritePlan} />
      )}
    </section>
  );
}

type JobMatchSyncStatusCardProps = {
  match: ActiveJobMatch;
  syncStatus: JobMatchSyncStatus | null;
  isConfigured: boolean;
  isAuthLoading: boolean;
  isSignedIn: boolean;
};

function JobMatchSyncStatusCard({
  match,
  syncStatus,
  isConfigured,
  isAuthLoading,
  isSignedIn,
}: JobMatchSyncStatusCardProps) {
  const presentation = getJobMatchSyncPresentation(
    match,
    syncStatus,
    isConfigured,
    isAuthLoading,
    isSignedIn,
  );

  return (
    <section
      className={`mt-4 rounded-2xl border p-4 ${presentation.className}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {presentation.title}
          </p>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">
            {presentation.message}
          </p>
        </div>

        <span className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
          {presentation.badge}
        </span>
      </div>
    </section>
  );
}

type JobMatchHistoryPanelProps = {
  matches: SavedJobMatch[];
  activeMatchId: string | null;
  syncMessage: string;
  onView: (match: SavedJobMatch) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
};

function JobMatchHistoryPanel({
  matches,
  activeMatchId,
  syncMessage,
  onView,
  onDelete,
  onClear,
}: JobMatchHistoryPanelProps) {
  return (
    <section className={`mt-6 ${premiumSurface}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">
            Job Match History
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            History works in this browser first. Signed-in users can also save
            job matches to their account.
          </p>
        </div>

        {matches.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="w-fit rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
          >
            Clear history
          </button>
        )}
      </div>

      {syncMessage && (
        <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
          {syncMessage}
        </p>
      )}

      {matches.length ? (
        <div className="mt-5 grid gap-3">
          {matches.map((match) => {
            const isActive = activeMatchId === match.id;
            const cardClassName = isActive
              ? "border-emerald-300 bg-emerald-50"
              : "border-slate-200 bg-white";

            return (
              <article
                key={match.id}
                className={`rounded-lg border p-4 ${cardClassName}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-base font-bold text-slate-950">
                        {match.jobTitle}
                      </h3>

                      {isActive && (
                        <span className="rounded-full border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800">
                          Viewing
                        </span>
                      )}

                      {match.databaseId && (
                        <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
                          Synced
                        </span>
                      )}

                      {!match.databaseId &&
                        match.syncStatus === "local-only" && (
                          <span className="rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">
                            Local
                          </span>
                        )}
                    </div>

                    <p className="mt-1 break-words text-sm text-slate-600">
                      {match.companyName}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center lg:min-w-[520px]">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Match
                      </p>

                      <p className="mt-1 text-2xl font-black text-slate-950">
                        {match.result.matchScore}%
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-slate-900">
                        {match.result.verdict}
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        {formatAnalyzedAt(match.analyzedAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => onView(match)}
                        className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
                      >
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(match.id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
          Saved job analyses will appear here after you run a match.
        </p>
      )}
    </section>
  );
}

type ImprovementPlanPanelProps = {
  plan: ResumeImprovementPlan;
};

function ImprovementPlanPanel({ plan }: ImprovementPlanPanelProps) {
  return (
    <section className="space-y-4">
      <article className={premiumSurface}>
        <p className={premiumEyebrow}>
          Resume Improvement Plan
        </p>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-slate-950">
              {plan.readiness}
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {plan.summary}
            </p>
          </div>

          <span className={getReadinessClassName(plan.readiness)}>
            {plan.readiness}
          </span>
        </div>
      </article>

      <article className={premiumSurface}>
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
          Priority Fixes
        </h3>

        {plan.priorityFixes.length ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {plan.priorityFixes.map((fix) => (
              <article
                key={`${fix.category}-${fix.title}`}
                className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-5"
              >
                <div className="flex flex-wrap gap-2">
                  <span className={premiumBadge}>
                    {fix.category}
                  </span>

                  <span className={getPriorityClassName(fix.priority)}>
                    {fix.priority} priority
                  </span>

                  <span className={getImpactClassName(fix.impact)}>
                    {fix.impact} impact
                  </span>
                </div>

                <h4 className="mt-4 text-lg font-bold text-slate-950">
                  {fix.title}
                </h4>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {fix.reason}
                </p>

                <p className="mt-3 text-sm leading-6 text-slate-800">
                  {fix.action}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <EmptySignal />
        )}
      </article>

      <section className="grid gap-4 lg:grid-cols-2">
        <ListCard
          title="Missing Keywords to Add Truthfully"
          items={plan.keywordAdditions}
        />

        <ListCard
          title="Project Suggestions"
          items={plan.projectSuggestions}
        />

        <ListCard
          title="Proof Gaps"
          items={plan.proofGaps}
        />

        <ListCard
          title="Section Fixes"
          items={plan.sectionFixes}
        />
      </section>

      <ListCard
        title="Before Apply Checklist"
        items={plan.beforeApplyChecklist}
      />
    </section>
  );
}

type RewritePlanPanelProps = {
  plan: ResumeRewritePlan;
};

function RewritePlanPanel({ plan }: RewritePlanPanelProps) {
  return (
    <section className="space-y-4">
      <article className={premiumSurface}>
        <p className={premiumEyebrow}>
          Resume Rewrite Suggestions
        </p>

        <h2 className="mt-4 text-2xl font-bold text-slate-950">
          {plan.headline}
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          These are templates, not claims. Replace every placeholder with
          truthful proof before using them.
        </p>
      </article>

      <section className="grid gap-4 lg:grid-cols-2">
        <RewriteSuggestionCard
          title="Summary Rewrite"
          suggestion={plan.summaryRewrite}
        />

        <RewriteSuggestionCard
          title="Skills Section Rewrite"
          suggestion={plan.skillsRewrite}
        />
      </section>

      <RewriteSuggestionGroup
        title="Project Bullet Rewrites"
        suggestions={plan.projectRewrites}
      />

      <RewriteSuggestionGroup
        title="Experience Rewrite"
        suggestions={plan.experienceRewrites}
      />

      <ListCard
        title="Final Warnings"
        items={plan.finalWarnings}
      />
    </section>
  );
}

type RewriteSuggestionGroupProps = {
  title: string;
  suggestions: ResumeRewriteSuggestion[];
};

function RewriteSuggestionGroup({
  title,
  suggestions,
}: RewriteSuggestionGroupProps) {
  return (
    <section className={premiumSurface}>
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </h3>

      {suggestions.length ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {suggestions.map((suggestion) => (
            <RewriteSuggestionCard
              key={`${suggestion.section}-${suggestion.title}`}
              suggestion={suggestion}
            />
          ))}
        </div>
      ) : (
        <EmptySignal />
      )}
    </section>
  );
}

type RewriteSuggestionCardProps = {
  title?: string;
  suggestion: ResumeRewriteSuggestion;
};

function RewriteSuggestionCard({
  title,
  suggestion,
}: RewriteSuggestionCardProps) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={premiumBadge}>
          {suggestion.section}
        </span>

        {title && (
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            {title}
          </span>
        )}
      </div>

      <h4 className="mt-4 text-lg font-bold text-slate-950">
        {suggestion.title}
      </h4>

      <RewriteBlock
        label="Weak"
        value={suggestion.weakExample}
        tone="muted"
      />

      <RewriteBlock
        label="Stronger Template"
        value={suggestion.improvedExample}
        tone="strong"
      />

      <p className="mt-4 text-sm leading-6 text-slate-600">
        {suggestion.whyBetter}
      </p>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Evidence Needed
        </p>

        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
          {suggestion.evidenceNeeded.map((item) => (
            <li
              key={item}
              className="break-words border-l border-emerald-300 pl-3"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
        {suggestion.caution}
      </p>
    </article>
  );
}

type RewriteBlockProps = {
  label: string;
  value: string;
  tone: "muted" | "strong";
};

function RewriteBlock({
  label,
  value,
  tone,
}: RewriteBlockProps) {
  const className = tone === "strong"
    ? "mt-2 whitespace-pre-line break-words rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-950"
    : "mt-2 whitespace-pre-line break-words rounded-lg border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600";

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>

      <p className={className}>
        {value}
      </p>
    </div>
  );
}

type DetailCardProps = {
  title: string;
  items: string[];
  variant: "success" | "warning" | "danger";
};

function DetailCard({
  title,
  items,
  variant,
}: DetailCardProps) {
  const colorClass = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
    danger: "border-rose-200 bg-rose-50 text-rose-800",
  }[variant];

  return (
    <article className={premiumCompactSurface}>
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </h3>

      {items.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {items.map((item) => (
            <span
              key={item}
              className={`break-words rounded-full border px-3 py-1 text-sm font-semibold ${colorClass}`}
            >
              {item}
            </span>
          ))}
        </div>
      ) : (
        <EmptySignal />
      )}
    </article>
  );
}

type ListCardProps = {
  title: string;
  items: string[];
};

function ListCard({ title, items }: ListCardProps) {
  return (
    <article className={premiumCompactSurface}>
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </h3>

      {items.length ? (
        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
          {items.map((item) => (
            <li
              key={item}
              className="break-words border-l border-emerald-300 pl-3"
            >
              {item}
            </li>
          ))}
        </ul>
      ) : (
        <EmptySignal />
      )}
    </article>
  );
}

function EmptySignal() {
  return (
    <p className="mt-4 text-sm text-slate-500">
      Not detected yet
    </p>
  );
}

function getReadinessClassName(
  readiness: ResumeImprovementPlan["readiness"],
): string {
  const baseClassName =
    "w-fit rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em]";

  if (readiness === "Apply now") {
    return `${baseClassName} border-emerald-200 bg-emerald-50 text-emerald-800`;
  }

  if (readiness === "Tailor before applying") {
    return `${baseClassName} border-amber-200 bg-amber-50 text-amber-800`;
  }

  return `${baseClassName} border-rose-200 bg-rose-50 text-rose-800`;
}

function getPriorityClassName(
  priority: ResumeImprovementPlan["priorityFixes"][number]["priority"],
): string {
  const baseClassName =
    "rounded-full border px-3 py-1 text-xs font-semibold";

  if (priority === "High") {
    return `${baseClassName} border-rose-200 bg-rose-50 text-rose-800`;
  }

  if (priority === "Medium") {
    return `${baseClassName} border-amber-200 bg-amber-50 text-amber-800`;
  }

  return `${baseClassName} border-emerald-200 bg-emerald-50 text-emerald-800`;
}

function getImpactClassName(
  impact: ResumeImprovementPlan["priorityFixes"][number]["impact"],
): string {
  const baseClassName =
    "rounded-full border px-3 py-1 text-xs font-semibold";

  if (impact === "High") {
    return `${baseClassName} border-emerald-200 bg-emerald-50 text-emerald-800`;
  }

  if (impact === "Medium") {
    return `${baseClassName} border-sky-200 bg-sky-50 text-sky-800`;
  }

  return `${baseClassName} border-slate-200 bg-white text-slate-700`;
}

function getJobMatchSyncPresentation(
  match: ActiveJobMatch,
  syncStatus: JobMatchSyncStatus | null,
  isConfigured: boolean,
  isAuthLoading: boolean,
  isSignedIn: boolean,
): {
  title: string;
  message: string;
  badge: string;
  className: string;
} {
  const statusMatchesActive = !syncStatus?.databaseId ||
    syncStatus.databaseId === match.databaseId;

  if (match.databaseId && syncStatus?.status === "synced" && statusMatchesActive) {
    return {
      title: "Synced to account",
      message: syncStatus.syncedAt
        ? `${syncStatus.message} Last sync: ${formatAnalyzedAt(
          syncStatus.syncedAt,
        )}.`
        : syncStatus.message,
      badge: "Synced",
      className: "border-emerald-200 bg-emerald-50",
    };
  }

  if (match.databaseId) {
    return {
      title: "Synced to account",
      message: "This job match is saved to your SkillMint account.",
      badge: "Synced",
      className: "border-emerald-200 bg-emerald-50",
    };
  }

  if (syncStatus?.status === "local-only" && statusMatchesActive) {
    return {
      title: "Saved in this browser",
      message: syncStatus.message,
      badge: "Browser",
      className: "border-amber-200 bg-amber-50",
    };
  }

  if (!isConfigured) {
    return {
      title: "Account sync unavailable",
      message:
        "Job match saved in this browser. Account saving is unavailable.",
      badge: "Browser",
      className: "border-amber-200 bg-amber-50",
    };
  }

  if (!isAuthLoading && !isSignedIn) {
    return {
      title: "Sign in to sync your account.",
      message: "Job match saved in this browser. Sign in to save matches to your account.",
      badge: "Browser",
      className: "border-amber-200 bg-amber-50",
    };
  }

  return {
    title: "Account sync",
    message:
      "Job match saved in this browser. Account status will appear here when the save finishes.",
    badge: "Browser",
    className: "border-slate-200 bg-slate-50",
  };
}

function readLatestJobMatch(
  ownerContext: {
    currentUserId: string | null | undefined;
  },
): ActiveJobMatch | null {
  const storedValue = readCurrentJobMatchSnapshot(ownerContext);

  try {
    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue);

    if (
      !isRecord(parsedValue) ||
      !isJobDescriptionMatchResult(parsedValue.result)
    ) {
      return null;
    }

    return {
      id: isString(parsedValue.id) ? parsedValue.id : undefined,
      databaseId: isString(parsedValue.databaseId)
        ? parsedValue.databaseId
        : undefined,
      syncStatus: isJobMatchSyncState(parsedValue.syncStatus)
        ? parsedValue.syncStatus
        : undefined,
      jobTitle: getFallbackText(
        isString(parsedValue.jobTitle) ? parsedValue.jobTitle : "",
        "Untitled Role",
      ),
      companyName: getFallbackText(
        isString(parsedValue.companyName) ? parsedValue.companyName : "",
        "Unknown Company",
      ),
      jobDescription: isString(parsedValue.jobDescription)
        ? parsedValue.jobDescription
        : "",
      result: parsedValue.result,
      improvementPlan: isResumeImprovementPlan(parsedValue.improvementPlan)
        ? parsedValue.improvementPlan
        : null,
      rewritePlan: isResumeRewritePlan(parsedValue.rewritePlan)
        ? parsedValue.rewritePlan
        : null,
      roadmap: parsedValue.roadmap,
      resumeContext: isActiveTargetResumeContext(parsedValue.resumeContext)
        ? parsedValue.resumeContext
        : undefined,
      analyzedAt: isString(parsedValue.analyzedAt)
        ? parsedValue.analyzedAt
        : "",
    };
  } catch {
    return null;
  }
}

function persistLatestJobMatch(
  match: ActiveJobMatch,
  ownerContext: {
    currentUserId: string | null | undefined;
  },
) {
  return writeCurrentJobMatchSnapshot({
    id: match.id,
    jobTitle: match.jobTitle,
    companyName: match.companyName,
    jobDescription: match.jobDescription,
    result: match.result,
    improvementPlan: match.improvementPlan,
    rewritePlan: match.rewritePlan,
    roadmap: match.roadmap,
    databaseId: match.databaseId,
    syncStatus: match.syncStatus,
    resumeContext: match.resumeContext,
    analyzedAt: match.analyzedAt,
  }, ownerContext);
}

function clearLatestJobMatch(
  ownerContext: { currentUserId: string | null | undefined },
) {
  return clearCurrentJobMatchSnapshot(ownerContext);
}

function readJobMatchSyncStatus(
  ownerContext: {
    currentUserId: string | null | undefined;
  },
): JobMatchSyncStatus | null {
  const storedValue = readCurrentJobMatchSyncStatusSnapshot(ownerContext);

  try {
    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue);

    return isJobMatchSyncStatus(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

function mapPersistentJobMatchToSavedMatch(
  jobMatch: PersistentJobMatch,
): SavedJobMatch | null {
  if (!isJobDescriptionMatchResult(jobMatch.matchResult)) {
    return null;
  }

  return {
    id: jobMatch.id,
    jobTitle: getFallbackText(jobMatch.jobTitle ?? "", "Untitled Role"),
    companyName: getFallbackText(
      jobMatch.companyName ?? "",
      "Unknown Company",
    ),
    jobDescription: jobMatch.jobDescription,
    result: jobMatch.matchResult,
    improvementPlan: isResumeImprovementPlan(jobMatch.improvementPlan)
      ? jobMatch.improvementPlan
      : null,
    rewritePlan: isResumeRewritePlan(jobMatch.rewritePlan)
      ? jobMatch.rewritePlan
      : null,
    roadmap: jobMatch.roadmap,
    databaseId: jobMatch.id,
    syncStatus: "synced",
    analyzedAt: jobMatch.createdAt || new Date().toISOString(),
  };
}

function getCurrentJobMatchForResume(
  match: ActiveJobMatch | SavedJobMatch | null,
  currentResumeContext: ActiveTargetResumeContext | null,
): ActiveJobMatch | null {
  if (!match) {
    return null;
  }

  return isResumeContextCurrent(match.resumeContext, currentResumeContext)
    ? match
    : null;
}

function getPersistedJobMatchId(
  match: SavedJobMatch | undefined,
): string | null {
  if (!match) {
    return null;
  }

  if (match.databaseId) {
    return match.databaseId;
  }

  return isUuid(match.id) ? match.id : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value);
}

function getLocalOnlySyncMessage(error: string): string {
  if (isMissingSupabaseConfigError(error)) {
    return "Job match saved in this browser. Account saving is unavailable.";
  }

  if (error.includes("Sign in")) {
    return "Job match saved in this browser. Sign in to save your progress.";
  }

  return error || "Job match saved in this browser. Account save did not finish.";
}

function isMissingSupabaseConfigError(error: string): boolean {
  const normalizedError = error.toLowerCase();

  return (
    normalizedError.includes("supabase") &&
    normalizedError.includes("environment variables") &&
    normalizedError.includes("missing")
  );
}

function createSavedJobMatchId(analyzedAt: string): string {
  const analyzedAtTime = Date.parse(analyzedAt);
  const timestamp = Number.isFinite(analyzedAtTime)
    ? analyzedAtTime
    : Date.now();
  const suffix = Math.random().toString(36).slice(2, 8);

  return `${timestamp}-${suffix}`;
}

function getFallbackText(value: string, fallback: string): string {
  const trimmedValue = value.trim();

  return trimmedValue || fallback;
}

function formatAnalyzedAt(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function subscribeToStoredAnalysis(
  onStoreChange: () => void,
): () => void {
  return subscribeToSkillMintWorkspaceUpdates(onStoreChange);
}

function readStoredAnalysis(
  currentUserId: string | null | undefined,
): string | null {
  return readActiveResumeReportSnapshot({
    currentUserId,
  });
}

function readStoredActiveTarget(
  currentUserId: string | null | undefined,
): string | null {
  return readActiveTargetStorageSnapshot({ currentUserId });
}

function getServerSnapshot(): null {
  return null;
}

function getStoredUserProfile(
  storedAnalysis: string | null,
): UserProfile | null {
  if (!storedAnalysis) {
    return null;
  }

  try {
    const parsedAnalysis = JSON.parse(storedAnalysis);

    if (!isRecord(parsedAnalysis)) {
      return null;
    }

    return isUserProfile(parsedAnalysis.userProfile)
      ? parsedAnalysis.userProfile
      : null;
  } catch {
    return null;
  }
}

function formatActiveTargetTitle(
  target: NonNullable<ActiveTargetEngineResult["activeTarget"]>,
): string {
  if (target.companyName && target.roleTitle) {
    return `${target.roleTitle} at ${target.companyName}`;
  }

  return target.title;
}

function isJobDescriptionMatchResult(
  value: unknown,
): value is JobDescriptionMatchResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNumber(value.matchScore) &&
    isString(value.verdict) &&
    isString(value.brutalReality) &&
    isStringArray(value.matchedSkills) &&
    isStringArray(value.missingSkills) &&
    isStringArray(value.missingKeywords) &&
    isStringArray(value.strengths) &&
    isStringArray(value.weaknesses) &&
    isStringArray(value.recommendations)
  );
}

function isResumeImprovementPlan(
  value: unknown,
): value is ResumeImprovementPlan {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.readiness) &&
    isString(value.summary) &&
    Array.isArray(value.priorityFixes) &&
    value.priorityFixes.every(isResumeImprovementItem) &&
    isStringArray(value.keywordAdditions) &&
    isStringArray(value.projectSuggestions) &&
    isStringArray(value.proofGaps) &&
    isStringArray(value.sectionFixes) &&
    isStringArray(value.beforeApplyChecklist)
  );
}

function isResumeImprovementItem(
  value: unknown,
): value is ResumeImprovementPlan["priorityFixes"][number] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.title) &&
    isString(value.reason) &&
    isString(value.action) &&
    isString(value.priority) &&
    isString(value.impact) &&
    isString(value.category)
  );
}

function isResumeRewritePlan(value: unknown): value is ResumeRewritePlan {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.headline) &&
    isResumeRewriteSuggestion(value.summaryRewrite) &&
    isResumeRewriteSuggestion(value.skillsRewrite) &&
    Array.isArray(value.projectRewrites) &&
    value.projectRewrites.every(isResumeRewriteSuggestion) &&
    Array.isArray(value.experienceRewrites) &&
    value.experienceRewrites.every(isResumeRewriteSuggestion) &&
    isStringArray(value.finalWarnings)
  );
}

function isResumeRewriteSuggestion(
  value: unknown,
): value is ResumeRewriteSuggestion {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.section) &&
    isString(value.title) &&
    isString(value.weakExample) &&
    isString(value.improvedExample) &&
    isString(value.whyBetter) &&
    isStringArray(value.evidenceNeeded) &&
    isString(value.caution)
  );
}

function isJobMatchSyncStatus(
  value: unknown,
): value is JobMatchSyncStatus {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isJobMatchSyncState(value.status) &&
    isString(value.message) &&
    (value.syncedAt === undefined || isString(value.syncedAt)) &&
    (value.databaseId === undefined || isString(value.databaseId))
  );
}

function isActiveTargetResumeContext(
  value: unknown,
): value is ActiveTargetResumeContext {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.fingerprint) &&
    (value.analyzedAt === undefined || isString(value.analyzedAt)) &&
    (value.fileName === undefined || isString(value.fileName)) &&
    (value.scoringVersion === undefined || isString(value.scoringVersion))
  );
}

function isJobMatchSyncState(
  value: unknown,
): value is JobMatchSyncStatus["status"] {
  return value === "synced" ||
    value === "local-only" ||
    value === "pending" ||
    value === "failed";
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNumber(value.resumeScore) &&
    isNumber(value.skillsScore) &&
    isNumber(value.projectsScore) &&
    isNumber(value.experienceScore) &&
    isNumber(value.educationScore) &&
    isNumber(value.githubScore) &&
    isNumber(value.linkedinScore) &&
    isNumber(value.atsScore) &&
    isNumber(value.recruiterScore) &&
    isNumber(value.activityScore) &&
    isStringArray(value.skills) &&
    isStringArray(value.projects) &&
    isStringArray(value.experience) &&
    typeof value.education === "string" &&
    Array.isArray(value.certifications) &&
    Array.isArray(value.codingProfiles)
  );
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string");
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" &&
    !Array.isArray(value);
}
