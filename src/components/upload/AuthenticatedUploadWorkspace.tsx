"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

import UploadHero from "@/components/upload/UploadHero";
import DropZone from "@/components/upload/DropZone";
import FileCard from "@/components/upload/FileCard";
import AnalysisProgress from "@/components/upload/AnalysisProgress";
import {
  premiumHeroSurface,
  premiumPrimaryCta,
  premiumSecondaryCta,
} from "@/components/ui/premium";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import {
  analyzeResume as runResumeAnalysis,
  type ResumeAnalysisResult,
} from "@/lib/resume/analyzeResume";
import {
  RESUME_EXTRACTION_ERRORS,
  ResumeExtractionError,
} from "@/lib/resume/resumeUploadContract";
import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";
import {
  saveCurrentUserResumeAnalysis,
  type SaveResumeAnalysisResult,
  writeActiveResumeReport,
  writeResumeSyncStatus,
} from "@/modules/resume";
import {
  fireAndForgetAnalytics,
  getAnalyticsDurationBucket,
  getAnalyticsFileType,
  getBrowserAnalyticsRuntime,
  getResumeAnalyticsErrorCode,
} from "@/platform/analytics";

const STALE_RESUME_OPERATION_MESSAGE =
  "Your account changed while this resume was being analyzed. The stale result was discarded. Please analyze the resume again.";

