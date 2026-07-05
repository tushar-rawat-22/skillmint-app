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
  analyzeJobDescriptionMatch,
  type JobDescriptionMatchResult,
} from "@/intelligence/core/jobDescriptionMatch";
import {
  generateResumeImprovementPlan,
  type ResumeImprovementPlan,
} from "@/intelligence/core/resumeImprovement";
import {
  generateResumeRewritePlan,
  type ResumeRewritePlan,
  type ResumeRewriteSuggestion,
} from "@/intelligence/core/resumeRewrite";
import type { UserProfile } from "@/intelligence/types/profile";
import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";
import {
  NextBestActionPanel,
  UpgradeInterestCard,
} from "@/modules/activation";
import {
  clearSavedJobMatches,
  deleteSavedJobMatch,
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

const RESUME_ANALYSIS_STORAGE_KEY = "skillmint:resume-analysis";
const JD_MATCH_STORAGE_KEY = "skillmint:jd-match";
const JD_MATCH_SYNC_STATUS_STORAGE_KEY = "skillmint:jd-match-sync-status";
const MIN_JOB_DESCRIPTION_LENGTH = 80;
const JOB_DESCRIPTION_MIN_HEIGHT = 140;
const JOB_DESCRIPTION_MAX_HEIGHT = 420;

type ActiveJobMatch = {
  id?: string;
  databaseId?: string;
  syncStatus?: "synced" | "local-only";
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  result: JobDescriptionMatchResult;
  improvementPlan: ResumeImprovementPlan | null;
  rewritePlan: ResumeRewritePlan | null;
  roadmap?: unknown;
  analyzedAt: string;
};

type JobMatchSyncStatus = {
  status: "synced" | "local-only";
  message: string;
  syncedAt?: string;
  databaseId?: string;
};

export default function ATSMatcherPage() {
  const storedAnalysis = useSyncExternalStore(
    subscribeToStoredAnalysis,
    readStoredAnalysis,
    getServerSnapshot,
  );
  const userProfile = useMemo(
    () => getStoredUserProfile(storedAnalysis),
    [storedAnalysis],
  );
  const {
    user,
    isConfigured,
    isLoading: isAuthLoading,
  } = useAuthSession();
  const userId = user?.id ?? null;
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
  const [hasLoadedLocalHistory, setHasLoadedLocalHistory] = useState(false);
  const jobDescriptionTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const savedMatches = getSavedJobMatches();

      setSavedJobMatches(savedMatches);
      setActiveMatch(readLatestJobMatch() ?? getLatestJobMatch());
      setSyncStatus(readJobMatchSyncStatus());
      setHasLoadedLocalHistory(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, []);

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

        const nextMatches = replaceSavedJobMatches(restoredMatches);
        const nextActiveMatch = readLatestJobMatch() ?? nextMatches[0] ??
          null;

        setSavedJobMatches(nextMatches);
        setActiveMatch(nextActiveMatch);
        if (nextActiveMatch) {
          persistLatestJobMatch(nextActiveMatch);
        }
        setHistorySyncMessage("Loaded recent job matches from your account.");
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
    savedJobMatches.length,
    userId,
  ]);

  if (!userProfile) {
    return (
      <DashboardLayout>
        <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-green-400">
            Match One Job
          </p>

          <h1 className="mt-5 text-4xl font-black md:text-5xl">
            Upload and analyze your resume first.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-400">
            SkillMint needs your latest resume intelligence before it can
            compare you against one specific job description. Setup is for
            your career direction; this page is for one pasted role.
          </p>

          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/setup"
              className="rounded-xl border border-gray-700 px-6 py-3 font-semibold text-gray-100 transition hover:border-green-500 hover:text-green-300"
            >
              Career Setup
            </Link>

            <Link
              href="/upload"
              className="rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-500"
            >
              Upload Resume
            </Link>
          </div>

          <NextBestActionPanel className="mt-8 text-left" />
        </section>
      </DashboardLayout>
    );
  }

  function handleAnalyzeMatch() {
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
      analyzedAt,
    };

    setActiveMatch(savedMatch);
    setSavedJobMatches(saveJobMatch(savedMatch));
    persistLatestJobMatch(savedMatch);
    void persistJobMatchToDatabase(savedMatch);
  }

  function handleViewSavedMatch(match: SavedJobMatch) {
    setError("");
    setDeleteSyncMessage("");
    setActiveMatch(match);
    persistLatestJobMatch(match);
  }

  function handleDeleteSavedMatch(id: string) {
    const matchToDelete = savedJobMatches.find((match) => match.id === id);
    const nextMatches = deleteSavedJobMatch(id);

    setSavedJobMatches(nextMatches);
    setDeleteSyncMessage("");

    if (activeMatch?.id !== id) {
      void deletePersistedJobMatch(matchToDelete);
      return;
    }

    const nextActiveMatch = nextMatches[0] ?? null;

    setActiveMatch(nextActiveMatch);

    if (nextActiveMatch) {
      persistLatestJobMatch(nextActiveMatch);
    } else {
      clearLatestJobMatch();
    }

    void deletePersistedJobMatch(matchToDelete);
  }

  function handleClearHistory() {
    if (!window.confirm("Clear all saved job match history?")) {
      return;
    }

    clearSavedJobMatches();
    setSavedJobMatches([]);

    if (activeMatch) {
      persistLatestJobMatch(activeMatch);
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

        setSavedJobMatches(saveJobMatch(nextMatch));
        setActiveMatch((currentMatch) => {
          if (currentMatch?.id !== match.id) {
            return currentMatch;
          }

          return nextMatch;
        });
        persistLatestJobMatch(nextMatch);
        writeJobMatchSyncStatus(nextStatus);
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

    setSavedJobMatches(saveJobMatch(nextMatch));
    setActiveMatch((currentMatch) => {
      if (currentMatch?.id !== match.id) {
        return currentMatch;
      }

      return nextMatch;
    });
    persistLatestJobMatch(nextMatch);
    writeJobMatchSyncStatus(nextStatus);
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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-green-400">
              ATS Match
            </p>

            <h1 className="mt-4 text-4xl font-black md:text-5xl">
              Match one job description against your resume
            </h1>

            <p className="mt-4 max-w-2xl text-gray-400">
              Paste one job description to compare your current resume against
              that specific role. Use Setup for your broader career direction.
            </p>
          </div>

          <Link
            href="/resume"
            className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-100 transition hover:border-green-500 hover:text-green-300"
          >
            View Resume Analysis
          </Link>
        </div>

        <NextBestActionPanel className="mt-8" />

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <article className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-blue-100">
              What this does
            </h2>

            <p className="mt-2 text-sm leading-6 text-blue-50/80">
              Compares your resume intelligence with one job description at a
              time.
            </p>
          </article>

          <article className="rounded-lg border border-gray-800 bg-neutral-900 p-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-gray-400">
              What to paste
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Use the full job description: responsibilities, requirements,
              tools, and qualifications.
            </p>
          </article>

          <article className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-violet-100">
              What comes next
            </h2>

            <p className="mt-2 text-sm leading-6 text-violet-50/80">
              SkillMint saves the match in this browser, builds fixes, and can
              feed a more job-specific roadmap.
            </p>
          </article>
        </section>

        <section className="mt-10 rounded-lg border border-gray-800 bg-neutral-900 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <label
                htmlFor="job-description"
                className="text-xl font-bold"
              >
                Job description
              </label>

              <p className="mt-1 text-sm text-gray-400">
                Use the complete job description. Short snippets make the match less useful.
              </p>
            </div>

            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              {jobDescription.trim().length} chars
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="job-title"
                className="text-sm font-semibold text-gray-200"
              >
                Job title
              </label>

              <input
                id="job-title"
                value={jobTitle}
                onChange={(event) => setJobTitle(event.target.value)}
                placeholder="Frontend Intern"
                className="mt-2 w-full rounded-lg border border-gray-800 bg-black/40 px-4 py-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-green-500"
              />
            </div>

            <div>
              <label
                htmlFor="company-name"
                className="text-sm font-semibold text-gray-200"
              >
                Company name
              </label>

              <input
                id="company-name"
                value={companyName}
                onChange={(event) => setCompanyName(event.target.value)}
                placeholder="Acme"
                className="mt-2 w-full rounded-lg border border-gray-800 bg-black/40 px-4 py-3 text-sm text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-green-500"
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
            className="mt-5 max-h-[420px] min-h-[140px] w-full resize-none rounded-lg border border-gray-800 bg-black/40 p-4 text-sm leading-7 text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-green-500"
          />

          {error && (
            <p className="mt-3 text-sm font-medium text-red-300">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleAnalyzeMatch}
            className="mt-5 rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-500"
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
              body="Free beta shows the core match, gaps, fixes, and rewrites. Paid beta interest helps shape deeper role-specific coaching."
              cta="Get advanced career plan interest"
            />
          </>
        ) : (
          <section className="mt-6 rounded-lg border border-gray-800 bg-neutral-900 p-6">
            <h2 className="text-xl font-bold">
              Match result
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
              Your strict ATS match report will appear here after analysis.
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

function MatchResultPanel({ match }: MatchResultPanelProps) {
  const { result, improvementPlan, rewritePlan } = match;

  return (
    <section className="mt-6 space-y-6">
      <article className="rounded-lg border border-green-500/30 bg-green-500/10 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-300/80">
              Strict ATS Match
            </p>

            <h2 className="mt-3 text-2xl font-bold text-white">
              {match.jobTitle}
            </h2>

            <p className="mt-1 text-sm text-green-50/70">
              {match.companyName} - {formatAnalyzedAt(match.analyzedAt)}
            </p>
          </div>

          {match.id && (
            <span className="w-fit rounded-full border border-green-500/30 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-green-100">
              Saved
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="min-w-0">
            <p className="text-6xl font-black leading-none text-white md:text-7xl">
              {result.matchScore}%
            </p>

            <h2 className="mt-4 text-2xl font-bold text-white">
              {result.verdict}
            </h2>
          </div>

          <p className="max-w-2xl text-base leading-7 text-green-50/80">
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
      className={`mt-4 rounded-lg border p-4 ${presentation.className}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">
            {presentation.title}
          </p>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-300">
            {presentation.message}
          </p>
        </div>

        <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-200">
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
    <section className="mt-6 rounded-lg border border-gray-800 bg-neutral-900 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-white">
            Job Match History
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
            History works in this browser first. Signed-in users can also save
            job matches to their account.
          </p>
        </div>

        {matches.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            className="w-fit rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-red-500/60 hover:text-red-200"
          >
            Clear history
          </button>
        )}
      </div>

      {syncMessage && (
        <p className="mt-4 rounded-lg border border-gray-800 bg-black/30 p-3 text-sm leading-6 text-gray-300">
          {syncMessage}
        </p>
      )}

      {matches.length ? (
        <div className="mt-5 grid gap-3">
          {matches.map((match) => {
            const isActive = activeMatchId === match.id;
            const cardClassName = isActive
              ? "border-green-500/40 bg-green-500/10"
              : "border-gray-800 bg-black/30";

            return (
              <article
                key={match.id}
                className={`rounded-lg border p-4 ${cardClassName}`}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="break-words text-base font-bold text-white">
                        {match.jobTitle}
                      </h3>

                      {isActive && (
                        <span className="rounded-full border border-green-500/30 px-2.5 py-1 text-xs font-semibold text-green-200">
                          Viewing
                        </span>
                      )}

                      {match.databaseId && (
                        <span className="rounded-full border border-blue-500/30 px-2.5 py-1 text-xs font-semibold text-blue-100">
                          Synced
                        </span>
                      )}

                      {!match.databaseId &&
                        match.syncStatus === "local-only" && (
                          <span className="rounded-full border border-yellow-500/30 px-2.5 py-1 text-xs font-semibold text-yellow-100">
                            Local
                          </span>
                        )}
                    </div>

                    <p className="mt-1 break-words text-sm text-gray-400">
                      {match.companyName}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center lg:min-w-[520px]">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
                        Match
                      </p>

                      <p className="mt-1 text-2xl font-black text-white">
                        {match.result.matchScore}%
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="break-words text-sm font-semibold text-gray-100">
                        {match.result.verdict}
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        {formatAnalyzedAt(match.analyzedAt)}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => onView(match)}
                        className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:border-green-500 hover:text-green-300"
                      >
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() => onDelete(match.id)}
                        className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:border-red-500/60 hover:text-red-200"
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
        <p className="mt-5 rounded-lg border border-gray-800 bg-black/30 p-4 text-sm text-gray-500">
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
      <article className="rounded-lg border border-gray-800 bg-neutral-900 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-400">
          Resume Improvement Plan
        </p>

        <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <h2 className="text-2xl font-bold text-white">
              {plan.readiness}
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
              {plan.summary}
            </p>
          </div>

          <span className={getReadinessClassName(plan.readiness)}>
            {plan.readiness}
          </span>
        </div>
      </article>

      <article className="rounded-lg border border-gray-800 bg-neutral-900 p-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
          Priority Fixes
        </h3>

        {plan.priorityFixes.length ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {plan.priorityFixes.map((fix) => (
              <article
                key={`${fix.category}-${fix.title}`}
                className="min-w-0 rounded-lg border border-gray-800 bg-black/30 p-5"
              >
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-gray-700 px-3 py-1 text-xs font-semibold text-gray-300">
                    {fix.category}
                  </span>

                  <span className={getPriorityClassName(fix.priority)}>
                    {fix.priority} priority
                  </span>

                  <span className={getImpactClassName(fix.impact)}>
                    {fix.impact} impact
                  </span>
                </div>

                <h4 className="mt-4 text-lg font-bold text-white">
                  {fix.title}
                </h4>

                <p className="mt-3 text-sm leading-6 text-gray-400">
                  {fix.reason}
                </p>

                <p className="mt-3 text-sm leading-6 text-gray-200">
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
      <article className="rounded-lg border border-gray-800 bg-neutral-900 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-400">
          Resume Rewrite Suggestions
        </p>

        <h2 className="mt-4 text-2xl font-bold text-white">
          {plan.headline}
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
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
    <section className="rounded-lg border border-gray-800 bg-neutral-900 p-6">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
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
    <article className="min-w-0 rounded-lg border border-gray-800 bg-black/30 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-gray-700 px-3 py-1 text-xs font-semibold text-gray-300">
          {suggestion.section}
        </span>

        {title && (
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            {title}
          </span>
        )}
      </div>

      <h4 className="mt-4 text-lg font-bold text-white">
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

      <p className="mt-4 text-sm leading-6 text-gray-400">
        {suggestion.whyBetter}
      </p>

      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
          Evidence Needed
        </p>

        <ul className="mt-3 space-y-2 text-sm leading-6 text-gray-200">
          {suggestion.evidenceNeeded.map((item) => (
            <li
              key={item}
              className="break-words border-l border-green-500/40 pl-3"
            >
              {item}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-4 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-sm leading-6 text-yellow-100">
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
    ? "mt-2 whitespace-pre-line break-words rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm leading-6 text-green-50"
    : "mt-2 whitespace-pre-line break-words rounded-lg border border-gray-800 bg-black/30 p-3 text-sm leading-6 text-gray-400";

  return (
    <div className="mt-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
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
    success: "border-green-500/30 bg-green-500/10 text-green-200",
    warning: "border-yellow-500/30 bg-yellow-500/10 text-yellow-100",
    danger: "border-red-500/30 bg-red-500/10 text-red-100",
  }[variant];

  return (
    <article className="min-w-0 rounded-lg border border-gray-800 bg-neutral-900 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
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
    <article className="min-w-0 rounded-lg border border-gray-800 bg-neutral-900 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
        {title}
      </h3>

      {items.length ? (
        <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-200">
          {items.map((item) => (
            <li
              key={item}
              className="break-words border-l border-green-500/40 pl-3"
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
    <p className="mt-4 text-sm text-gray-500">
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
    return `${baseClassName} border-green-500/30 bg-green-500/10 text-green-200`;
  }

  if (readiness === "Tailor before applying") {
    return `${baseClassName} border-yellow-500/30 bg-yellow-500/10 text-yellow-100`;
  }

  return `${baseClassName} border-red-500/30 bg-red-500/10 text-red-100`;
}

function getPriorityClassName(
  priority: ResumeImprovementPlan["priorityFixes"][number]["priority"],
): string {
  const baseClassName =
    "rounded-full border px-3 py-1 text-xs font-semibold";

  if (priority === "High") {
    return `${baseClassName} border-red-500/30 bg-red-500/10 text-red-100`;
  }

  if (priority === "Medium") {
    return `${baseClassName} border-yellow-500/30 bg-yellow-500/10 text-yellow-100`;
  }

  return `${baseClassName} border-green-500/30 bg-green-500/10 text-green-200`;
}

function getImpactClassName(
  impact: ResumeImprovementPlan["priorityFixes"][number]["impact"],
): string {
  const baseClassName =
    "rounded-full border px-3 py-1 text-xs font-semibold text-gray-200";

  if (impact === "High") {
    return `${baseClassName} border-green-500/30 bg-green-500/10`;
  }

  if (impact === "Medium") {
    return `${baseClassName} border-blue-500/30 bg-blue-500/10`;
  }

  return `${baseClassName} border-gray-700 bg-black/20`;
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
      className: "border-green-500/30 bg-green-500/10",
    };
  }

  if (match.databaseId) {
    return {
      title: "Synced to account",
      message: "This job match is saved to your SkillMint account.",
      badge: "Synced",
      className: "border-green-500/30 bg-green-500/10",
    };
  }

  if (syncStatus?.status === "local-only" && statusMatchesActive) {
    return {
      title: "Saved in this browser",
      message: syncStatus.message,
      badge: "Browser",
      className: "border-yellow-500/30 bg-yellow-500/10",
    };
  }

  if (!isConfigured) {
    return {
      title: "Account sync unavailable",
      message:
        "Job match saved in this browser. Account saving is unavailable.",
      badge: "Browser",
      className: "border-yellow-500/30 bg-yellow-500/10",
    };
  }

  if (!isAuthLoading && !isSignedIn) {
    return {
      title: "Sign in to sync your account.",
      message: "Job match saved in this browser. Sign in to save matches to your account.",
      badge: "Browser",
      className: "border-yellow-500/30 bg-yellow-500/10",
    };
  }

  return {
    title: "Account sync",
    message:
      "Job match saved in this browser. Account status will appear here when the save finishes.",
    badge: "Browser",
    className: "border-gray-800 bg-neutral-900",
  };
}

function readLatestJobMatch(): ActiveJobMatch | null {
  const storage = getBrowserStorage();

  if (!storage) {
    return null;
  }

  try {
    const storedValue = storage.getItem(JD_MATCH_STORAGE_KEY);

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
      analyzedAt: isString(parsedValue.analyzedAt)
        ? parsedValue.analyzedAt
        : "",
    };
  } catch {
    return null;
  }
}

function persistLatestJobMatch(match: ActiveJobMatch) {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      JD_MATCH_STORAGE_KEY,
      JSON.stringify({
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
        analyzedAt: match.analyzedAt,
      }),
    );
    notifySkillMintWorkspaceUpdated();
  } catch {
    // Local storage failures should not block the user from seeing the result.
  }
}

function clearLatestJobMatch() {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(JD_MATCH_STORAGE_KEY);
    notifySkillMintWorkspaceUpdated();
  } catch {
    // Ignore storage failures.
  }
}

function readJobMatchSyncStatus(): JobMatchSyncStatus | null {
  const storage = getBrowserStorage();

  if (!storage) {
    return null;
  }

  try {
    const storedValue = storage.getItem(JD_MATCH_SYNC_STATUS_STORAGE_KEY);

    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue);

    return isJobMatchSyncStatus(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

function writeJobMatchSyncStatus(status: JobMatchSyncStatus): void {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      JD_MATCH_SYNC_STATUS_STORAGE_KEY,
      JSON.stringify(status),
    );
    notifySkillMintWorkspaceUpdated();
  } catch {
    // Sync status is noncritical; the job match is already saved in this browser.
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

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function subscribeToStoredAnalysis(
  onStoreChange: () => void,
): () => void {
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
  };
}

function readStoredAnalysis(): string | null {
  return getBrowserStorage()?.getItem(RESUME_ANALYSIS_STORAGE_KEY) ?? null;
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

function isJobMatchSyncState(
  value: unknown,
): value is JobMatchSyncStatus["status"] {
  return value === "synced" || value === "local-only";
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
