"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import ProofConfidenceExplainer from "@/components/dashboard/ProofConfidenceExplainer";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  premiumCompactSurface,
  premiumDangerCta,
  premiumEyebrow,
  premiumHeroSurface,
  premiumInsetSurface,
  premiumPrimaryCta,
  premiumSecondaryCta,
  premiumSurface,
} from "@/components/ui/premium";
import type { ResumeAnalysisResult } from "@/lib/resume/analyzeResume";
import { subscribeToSkillMintWorkspaceUpdates } from "@/lib/storage/skillMintStorageEvents";
import {
  generateProofScore,
  type ProofCoverageLabel,
  type ProofScoreResult,
} from "@/intelligence/proof";
import { calculateRoleMatches } from "@/intelligence/core/roleMatch";
import type { UserProfile } from "@/intelligence/types/profile";
import {
  NextBestActionPanel,
  UpgradeInterestCard,
} from "@/modules/activation";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import {
  deleteCurrentUserResumeAnalysis,
  detachActiveResumeSyncStatus,
  listCurrentUserResumeAnalyses,
  readActiveResumeReportSnapshot,
  readResumeSyncStatusSnapshot,
  type PersistentResumeAnalysis,
  type ResumeSyncStatus,
  setActiveResumeReportFromSavedAnalysis,
} from "@/modules/resume";

type ResumeAnalysisView = Omit<
  ResumeAnalysisResult,
  "parsedProfile" | "userProfile"
> & {
  parsedProfile: ResumeAnalysisResult["parsedProfile"];
  userProfile?: UserProfile;
};

type DatabaseLoadState = {
  isLoading: boolean;
  message: string | null;
};

type ResumeHistoryState = {
  isLoading: boolean;
  items: PersistentResumeAnalysis[];
  message: string | null;
  error: string | null;
};

type RestoreState = {
  status: "idle" | "success" | "error";
  message: string | null;
  activeId: string | null;
};

type DeleteSavedAnalysisState = {
  status: "idle" | "loading" | "success" | "error";
  message: string | null;
  activeId: string | null;
};

type ExtractedTextPreview = {
  text: string;
  isTruncated: boolean;
  fullLength: number;
};

const EXTRACTED_TEXT_PREVIEW_LIMIT = 900;

const EMPTY_PARSED_PROFILE: ResumeAnalysisResult["parsedProfile"] = {
  skills: [],
  projects: [],
  education: [],
  experience: [],
  certifications: [],
  links: {},
  rawSections: {},
};

const LINK_LABELS = {
  github: "GitHub",
  linkedin: "LinkedIn",
  portfolio: "Portfolio",
  leetcode: "LeetCode",
  codeforces: "Codeforces",
  email: "Email",
  phone: "Phone",
} satisfies Record<
  keyof ResumeAnalysisResult["parsedProfile"]["links"],
  string
>;

