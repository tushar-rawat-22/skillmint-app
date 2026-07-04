"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import type { ResumeAnalysisResult } from "@/lib/resume/analyzeResume";
import type { UserProfile } from "@/intelligence/types/profile";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import {
  getLatestCurrentUserResumeAnalysis,
  type PersistentResumeAnalysis,
} from "@/modules/resume";

const RESUME_ANALYSIS_STORAGE_KEY = "skillmint:resume-analysis";
const RESUME_SYNC_STATUS_STORAGE_KEY = "skillmint:resume-sync-status";

type ResumeAnalysisView = Omit<
  ResumeAnalysisResult,
  "parsedProfile" | "userProfile"
> & {
  parsedProfile: ResumeAnalysisResult["parsedProfile"];
  userProfile?: UserProfile;
};

type ResumeSyncStatus = {
  status: "synced" | "local-only";
  message: string;
  syncedAt?: string;
  databaseId?: string;
};

type DatabaseLoadState = {
  isLoading: boolean;
  message: string | null;
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
  const storedAnalysis = useSyncExternalStore(
    subscribeToStoredAnalysis,
    readStoredAnalysis,
    getServerSnapshot,
  );
  const storedSyncStatus = useSyncExternalStore(
    subscribeToStoredAnalysis,
    readStoredSyncStatus,
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
  const {
    user,
    isConfigured,
    isLoading: isAuthLoading,
  } = useAuthSession();
  const userId = user?.id ?? null;
  const [databaseAnalysis, setDatabaseAnalysis] =
    useState<ResumeAnalysisView | null>(null);
  const [databaseLoadState, setDatabaseLoadState] =
    useState<DatabaseLoadState>({
      isLoading: false,
      message: null,
    });
  const [showExtractedText, setShowExtractedText] = useState(false);
  const [showFullExtractedText, setShowFullExtractedText] =
    useState(false);
  const activeAnalysis = analysis ?? databaseAnalysis;

  useEffect(() => {
    if (analysis || !isConfigured || isAuthLoading || !userId) {
      return;
    }

    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      void loadLatestResumeAnalysisFromDatabase();
    }, 0);

    async function loadLatestResumeAnalysisFromDatabase() {
      if (!isActive) {
        return;
      }

      setDatabaseLoadState({
        isLoading: true,
        message: null,
      });

      try {
        const result = await getLatestCurrentUserResumeAnalysis();

        if (!isActive) {
          return;
        }

        if (!result.ok) {
          setDatabaseLoadState({
            isLoading: false,
            message: result.error,
          });
          return;
        }

        if (!result.data) {
          setDatabaseLoadState({
            isLoading: false,
            message: "No saved resume analysis found in your account yet.",
          });
          return;
        }

        const restoredAnalysis = mapPersistentResumeAnalysisToView(
          result.data,
        );

        if (!restoredAnalysis) {
          setDatabaseLoadState({
            isLoading: false,
            message:
              "A saved resume analysis exists, but it is missing data needed for this report.",
          });
          return;
        }

        setDatabaseAnalysis(restoredAnalysis);
        persistRestoredAnalysis(restoredAnalysis);
        writeResumeSyncStatus({
          status: "synced",
          message: "Loaded latest resume analysis from your account.",
          syncedAt: new Date().toISOString(),
          databaseId: result.data.id,
        });
        setDatabaseLoadState({
          isLoading: false,
          message: "Loaded latest resume analysis from your account.",
        });
      } catch {
        if (!isActive) {
          return;
        }

        setDatabaseLoadState({
          isLoading: false,
          message: "Could not load the saved resume analysis right now.",
        });
      }
    }

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [analysis, isAuthLoading, isConfigured, userId]);

  if (!activeAnalysis) {
    return (
      <DashboardLayout>
        <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-green-400">
            Resume Intelligence
          </p>

          <h1 className="mt-5 text-4xl font-black md:text-5xl">
            No resume analysis yet
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-400">
            Upload a resume to create your latest SkillMint extraction
            snapshot. If you are not sure what role to aim for yet, start
            with career setup first.
          </p>

          {(databaseLoadState.isLoading || databaseLoadState.message) && (
            <ResumeDatabaseLoadNotice state={databaseLoadState} />
          )}

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
        </section>
      </DashboardLayout>
    );
  }

  const extractedTextPreview = getExtractedTextPreview(
    activeAnalysis.extractedText,
  );
  const visibleExtractedText = showFullExtractedText
    ? activeAnalysis.extractedText.trim() ||
      "No extracted text was returned for this resume."
    : extractedTextPreview.text;

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-green-400">
              Resume Intelligence
            </p>

            <h1 className="mt-4 text-4xl font-black md:text-5xl">
              Latest Resume Analysis
            </h1>

            <p className="mt-4 max-w-2xl text-gray-400">
              A safe extraction snapshot from your most recent upload.
            </p>
          </div>

          <Link
            href="/upload"
            className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-100 transition hover:border-green-500 hover:text-green-300"
          >
            Upload Another
          </Link>
        </div>

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

        <ParsedResumeSections profile={activeAnalysis.parsedProfile} />

        {activeAnalysis.userProfile && (
          <CareerIntelligenceReady
            profile={activeAnalysis.userProfile}
          />
        )}

        <section className="mt-6 rounded-lg border border-gray-800 bg-neutral-900 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Resume processed
              </h2>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-400">
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
                className="rounded-full border border-gray-700 px-3 py-1 text-xs font-semibold text-gray-100 transition hover:border-green-500 hover:text-green-300"
              >
                {showExtractedText
                  ? "Hide extracted text"
                  : "Show extracted text"}
              </button>

              <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300">
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
                <p className="text-sm leading-6 text-gray-400">
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
                    className="w-fit rounded-full border border-gray-700 px-3 py-1 text-xs font-semibold text-gray-100 transition hover:border-green-500 hover:text-green-300"
                  >
                    {showFullExtractedText ? "Show less" : "Show more"}
                  </button>
                )}
              </div>

              {extractedTextPreview.isTruncated &&
                !showFullExtractedText && (
                  <p className="mt-2 text-xs text-gray-500">
                    Preview limited to{" "}
                    {EXTRACTED_TEXT_PREVIEW_LIMIT.toLocaleString()} of{" "}
                    {extractedTextPreview.fullLength.toLocaleString()}{" "}
                    characters.
                  </p>
                )}

              <pre className="mt-5 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/40 p-5 text-sm leading-7 text-gray-200">
                {visibleExtractedText}
              </pre>
            </>
          )}
        </section>
      </section>
    </DashboardLayout>
  );
}