export default function AuthenticatedUploadWorkspace({
  authorizedUserId,
}: {
  authorizedUserId: string;
}) {
  const router = useRouter();
  const {
    user,
    session,
    isLoading: isAuthLoading,
  } = useAuthSession();
  const clientAuthorizationMatches =
    !isAuthLoading &&
    user?.id === authorizedUserId &&
    typeof session?.access_token === "string" &&
    session.access_token.length > 0;
  const analytics = getBrowserAnalyticsRuntime({
    isAuthResolved: !isAuthLoading,
    hasAccount: clientAuthorizationMatches,
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthLoading) {
    return <UploadSessionState message="Confirming your account before showing the resume uploader." />;
  }

  if (!clientAuthorizationMatches) {
    return (
      <UploadSessionState
        message="Your authenticated account changed or expired. Log in again before uploading a real resume."
        showLogin
      />
    );
  }

  function selectFile(nextFile: File | null) {
    setFile(nextFile);
    setError(null);
  }

  function removeFile() {
    setFile(null);
    setError(null);
  }

  async function analyzeSelectedResume() {
    const accessToken = session?.access_token;
    if (
      !file ||
      loading ||
      !clientAuthorizationMatches ||
      typeof accessToken !== "string"
    ) {
      return;
    }

    const operationUserId = authorizedUserId;
    const startedAt = Date.now();
    const fileType = getAnalyticsFileType(file);

    fireAndForgetAnalytics(() => analytics.resumeAnalysisStarted({
      file_type: fileType,
    }));

    setError(null);
    setLoading(true);

    try {
      const result = await runResumeAnalysis(file, accessToken);
      const saveResult = await saveResumeAnalysisForOperation(
        result,
        operationUserId,
      );
      const didSaveBrowserReport = writeActiveResumeReport(result, {
        currentUserId: operationUserId,
      });

      if (!didSaveBrowserReport) {
        throw new Error(
          "Could not save this analysis in browser storage. Please try again.",
        );
      }

      notifySkillMintWorkspaceUpdated();
      writeResumeSyncStatusForSaveResult(saveResult, operationUserId);
      router.push("/resume");
    } catch (caughtError) {
      fireAndForgetAnalytics(() => analytics.resumeAnalysisFailed({
        file_type: fileType,
        error_code: getResumeAnalyticsErrorCode(caughtError),
        duration_bucket: getAnalyticsDurationBucket(startedAt, Date.now()),
      }));
      setError(getResumeAnalysisPublicError(caughtError));
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] pb-24 text-slate-950">
      <UploadHero />

      <DropZone file={file} setFile={selectFile} />

      {file && (
        <>
          <FileCard file={file} remove={removeFile} />

          <div className="mt-8 text-center">
            <button
              onClick={analyzeSelectedResume}
              disabled={loading}
              className={`${premiumPrimaryCta} px-10 py-4`}
            >
              {loading ? "Building report..." : "Analyze Resume"}
            </button>

            {error && (
              <div
                role="alert"
                aria-atomic="true"
                className="mx-auto mt-5 max-w-xl rounded-xl border border-rose-200 bg-rose-50 p-4 text-left"
              >
                <p className="text-sm font-bold text-rose-800">
                  Analysis failed
                </p>
                <p className="mt-1 text-sm leading-6 text-rose-700">
                  {error}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      <AnalysisProgress loading={loading} />
    </main>
  );
}

function UploadSessionState({
  message,
  showLogin = false,
}: {
  message: string;
  showLogin?: boolean;
}) {
  return (
    <main className="min-h-screen bg-[#f7f8f4] px-6 py-16 text-slate-950">
      <section className={`${premiumHeroSurface} mx-auto max-w-3xl text-center`}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
          Authenticated resume analysis
        </p>
        <h1 className="mt-4 text-4xl font-black">Checking upload access</h1>
        <p role="status" className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600">
          {message}
        </p>
        {showLogin && (
          <Link href="/login" className={`${premiumSecondaryCta} mt-6`}>
            Log in
          </Link>
        )}
      </section>
    </main>
  );
}

function getResumeAnalysisPublicError(error: unknown): string {
  if (error instanceof ResumeExtractionError) {
    return RESUME_EXTRACTION_ERRORS[error.code].message;
  }

  if (error instanceof Error && error.message === STALE_RESUME_OPERATION_MESSAGE) {
    return STALE_RESUME_OPERATION_MESSAGE;
  }

  return "Resume analysis failed. Please try again.";
}

async function saveResumeAnalysisForOperation(
  result: ResumeAnalysisResult,
  expectedUserId: string,
): Promise<SaveResumeAnalysisResult> {
  let saveResult: SaveResumeAnalysisResult;

  try {
    saveResult = await saveCurrentUserResumeAnalysis({
      fileName: result.fileName,
      fileType: result.fileType,
      extractedText: result.extractedText,
      parsedProfile: result.parsedProfile,
      userProfile: result.userProfile,
    }, {
      expectedUserId,
    });
  } catch {
    return {
      ok: false,
      reason: "save_failed",
      error: "Resume analyzed in this browser. Account save did not finish.",
    };
  }

  if (!saveResult.ok && saveResult.reason === "owner_changed") {
    throw new Error(STALE_RESUME_OPERATION_MESSAGE);
  }

  return saveResult;
}

function writeResumeSyncStatusForSaveResult(
  saveResult: SaveResumeAnalysisResult,
  currentUserId: string,
): void {
  if (saveResult.ok) {
    writeResumeSyncStatus({
      status: "synced",
      message: "Resume saved to your SkillMint account.",
      syncedAt: new Date().toISOString(),
      databaseId: saveResult.data.id,
    }, {
      currentUserId,
    });
    return;
  }

  writeResumeSyncStatus({
    status: "local-only",
    message: getLocalOnlySyncMessage(saveResult.error),
  }, {
    currentUserId,
  });
}

function getLocalOnlySyncMessage(error: string): string {
  if (isMissingSupabaseConfigError(error)) {
    return "Resume analyzed in this browser. Account saving is unavailable.";
  }

  if (error.includes("Sign in")) {
    return "Resume analyzed in this browser. Log in again to save your progress.";
  }

  return error || "Resume analyzed in this browser. Account save did not finish.";
}

function isMissingSupabaseConfigError(error: string): boolean {
  const normalizedError = error.toLowerCase();
  return normalizedError.includes("supabase") &&
    normalizedError.includes("environment variables") &&
    normalizedError.includes("missing");
}