export default function ResumePage() {
  const {
    user,
    isConfigured,
    isLoading: isAuthLoading,
  } = useAuthSession();
  const currentUserId = isAuthLoading ? undefined : user?.id ?? null;
  const storedAnalysis = useSyncExternalStore(
    subscribeToStoredAnalysis,
    () => readStoredAnalysis(currentUserId),
    getServerSnapshot,
  );
  const storedSyncStatus = useSyncExternalStore(
    subscribeToStoredAnalysis,
    () => readStoredSyncStatus(currentUserId),
    getServerSnapshot,
  );
  const analysis = useMemo(
    () => parseStoredAnalysis(storedAnalysis),
    [storedAnalysis],
  );
  const syncStatus = useMemo(
    () => parseStoredSyncStatus(storedSyncStatus),
    [storedSyncStatus],
  );
  const userId = user?.id ?? null;
  const [resumeHistoryState, setResumeHistoryState] =
    useState<ResumeHistoryState>({
      isLoading: false,
      items: [],
      message: null,
      error: null,
    });
  const [restoreState, setRestoreState] = useState<RestoreState>({
    status: "idle",
    message: null,
    activeId: null,
  });
  const [deleteState, setDeleteState] = useState<DeleteSavedAnalysisState>({
    status: "idle",
    message: null,
    activeId: null,
  });
  const [deleteCandidate, setDeleteCandidate] =
    useState<PersistentResumeAnalysis | null>(null);
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [showFullExtractedText, setShowFullExtractedText] =
    useState(false);
  const activeAnalysis = analysis;
  const activeDatabaseId = syncStatus?.databaseId ?? null;
  const savedResumeAnalyses =
    isConfigured && userId ? resumeHistoryState.items : [];
  const databaseLoadState = useMemo<DatabaseLoadState>(() => {
    return {
      isLoading: resumeHistoryState.isLoading,
      message: resumeHistoryState.error ?? resumeHistoryState.message,
    };
  }, [
    resumeHistoryState.error,
    resumeHistoryState.isLoading,
    resumeHistoryState.message,
  ]);

  useEffect(() => {
    if (!isConfigured || isAuthLoading || !userId) {
      return;
    }

    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      void loadSavedResumeAnalyses();
    }, 0);

    async function loadSavedResumeAnalyses() {
      if (!isActive) {
        return;
      }

      setResumeHistoryState((currentState) => ({
        ...currentState,
        isLoading: true,
        message: null,
        error: null,
      }));

      try {
        const result = await listCurrentUserResumeAnalyses(10);

        if (!isActive) {
          return;
        }

        if (!result.ok) {
          setResumeHistoryState({
            isLoading: false,
            items: [],
            message: null,
            error: result.error,
          });
          return;
        }

        setResumeHistoryState({
          isLoading: false,
          items: result.data,
          message: result.data.length
            ? `${result.data.length} saved resume analysis${
              result.data.length === 1 ? "" : "es"
            } found.`
            : "No saved resume analyses found in your account yet.",
          error: null,
        });
      } catch {
        if (!isActive) {
          return;
        }

        setResumeHistoryState({
          isLoading: false,
          items: [],
          message: null,
          error: "Could not load saved resume analyses right now.",
        });
      }
    }

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [isAuthLoading, isConfigured, userId]);

  function handleSetActiveReport(resumeAnalysis: PersistentResumeAnalysis) {
    const result = setActiveResumeReportFromSavedAnalysis(resumeAnalysis, {
      currentUserId,
    });

    if (!result.ok) {
      setRestoreState({
        status: "error",
        message: result.error,
        activeId: resumeAnalysis.id,
      });
      return;
    }

    setRestoreState({
      status: "success",
      message:
        "Saved resume analysis is now the active dashboard report in this browser.",
      activeId: resumeAnalysis.id,
    });
  }

  function handleRestoreLatestSavedReport() {
    const latestSavedAnalysis = savedResumeAnalyses[0];

    if (!latestSavedAnalysis) {
      setRestoreState({
        status: "error",
        message: "No saved resume analysis is available to restore.",
        activeId: null,
      });
      return;
    }

    handleSetActiveReport(latestSavedAnalysis);
  }

  async function handleDeleteSavedAnalysis() {
    if (!deleteCandidate || deleteState.status === "loading") {
      return;
    }

    const deletedAnalysis = deleteCandidate;

    setDeleteState({
      status: "loading",
      message: "Deleting saved resume analysis from your account.",
      activeId: deletedAnalysis.id,
    });

    const previousItems = resumeHistoryState.items;

    setResumeHistoryState((currentState) => ({
      ...currentState,
      items: currentState.items.filter((item) => item.id !== deletedAnalysis.id),
    }));

    const result = await deleteCurrentUserResumeAnalysis(deletedAnalysis.id);

    if (!result.ok) {
      setResumeHistoryState((currentState) => ({
        ...currentState,
        items: previousItems,
      }));
      setDeleteState({
        status: "error",
        message: result.error,
        activeId: deletedAnalysis.id,
      });
      return;
    }

    if (activeDatabaseId === deletedAnalysis.id) {
      detachActiveResumeSyncStatus(deletedAnalysis.id, {
        currentUserId,
      });
    }

    setDeleteCandidate(null);
    setDeleteState({
      status: "success",
      message:
        "Saved resume analysis deleted from your account. The browser active report was preserved.",
      activeId: deletedAnalysis.id,
    });
  }

  if (!activeAnalysis) {
    return (
      <DashboardLayout>
        <div className="mx-auto max-w-6xl space-y-6">
          <section className={`${premiumHeroSurface} text-center`}>
            <p className={premiumEyebrow}>
              Resume Intelligence
            </p>

            <h1 className="mt-5 text-4xl font-black md:text-5xl">
              No active resume report selected
            </h1>

            <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-slate-600">
              Upload a resume or restore a saved analysis to make it the active
              dashboard report in this browser. Saved analyses are account
              history; they do not become active until you choose one.
            </p>

            <NextBestActionPanel className="mx-auto mt-8 max-w-3xl text-left" />

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
          </section>

          <SavedResumeAnalysesSection
            activeDatabaseId={activeDatabaseId}
            deleteState={deleteState}
            historyState={resumeHistoryState}
            isAuthLoading={isAuthLoading}
            isConfigured={isConfigured}
            isSignedIn={Boolean(userId)}
            onDeleteSaved={setDeleteCandidate}
            onRestoreLatest={handleRestoreLatestSavedReport}
            onSetActive={handleSetActiveReport}
            restoreState={restoreState}
            showRestoreLatestAction
          />

          <DeleteSavedAnalysisDialog
            candidate={deleteCandidate}
            isLoading={deleteState.status === "loading"}
            onClose={() => setDeleteCandidate(null)}
            onConfirm={handleDeleteSavedAnalysis}
          />
        </div>
      </DashboardLayout>
    );
  }

  const extractedTextPreview = getExtractedTextPreview(
    activeAnalysis.extractedText,
  );
  const proofAnalysis = getProofAnalysis(activeAnalysis);
  const visibleExtractedText = showFullExtractedText
    ? activeAnalysis.extractedText.trim() ||
      "No extracted text was returned for this resume."
    : extractedTextPreview.text;

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-6xl">
        <div className={premiumHeroSurface}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className={premiumEyebrow}>
              Resume Intelligence
            </p>

            <h1 className="mt-4 text-4xl font-black md:text-5xl">
              Latest Resume Analysis
            </h1>

            <p className="mt-4 max-w-2xl text-slate-600">
              A safe extraction snapshot from your most recent upload.
            </p>
          </div>

          <Link
            href="/upload"
            className={premiumSecondaryCta}
          >
            Upload Another
          </Link>
        </div>
        </div>

        <NextBestActionPanel className="mt-8" />

        <section className="mt-10 grid gap-4 md:grid-cols-4">
          <SummaryItem
            label="File"
            value={activeAnalysis.fileName}
          />

          <SummaryItem
            label="Size"
            value={formatFileSize(activeAnalysis.fileSize)}
          />

          <SummaryItem
            label="Analyzed"
            value={formatAnalyzedDate(activeAnalysis.analyzedAt)}
          />

          <SummaryItem
            label="Status"
            value={formatStatus(activeAnalysis.status)}
          />
        </section>

        <ResumeSyncStatusCard
          syncStatus={syncStatus}
          databaseLoadState={databaseLoadState}
          hasLocalAnalysis={Boolean(analysis)}
        />

        <SavedResumeAnalysesSection
          activeDatabaseId={activeDatabaseId}
          deleteState={deleteState}
          historyState={resumeHistoryState}
          isAuthLoading={isAuthLoading}
          isConfigured={isConfigured}
          isSignedIn={Boolean(userId)}
          onDeleteSaved={setDeleteCandidate}
          onRestoreLatest={handleRestoreLatestSavedReport}
          onSetActive={handleSetActiveReport}
          restoreState={restoreState}
        />

        <ParsedResumeSections profile={activeAnalysis.parsedProfile} />

        {proofAnalysis && (
          <>
            <ProofCoveragePanel proof={proofAnalysis} />
            <ProofConfidenceExplainer
              proof={proofAnalysis}
              projectCount={activeAnalysis.userProfile?.projects.length ?? 0}
              hasMeasurableImpact={Boolean(
                activeAnalysis.userProfile?.analysisFlags?.hasMeasurableImpact,
              )}
              className="mt-6"
            />
          </>
        )}

        {activeAnalysis.userProfile && (
          <CareerIntelligenceReady
            profile={activeAnalysis.userProfile}
            proof={proofAnalysis}
          />
        )}

        <div className="mt-6">
          <UpgradeInterestCard
            source="resume"
            title="Want Pro-level resume fixes?"
            body="SkillMint is free during beta. Paid plans are not required for this report. Paid beta interest only helps shape deeper bullet rewrites, proof reviews, and coaching-ready fixes."
            cta="Join Pro fixes interest"
          />
        </div>

        <section className={`mt-6 ${premiumSurface}`}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-950">
                Resume processed
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Extraction details are summarized here. Raw extracted text is
                hidden by default because the full text is already used for
                parsing and scoring.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowExtractedText((currentValue) => !currentValue);
                }}
                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
              >
                {showExtractedText
                  ? "Hide extracted text"
                  : "Show extracted text"}
              </button>

              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                {formatStatus(activeAnalysis.status)}
              </span>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ExtractionDetail
              label="File type"
              value={activeAnalysis.fileType}
            />

            <ExtractionDetail
              label="Extraction status"
              value={formatStatus(activeAnalysis.status)}
            />

            <ExtractionDetail
              label="Text length"
              value={formatCharacterCount(extractedTextPreview.fullLength)}
            />

            <ExtractionDetail
              label="Analysis input"
              value="Full text used"
            />
          </div>

          {showExtractedText && (
            <>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-slate-600">
                  {extractedTextPreview.isTruncated &&
                    !showFullExtractedText
                    ? "Showing preview only. Full extracted text is used for analysis."
                    : "Full extracted text is used for analysis."}
                </p>

                {extractedTextPreview.isTruncated && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowFullExtractedText((currentValue) =>
                        !currentValue,
                      );
                    }}
                    className="w-fit rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
                  >
                    {showFullExtractedText ? "Show less" : "Show more"}
                  </button>
                )}
              </div>

              {extractedTextPreview.isTruncated &&
                !showFullExtractedText && (
                  <p className="mt-2 text-xs text-slate-500">
                    Preview limited to{" "}
                    {EXTRACTED_TEXT_PREVIEW_LIMIT.toLocaleString()} of{" "}
                    {extractedTextPreview.fullLength.toLocaleString()}{" "}
                    characters.
                  </p>
                )}

              <pre className="mt-5 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-2xl border border-slate-200 bg-slate-950 p-5 text-sm leading-7 text-slate-100">
                {visibleExtractedText}
              </pre>
            </>
          )}
        </section>

        <DeleteSavedAnalysisDialog
          candidate={deleteCandidate}
          isLoading={deleteState.status === "loading"}
          onClose={() => setDeleteCandidate(null)}
          onConfirm={handleDeleteSavedAnalysis}
        />
      </section>
    </DashboardLayout>
  );
}