type ResumeDatabaseLoadNoticeProps = {
  state: DatabaseLoadState;
};

type ExtractionDetailProps = {
  label: string;
  value: string;
};

function ExtractionDetail({ label, value }: ExtractionDetailProps) {
  return (
    <div className="min-w-0 rounded-lg border border-gray-800 bg-black/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </p>

      <p className="mt-2 truncate text-sm font-bold text-gray-100">
        {value}
      </p>
    </div>
  );
}

function ResumeDatabaseLoadNotice({
  state,
}: ResumeDatabaseLoadNoticeProps) {
  return (
    <div className="mt-6 w-full rounded-lg border border-gray-800 bg-neutral-900 p-4 text-left">
      <p className="text-sm font-semibold text-gray-100">
        Account resume backup
      </p>

      <p className="mt-2 text-sm leading-6 text-gray-400">
        {state.isLoading
          ? "Checking your account for the latest saved resume analysis."
          : state.message}
      </p>
    </div>
  );
}

type ResumeSyncStatusCardProps = {
  syncStatus: ResumeSyncStatus | null;
  databaseLoadState: DatabaseLoadState;
  hasLocalAnalysis: boolean;
};

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
      className={`mt-6 rounded-lg border p-5 ${presentation.className}`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">
            {presentation.title}
          </p>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
            {presentation.message}
          </p>
        </div>

        {presentation.badge && (
          <span className="w-fit rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-gray-200">
            {presentation.badge}
          </span>
        )}
      </div>
    </section>
  );
}

type CareerIntelligenceReadyProps = {
  profile: UserProfile;
};

function CareerIntelligenceReady({
  profile,
}: CareerIntelligenceReadyProps) {
  const scores = [
    {
      label: "Resume Score",
      value: `${profile.resumeScore}/20`,
    },
    {
      label: "Skills Score",
      value: `${profile.skillsScore}/15`,
    },
    {
      label: "Projects Score",
      value: `${profile.projectsScore}/15`,
    },
    {
      label: "Experience Score",
      value: `${profile.experienceScore}/12`,
    },
    {
      label: "Education Score",
      value: `${profile.educationScore}/10`,
    },
    {
      label: "ATS Base Score",
      value: `${profile.atsScore}/5`,
    },
    {
      label: "Recruiter Base Score",
      value: `${profile.recruiterScore}/5`,
    },
  ];

  return (
    <section className="mt-6 rounded-lg border border-green-500/30 bg-green-500/10 p-6">
      <div>
        <h2 className="text-xl font-bold">
          Career Intelligence Ready
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-green-100/80">
          This is a rule-based first pass. Full AI explanation and
          job-description ATS matching will come later.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {scores.map((score) => (
          <article
            key={score.label}
            className="rounded-lg border border-green-500/20 bg-black/25 p-4"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-green-200/60">
              {score.label}
            </p>

            <p className="mt-2 text-2xl font-bold text-white">
              {score.value}
            </p>
          </article>
        ))}
      </div>
    </section>
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
    <section className="mt-6 rounded-lg border border-gray-800 bg-neutral-900 p-6">
      <div>
        <h2 className="text-xl font-bold">
          Parsed Resume Sections
        </h2>

        <p className="mt-1 text-sm text-gray-400">
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
                  className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm font-semibold text-green-200"
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
                  className="rounded-full border border-gray-700 px-3 py-1 text-sm font-semibold text-gray-200 transition hover:border-green-500 hover:text-green-300"
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
    <article className="min-w-0 rounded-lg border border-gray-800 bg-black/30 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
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
    <ul className="space-y-3 text-sm leading-6 text-gray-200">
      {items.map((item) => (
        <li
          key={item}
          className="break-words border-l border-green-500/40 pl-3"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

function EmptyDetection() {
  return (
    <p className="text-sm text-gray-500">
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
    <article className="min-w-0 rounded-lg border border-gray-800 bg-neutral-900 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-500">
        {label}
      </p>

      <p className="mt-3 break-words text-lg font-bold text-white">
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
      className: "border-gray-800 bg-neutral-900",
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
        ? "border-green-500/30 bg-green-500/10"
        : "border-yellow-500/30 bg-yellow-500/10",
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
      className: "border-green-500/30 bg-green-500/10",
    };
  }

  if (syncStatus?.status === "local-only") {
    return {
      title: "Local only",
      message: syncStatus.message,
      badge: "Local",
      className: "border-yellow-500/30 bg-yellow-500/10",
    };
  }

  return {
    title: "Resume storage",
    message:
      "Latest resume is saved locally. Signed-in users are saved to their account after analysis.",
    badge: null,
    className: "border-gray-800 bg-neutral-900",
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
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
  };
}

function readStoredAnalysis(): string | null {
  return getBrowserStorage()?.getItem(RESUME_ANALYSIS_STORAGE_KEY) ?? null;
}

function readStoredSyncStatus(): string | null {
  return getBrowserStorage()?.getItem(RESUME_SYNC_STATUS_STORAGE_KEY) ??
    null;
}

function getServerSnapshot(): null {
  return null;
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

function mapPersistentResumeAnalysisToView(
  resumeAnalysis: PersistentResumeAnalysis,
): ResumeAnalysisView | null {
  if (!resumeAnalysis.fileName || !resumeAnalysis.fileType) {
    return null;
  }

  const userProfile = isUserProfile(resumeAnalysis.userProfile)
    ? resumeAnalysis.userProfile
    : undefined;

  return {
    fileName: resumeAnalysis.fileName,
    fileType: resumeAnalysis.fileType,
    fileSize: 0,
    extractedText: resumeAnalysis.extractedText ?? "",
    parsedProfile: isParsedResumeProfile(resumeAnalysis.parsedProfile)
      ? resumeAnalysis.parsedProfile
      : EMPTY_PARSED_PROFILE,
    ...(userProfile ? { userProfile } : {}),
    analyzedAt: resumeAnalysis.createdAt,
    status: "completed",
  };
}

function persistRestoredAnalysis(analysis: ResumeAnalysisView): void {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(RESUME_ANALYSIS_STORAGE_KEY, JSON.stringify(analysis));
  } catch {
    return;
  }
}

function writeResumeSyncStatus(status: ResumeSyncStatus): void {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      RESUME_SYNC_STATUS_STORAGE_KEY,
      JSON.stringify(status),
    );
  } catch {
    return;
  }
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