type ExtractionDetailProps = {
  label: string;
  value: string;
};

function ExtractionDetail({ label, value }: ExtractionDetailProps) {
  return (
    <div className={premiumInsetSurface}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-bold text-slate-950">
        {value}
      </p>
    </div>
  );
}

type ResumeSyncStatusCardProps = {
  syncStatus: ResumeSyncStatus | null;
  databaseLoadState: DatabaseLoadState;
  hasLocalAnalysis: boolean;
};

type SavedResumeAnalysesSectionProps = {
  activeDatabaseId: string | null;
  deleteState: DeleteSavedAnalysisState;
  historyState: ResumeHistoryState;
  isAuthLoading: boolean;
  isConfigured: boolean;
  isSignedIn: boolean;
  onDeleteSaved: (resumeAnalysis: PersistentResumeAnalysis) => void;
  onRestoreLatest: () => void;
  onSetActive: (resumeAnalysis: PersistentResumeAnalysis) => void;
  restoreState: RestoreState;
  showRestoreLatestAction?: boolean;
};

function SavedResumeAnalysesSection({
  activeDatabaseId,
  deleteState,
  historyState,
  isAuthLoading,
  isConfigured,
  isSignedIn,
  onDeleteSaved,
  onRestoreLatest,
  onSetActive,
  restoreState,
  showRestoreLatestAction = false,
}: SavedResumeAnalysesSectionProps) {
  const [showOlderAnalyses, setShowOlderAnalyses] = useState(false);
  const historyItems = isConfigured && isSignedIn
    ? historyState.items
    : [];
  const latestSavedAnalysis = historyItems[0] ?? null;
  const canRestoreLatest =
    Boolean(latestSavedAnalysis) &&
    latestSavedAnalysis?.id !== activeDatabaseId;
  const activeSavedAnalysis = historyItems.find(
    (resumeAnalysis) => resumeAnalysis.id === activeDatabaseId,
  ) ?? null;
  const nonActiveHistoryItems = historyItems.filter(
    (resumeAnalysis) => resumeAnalysis.id !== activeDatabaseId,
  );
  const visibleNonActiveItems = showOlderAnalyses
    ? nonActiveHistoryItems
    : nonActiveHistoryItems.slice(0, 4);
  const latestNonActiveId = nonActiveHistoryItems[0]?.id ?? null;
  const hasOlderAnalyses = nonActiveHistoryItems.length > 4;
  const displayItems = [
    ...(activeSavedAnalysis ? [activeSavedAnalysis] : []),
    ...visibleNonActiveItems,
  ];

  return (
    <section className={`mt-6 ${premiumSurface}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className={premiumEyebrow}>
            Resume History
          </p>

          <h2 className="mt-2 text-2xl font-black">
            Saved resume analyses
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Saved analyses are account history. The dashboard only shows
            metrics for the active report loaded in this browser.
          </p>
        </div>

        {showRestoreLatestAction && canRestoreLatest && (
          <button
            type="button"
            onClick={onRestoreLatest}
            className={premiumPrimaryCta}
          >
            Restore latest saved report
          </button>
        )}
      </div>

      <ResumeHistoryStatus
        historyState={historyState}
        isAuthLoading={isAuthLoading}
        isConfigured={isConfigured}
        isSignedIn={isSignedIn}
      />

      {restoreState.message && (
        <p
          className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${
            restoreState.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {restoreState.message}
        </p>
      )}

      {deleteState.message && (
        <p
          className={`mt-4 rounded-2xl border p-4 text-sm leading-6 ${
            deleteState.status === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : deleteState.status === "error"
                ? "border-rose-200 bg-rose-50 text-rose-800"
                : "border-slate-200 bg-slate-50 text-slate-700"
          }`}
        >
          {deleteState.message}
        </p>
      )}

      {historyItems.length > 0 && (
        <>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-slate-600">
              Showing {displayItems.length} of {historyItems.length} saved
              analyses.
            </p>

            {hasOlderAnalyses && (
              <button
                type="button"
                onClick={() => setShowOlderAnalyses((current) => !current)}
                className={premiumSecondaryCta}
              >
                {showOlderAnalyses ? "Show fewer" : "Show older analyses"}
              </button>
            )}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {displayItems.map((resumeAnalysis) => (
              <SavedResumeAnalysisCard
                key={resumeAnalysis.id}
                activeDatabaseId={activeDatabaseId}
                badgeLabel={getSavedAnalysisBadgeLabel({
                  activeDatabaseId,
                  latestNonActiveId,
                  resumeAnalysisId: resumeAnalysis.id,
                })}
                deleteState={deleteState}
                onDeleteSaved={onDeleteSaved}
                onSetActive={onSetActive}
                resumeAnalysis={resumeAnalysis}
                restoreState={restoreState}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

type ResumeHistoryStatusProps = {
  historyState: ResumeHistoryState;
  isAuthLoading: boolean;
  isConfigured: boolean;
  isSignedIn: boolean;
};

function ResumeHistoryStatus({
  historyState,
  isAuthLoading,
  isConfigured,
  isSignedIn,
}: ResumeHistoryStatusProps) {
  const presentation = getResumeHistoryPresentation({
    historyState,
    isAuthLoading,
    isConfigured,
    isSignedIn,
  });

  if (!presentation) {
    return null;
  }

  return (
    <div className={`mt-5 rounded-2xl border p-4 ${presentation.className}`}>
      <p className="text-sm font-semibold text-slate-950">
        {presentation.title}
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-700">
        {presentation.message}
      </p>
    </div>
  );
}

function getResumeHistoryPresentation({
  historyState,
  isAuthLoading,
  isConfigured,
  isSignedIn,
}: ResumeHistoryStatusProps): {
  title: string;
  message: string;
  className: string;
} | null {
  if (isAuthLoading || historyState.isLoading) {
    return {
      title: "Checking saved analyses",
      message: "Looking for resume analyses saved to your account.",
      className: "border-slate-200 bg-slate-50",
    };
  }

  if (!isConfigured) {
    return {
      title: "Account sync unavailable",
      message:
        "Resume history needs account sync. Upload and active reports still work in this browser.",
      className: "border-amber-200 bg-amber-50",
    };
  }

  if (!isSignedIn) {
    return {
      title: "Sign in to view saved analyses",
      message:
        "Browser reports still work here. Sign in to see resume analyses saved to your account.",
      className: "border-slate-200 bg-slate-50",
    };
  }

  if (historyState.error) {
    return {
      title: "Saved analyses unavailable",
      message: historyState.error,
      className: "border-rose-200 bg-rose-50",
    };
  }

  if (!historyState.items.length) {
    return {
      title: "No saved resume analyses yet",
      message:
        "Upload a resume while signed in to save analyses to your account history.",
      className: "border-slate-200 bg-slate-50",
    };
  }

  return null;
}

type SavedResumeAnalysisCardProps = {
  activeDatabaseId: string | null;
  badgeLabel: "Current active report" | "Latest saved" | "Saved";
  deleteState: DeleteSavedAnalysisState;
  onDeleteSaved: (resumeAnalysis: PersistentResumeAnalysis) => void;
  onSetActive: (resumeAnalysis: PersistentResumeAnalysis) => void;
  resumeAnalysis: PersistentResumeAnalysis;
  restoreState: RestoreState;
};

function SavedResumeAnalysisCard({
  activeDatabaseId,
  badgeLabel,
  deleteState,
  onDeleteSaved,
  onSetActive,
  resumeAnalysis,
  restoreState,
}: SavedResumeAnalysisCardProps) {
  const userProfile = isUserProfile(resumeAnalysis.userProfile)
    ? resumeAnalysis.userProfile
    : null;
  const isActive = activeDatabaseId === resumeAnalysis.id;
  const isCurrentRestoreTarget = restoreState.activeId === resumeAnalysis.id;
  const isDeleting =
    deleteState.status === "loading" &&
    deleteState.activeId === resumeAnalysis.id;
  const topProfileFitRole = userProfile
    ? calculateRoleMatches(userProfile)[0]?.role ?? "Not enough role signals"
    : "Missing report data";

  return (
    <article
      className={`min-w-0 rounded-2xl border p-5 ${
        isActive
          ? "border-emerald-300 bg-emerald-50 shadow-[0_12px_34px_rgba(15,23,42,0.07)]"
          : "border-slate-200 bg-white shadow-[0_8px_24px_rgba(15,23,42,0.04)]"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-bold text-slate-950">
            {resumeAnalysis.fileName || "Untitled resume"}
          </h3>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Analyzed {formatAnalyzedDate(resumeAnalysis.createdAt)}
          </p>
        </div>

        <span
          className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${
            isActive
              ? "border-emerald-300 bg-white text-emerald-800"
              : "border-slate-200 bg-slate-50 text-slate-600"
          }`}
        >
          {badgeLabel}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <SavedResumeMeta
          label="Target role"
          value="No target stored"
        />

        <SavedResumeMeta
          label="Top Profile-fit role"
          value={topProfileFitRole}
        />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => onSetActive(resumeAnalysis)}
          disabled={isActive || !userProfile}
          className="rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-800 transition hover:border-emerald-400 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
        >
          {isActive
            ? "Current active report"
            : userProfile
              ? "Set as active report"
              : "Missing report data"}
        </button>

        {isActive && (
          <Link
            href="/dashboard"
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
          >
            View dashboard
          </Link>
        )}

        {isCurrentRestoreTarget && restoreState.status === "error" && (
          <span className="text-sm text-rose-700">
            Restore failed
          </span>
        )}

        <button
          type="button"
          onClick={() => onDeleteSaved(resumeAnalysis)}
          disabled={isDeleting}
          className={`${premiumDangerCta} px-4 py-2.5 text-sm`}
        >
          {isDeleting ? "Deleting..." : "Delete saved analysis"}
        </button>
      </div>
    </article>
  );
}

function DeleteSavedAnalysisDialog({
  candidate,
  isLoading,
  onClose,
  onConfirm,
}: {
  candidate: PersistentResumeAnalysis | null;
  isLoading: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <ConfirmDialog
      isOpen={Boolean(candidate)}
      title="Delete saved resume analysis"
      confirmLabel="Delete saved analysis"
      isProcessing={isLoading}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <p>
        This deletes this saved resume analysis from your SkillMint account.
        It does not delete your account, feedback, or unrelated saved records.
      </p>

      {candidate && (
        <p className="mt-3 break-words rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-950">
          {candidate.fileName || "Untitled resume"} - analyzed{" "}
          {formatAnalyzedDate(candidate.createdAt)}
        </p>
      )}

      <p className="mt-3">
        If this saved analysis is referenced by the current browser report,
        SkillMint will detach only that broken synced reference and keep the
        browser report local.
      </p>
    </ConfirmDialog>
  );
}

function getSavedAnalysisBadgeLabel({
  activeDatabaseId,
  latestNonActiveId,
  resumeAnalysisId,
}: {
  activeDatabaseId: string | null;
  latestNonActiveId: string | null;
  resumeAnalysisId: string;
}): "Current active report" | "Latest saved" | "Saved" {
  if (activeDatabaseId === resumeAnalysisId) {
    return "Current active report";
  }

  if (latestNonActiveId === resumeAnalysisId) {
    return "Latest saved";
  }

  return "Saved";
}

type SavedResumeMetaProps = {
  label: string;
  value: string;
};

function SavedResumeMeta({ label, value }: SavedResumeMetaProps) {
  return (
    <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-semibold text-slate-950">
        {value}
      </p>
    </div>
  );
}

function ResumeSyncStatusCard({
  syncStatus,
  databaseLoadState,
  hasLocalAnalysis,
}: ResumeSyncStatusCardProps) {
  const presentation = getResumeSyncPresentation(
    syncStatus,
    databaseLoadState,
    hasLocalAnalysis,
  );

  return (
    <section
      className={`mt-6 rounded-2xl border p-5 ${presentation.className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {presentation.title}
          </p>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
            {presentation.message}
          </p>
        </div>

        {presentation.badge && (
          <span className="w-fit rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
            {presentation.badge}
          </span>
        )}
      </div>
    </section>
  );
}

type CareerIntelligenceReadyProps = {
  profile: UserProfile;
  proof: ProofScoreResult | null;
};

function CareerIntelligenceReady({
  profile,
  proof,
}: CareerIntelligenceReadyProps) {
  const scores = [
    {
      label: "Structure Signal",
      value: scaleSignal(profile.resumeScore, 20),
      detail: "Resume sections, clarity, and parseable structure.",
    },
    {
      label: "Skills Detection",
      value: scaleSignal(profile.skillsScore, 15),
      detail: "Skills detected in the resume text.",
    },
    {
      label: "Project Detection",
      value: scaleSignal(profile.projectsScore, 15),
      detail: "Project entries and implementation detail detected.",
    },
    {
      label: "Experience Signal",
      value: scaleSignal(profile.experienceScore, 12),
      detail: "Internship, work, freelance, or role context.",
    },
    {
      label: "Education Signal",
      value: scaleSignal(profile.educationScore, 10),
      detail: "Education section clarity and relevance.",
    },
    {
      label: "ATS Base Signal",
      value: scaleSignal(profile.atsScore, 5),
      detail: "Resume structure before job-specific matching.",
    },
    {
      label: "Recruiter Base Signal",
      value: scaleSignal(profile.recruiterScore, 5),
      detail: "Initial shortlisting signal before proof verification.",
    },
    ...(proof
      ? [
          {
            label: "Proof Confidence",
            value: proof.proofConfidenceScore,
            detail: "Claims supported by evidence candidates.",
          },
        ]
      : []),
  ];

  return (
    <section className={`mt-6 ${premiumSurface}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className={premiumEyebrow}>
            Resume Detection
          </p>

          <h2 className="mt-2 text-xl font-bold">
            Base Resume Signals
          </h2>
        </div>

        <p className="max-w-2xl text-sm leading-6 text-slate-600">
          Base signals show what SkillMint detected in the resume. Proof
          Confidence shows what is supported by evidence candidates.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {scores.map((score) => (
          <BaseSignalCard
            key={score.label}
            label={score.label}
            value={score.value}
            detail={score.detail}
          />
        ))}
      </div>
    </section>
  );
}

type BaseSignalCardProps = {
  label: string;
  value: number;
  detail: string;
};

function BaseSignalCard({
  label,
  value,
  detail,
}: BaseSignalCardProps) {
  const normalizedValue = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-2xl font-black text-slate-950">
        {normalizedValue} <span className="text-sm text-slate-500">/100</span>
      </p>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-emerald-700"
          style={{ width: `${normalizedValue}%` }}
        />
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500">
        {detail}
      </p>
    </article>
  );
}

function scaleSignal(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

type ProofCoveragePanelProps = {
  proof: ProofScoreResult;
};

function ProofCoveragePanel({ proof }: ProofCoveragePanelProps) {
  const proofStats = [
    {
      label: "Evidence-backed",
      value: proof.evidenceBackedSkills.length,
      detail: "skills",
    },
    {
      label: "Weakly supported",
      value: proof.weaklySupportedSkills.length,
      detail: "skills",
    },
    {
      label: "Unverified",
      value: proof.unverifiedSkills.length,
      detail: "claims",
    },
    {
      label: "Proof links",
      value: proof.extractedProofLinks.length,
      detail: "candidates",
    },
  ];

  return (
    <section className={`mt-6 ${premiumSurface}`}>
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className={premiumEyebrow}>
            Proof Confidence
          </p>

          <h2 className="mt-2 text-2xl font-black">
            {proof.proofConfidenceScore}% · {proof.proofCoverageLabel}
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            {proof.proofSummary} Missing proof means unverified, not false.
          </p>
        </div>

        <span className={`w-fit rounded-full border px-3 py-1 text-xs font-bold ${
          getProofBadgeClassName(proof.proofCoverageLabel)
        }`}
        >
          Evidence candidates, not verified sources
        </span>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {proofStats.map((stat) => (
          <article
            key={stat.label}
            className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
              {stat.label}
            </p>

            <p className="mt-2 text-2xl font-black text-slate-950">
              {stat.value}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {stat.detail}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        <ProofInsight
          label="Strongest evidence"
          value={proof.strongestEvidence}
        />

        <ProofInsight
          label="Weakest evidence"
          value={proof.weakestEvidence}
        />

        <ProofInsight
          label="Next proof move"
          value={proof.nextProofMove}
        />
      </div>

      <p className="mt-5 text-sm leading-6 text-slate-500">
        Based on resume structure, parsed projects, claimed skills, and links
        extracted from the resume. SkillMint does not scan external sources yet.
      </p>
    </section>
  );
}

type ProofInsightProps = {
  label: string;
  value: string;
};

function ProofInsight({ label, value }: ProofInsightProps) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-700">
        {value}
      </p>
    </article>
  );
}

type ParsedResumeSectionsProps = {
  profile: ResumeAnalysisResult["parsedProfile"];
};

function ParsedResumeSections({
  profile,
}: ParsedResumeSectionsProps) {
  const links = getVisibleLinks(profile.links);

  return (
    <section className={`mt-6 ${premiumSurface}`}>
      <div>
        <h2 className="text-xl font-bold text-slate-950">
          Parsed Resume Sections
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Rule-based signals detected from your extracted resume text.
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <SectionPanel title="Skills">
          {profile.skills.length ? (
            <div className="flex flex-wrap gap-2">
              {profile.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-800"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <EmptyDetection />
          )}
        </SectionPanel>

        <SectionPanel title="Links">
          {links.length ? (
            <div className="flex flex-wrap gap-2">
              {links.map((link) => (
                <a
                  key={`${link.label}-${link.value}`}
                  href={link.href}
                  target={link.external ? "_blank" : undefined}
                  rel={link.external ? "noreferrer" : undefined}
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
                >
                  {link.label}
                </a>
              ))}
            </div>
          ) : (
            <EmptyDetection />
          )}
        </SectionPanel>

        <SectionPanel title="Projects">
          <ParsedList items={profile.projects} />
        </SectionPanel>

        <SectionPanel title="Experience">
          <ParsedList items={profile.experience} />
        </SectionPanel>

        <SectionPanel title="Education">
          <ParsedList items={profile.education} />
        </SectionPanel>

        <SectionPanel title="Certifications">
          <ParsedList items={profile.certifications} />
        </SectionPanel>
      </div>
    </section>
  );
}

type SectionPanelProps = {
  title: string;
  children: React.ReactNode;
};

function SectionPanel({
  title,
  children,
}: SectionPanelProps) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </h3>

      <div className="mt-4">
        {children}
      </div>
    </article>
  );
}

type ParsedListProps = {
  items: string[];
};

function ParsedList({ items }: ParsedListProps) {
  if (!items.length) {
    return <EmptyDetection />;
  }

  return (
    <ul className="space-y-3 text-sm leading-6 text-slate-700">
      {items.map((item) => (
        <li
          key={item}
          className="break-words border-l border-emerald-300 pl-3"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function EmptyDetection() {
  return (
    <p className="text-sm text-slate-500">
      Not detected yet
    </p>
  );
}

type SummaryItemProps = {
  label: string;
  value: string;
};

function SummaryItem({
  label,
  value,
}: SummaryItemProps) {
  return (
    <article className={premiumCompactSurface}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </p>

      <p className="mt-3 break-words text-lg font-bold text-slate-950">
        {value}
      </p>
    </article>
  );
}

function getResumeSyncPresentation(
  syncStatus: ResumeSyncStatus | null,
  databaseLoadState: DatabaseLoadState,
  hasLocalAnalysis: boolean,
): {
  title: string;
  message: string;
  badge: string | null;
  className: string;
} {
  if (databaseLoadState.isLoading) {
    return {
      title: "Account sync",
      message: "Checking account resume backup...",
      badge: "Checking",
      className: "border-slate-200 bg-slate-50",
    };
  }

  if (databaseLoadState.message && !hasLocalAnalysis) {
    const restored =
      databaseLoadState.message.includes("Loaded latest resume analysis");

    return {
      title: "Account sync",
      message: databaseLoadState.message,
      badge: restored ? "Synced" : "Notice",
      className: restored
        ? "border-emerald-200 bg-emerald-50"
        : "border-amber-200 bg-amber-50",
    };
  }

  if (syncStatus?.status === "synced") {
    return {
      title: "Synced to account",
      message: syncStatus.syncedAt
        ? `${syncStatus.message} Last sync: ${formatAnalyzedDate(
          syncStatus.syncedAt,
        )}.`
        : syncStatus.message,
      badge: "Synced",
      className: "border-emerald-200 bg-emerald-50",
    };
  }

  if (syncStatus?.status === "local-only") {
    return {
      title: "Saved in this browser",
      message: syncStatus.message,
      badge: "Browser",
      className: "border-amber-200 bg-amber-50",
    };
  }

  return {
    title: "Resume storage",
    message:
      "Latest resume is saved in this browser. Signed-in users can save it to their account after analysis.",
    badge: null,
    className: "border-slate-200 bg-slate-50",
  };
}

function getExtractedTextPreview(
  extractedText: string,
): ExtractedTextPreview {
  const normalizedText = extractedText.trim();

  if (!normalizedText) {
    return {
      text: "No extracted text was returned for this resume.",
      isTruncated: false,
      fullLength: 0,
    };
  }

  if (normalizedText.length <= EXTRACTED_TEXT_PREVIEW_LIMIT) {
    return {
      text: normalizedText,
      isTruncated: false,
      fullLength: normalizedText.length,
    };
  }

  return {
    text: `${normalizedText.slice(0, EXTRACTED_TEXT_PREVIEW_LIMIT)}...`,
    isTruncated: true,
    fullLength: normalizedText.length,
  };
}

function formatFileSize(fileSize: number): string {
  if (!Number.isFinite(fileSize) || fileSize <= 0) {
    return "Unknown";
  }

  return `${(fileSize / 1024 / 1024).toFixed(2)} MB`;
}

function formatAnalyzedDate(analyzedAt: string): string {
  const date = new Date(analyzedAt);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatStatus(status: string): string {
  return status
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function getProofAnalysis(
  analysis: ResumeAnalysisView,
): ProofScoreResult | null {
  if (isProofScoreResult(analysis.proofAnalysis)) {
    return analysis.proofAnalysis;
  }

  if (!analysis.userProfile) {
    return null;
  }

  return generateProofScore({
    profile: analysis.userProfile,
    parsedProfile: analysis.parsedProfile,
    resumeText: analysis.extractedText,
  });
}

function getProofBadgeClassName(label: ProofCoverageLabel): string {
  if (label === "Strong") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (label === "Moderate") {
    return "border-sky-200 bg-sky-50 text-sky-800";
  }

  if (label === "Weak") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  return "border-rose-200 bg-rose-50 text-rose-800";
}

function formatCharacterCount(characterCount: number): string {
  if (!Number.isFinite(characterCount) || characterCount <= 0) {
    return "No text";
  }

  return `${characterCount.toLocaleString()} chars`;
}

function isResumeAnalysisResult(
  value: unknown,
): value is ResumeAnalysisView {
  if (!value || typeof value !== "object") {
    return false;
  }

  const analysis = value as Record<string, unknown>;

  return (
    typeof analysis.fileName === "string" &&
    typeof analysis.fileType === "string" &&
    typeof analysis.fileSize === "number" &&
    typeof analysis.extractedText === "string" &&
    isParsedResumeProfile(analysis.parsedProfile) &&
    isUserProfile(analysis.userProfile) &&
    typeof analysis.analyzedAt === "string" &&
    typeof analysis.status === "string"
  );
}

function isLegacyResumeAnalysisResult(
  value: unknown,
): value is Omit<
  ResumeAnalysisView,
  "parsedProfile" | "userProfile"
> & {
  parsedProfile?: ResumeAnalysisResult["parsedProfile"];
} {
  if (!value || typeof value !== "object") {
    return false;
  }

  const analysis = value as Record<string, unknown>;

  return (
    typeof analysis.fileName === "string" &&
    typeof analysis.fileType === "string" &&
    typeof analysis.fileSize === "number" &&
    typeof analysis.extractedText === "string" &&
    typeof analysis.analyzedAt === "string" &&
    typeof analysis.status === "string"
  );
}

function isParsedResumeProfile(
  value: unknown,
): value is ResumeAnalysisResult["parsedProfile"] {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Record<string, unknown>;

  return (
    isStringArray(profile.skills) &&
    isStringArray(profile.projects) &&
    isStringArray(profile.education) &&
    isStringArray(profile.experience) &&
    isStringArray(profile.certifications) &&
    isRecord(profile.links) &&
    isRecord(profile.rawSections)
  );
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Record<string, unknown>;

  return (
    isNumber(profile.resumeScore) &&
    isNumber(profile.skillsScore) &&
    isNumber(profile.projectsScore) &&
    isNumber(profile.experienceScore) &&
    isNumber(profile.educationScore) &&
    isNumber(profile.githubScore) &&
    isNumber(profile.linkedinScore) &&
    isNumber(profile.atsScore) &&
    isNumber(profile.recruiterScore) &&
    isNumber(profile.activityScore) &&
    isStringArray(profile.skills) &&
    isStringArray(profile.projects) &&
    isStringArray(profile.experience) &&
    typeof profile.education === "string" &&
    Array.isArray(profile.certifications) &&
    Array.isArray(profile.codingProfiles)
  );
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" &&
    !Array.isArray(value);
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

function readStoredSyncStatus(
  currentUserId: string | null | undefined,
): string | null {
  return readResumeSyncStatusSnapshot({
    currentUserId,
  });
}

function getServerSnapshot(): null {
  return null;
}

function parseStoredAnalysis(
  storedAnalysis: string | null,
): ResumeAnalysisView | null {
  if (!storedAnalysis) {
    return null;
  }

  try {
    const parsedAnalysis = JSON.parse(storedAnalysis);

    if (isResumeAnalysisResult(parsedAnalysis)) {
      return parsedAnalysis;
    }

    if (isLegacyResumeAnalysisResult(parsedAnalysis)) {
      return {
        ...parsedAnalysis,
        parsedProfile: isParsedResumeProfile(
          parsedAnalysis.parsedProfile,
        )
          ? parsedAnalysis.parsedProfile
          : EMPTY_PARSED_PROFILE,
      };
    }

    return null;
  } catch {
    return null;
  }
}

function parseStoredSyncStatus(
  storedSyncStatus: string | null,
): ResumeSyncStatus | null {
  if (!storedSyncStatus) {
    return null;
  }

  try {
    const parsedStatus = JSON.parse(storedSyncStatus);

    return isResumeSyncStatus(parsedStatus) ? parsedStatus : null;
  } catch {
    return null;
  }
}

function isResumeSyncStatus(
  value: unknown,
): value is ResumeSyncStatus {
  if (!value || typeof value !== "object") {
    return false;
  }

  const status = value as Record<string, unknown>;

  return (
    (status.status === "synced" || status.status === "local-only") &&
    typeof status.message === "string" &&
    (
      status.syncedAt === undefined ||
      typeof status.syncedAt === "string"
    ) &&
    (
      status.databaseId === undefined ||
      typeof status.databaseId === "string"
    )
  );
}

function isProofScoreResult(value: unknown): value is ProofScoreResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNumber(value.proofConfidenceScore) &&
    isProofCoverageLabel(value.proofCoverageLabel) &&
    typeof value.proofSummary === "string" &&
    Array.isArray(value.extractedProofLinks) &&
    isRecord(value.linkTypeCounts) &&
    isStringArray(value.evidenceBackedSkills) &&
    isStringArray(value.weaklySupportedSkills) &&
    isStringArray(value.unverifiedSkills) &&
    Array.isArray(value.skillClassifications) &&
    typeof value.strongestEvidence === "string" &&
    typeof value.weakestEvidence === "string" &&
    typeof value.nextProofMove === "string" &&
    isStringArray(value.scoringReasons)
  );
}

function isProofCoverageLabel(value: unknown): value is ProofCoverageLabel {
  return value === "Strong" ||
    value === "Moderate" ||
    value === "Weak" ||
    value === "Missing";
}

type VisibleLink = {
  label: string;
  value: string;
  href: string;
  external: boolean;
};

function getVisibleLinks(
  links: ResumeAnalysisResult["parsedProfile"]["links"],
): VisibleLink[] {
  return Object.entries(LINK_LABELS).flatMap(([key, label]) => {
    const linkKey =
      key as keyof ResumeAnalysisResult["parsedProfile"]["links"];
    const value = links[linkKey];

    if (!value) {
      return [];
    }

    return [
      {
        label,
        value,
        href: getLinkHref(linkKey, value),
        external: linkKey !== "email" && linkKey !== "phone",
      },
    ];
  });
}

function getLinkHref(
  key: keyof ResumeAnalysisResult["parsedProfile"]["links"],
  value: string,
): string {
  if (key === "email") {
    return `mailto:${value}`;
  }

  if (key === "phone") {
    return `tel:${value.replace(/[^\d+]/g, "")}`;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}
