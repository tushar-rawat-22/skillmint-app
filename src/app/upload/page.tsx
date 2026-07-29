"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import UploadHero from "@/components/upload/UploadHero";
import DropZone from "@/components/upload/DropZone";
import FileCard from "@/components/upload/FileCard";
import AnalysisProgress from "@/components/upload/AnalysisProgress";
import { premiumPrimaryCta } from "@/components/ui/premium";
import { NextBestActionPanel } from "@/modules/activation";
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

export default function UploadPage() {
  const router = useRouter();
  const {
    user,
    isLoading: isAuthLoading,
  } = useAuthSession();
  const currentUserId = isAuthLoading ? undefined : user?.id ?? null;
  const analytics = getBrowserAnalyticsRuntime({
    isAuthResolved: !isAuthLoading,
    hasAccount: Boolean(user),
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function selectFile(nextFile: File | null) {
    setFile(nextFile);
    setError(null);
  }

  function removeFile() {
    setFile(null);
    setError(null);
  }

  async function analyzeSelectedResume() {
    if (
      !file ||
      loading ||
      currentUserId === undefined
    ) {
      return;
    }

    const operationUserId = currentUserId;
    const startedAt = Date.now();
    const fileType = getAnalyticsFileType(file);

    fireAndForgetAnalytics(() => analytics.resumeAnalysisStarted({
      file_type: fileType,
    }));

    setError(null);
    setLoading(true);

    try {
      const result = await runResumeAnalysis(file);

      const saveResult =
        await saveResumeAnalysisForOperation(
          result,
          operationUserId,
        );

      const didSaveBrowserReport =
        writeActiveResumeReport(result, {
          currentUserId: operationUserId,
        });

      if (!didSaveBrowserReport) {
        throw new Error(
          "Could not save this analysis in browser storage. Please try again.",
        );
      }

      notifySkillMintWorkspaceUpdated();

      writeResumeSyncStatusForSaveResult(
        saveResult,
        operationUserId,
      );

      router.push("/resume");
    } catch (error) {
      fireAndForgetAnalytics(() => analytics.resumeAnalysisFailed({
        file_type: fileType,
        error_code: getResumeAnalyticsErrorCode(error),
        duration_bucket: getAnalyticsDurationBucket(
          startedAt,
          Date.now(),
        ),
      }));

      setError(
        getResumeAnalysisPublicError(error),
      );

      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7f8f4] pb-24 text-slate-950">
      <UploadHero />

      <div className="mx-auto max-w-5xl px-6">
        <NextBestActionPanel />
      </div>

      <DropZone
        file={file}
        setFile={selectFile}
      />

      {file && (
        <>
          <FileCard
            file={file}
            remove={removeFile}
          />

          <div className="mt-8 text-center">
            <button
              onClick={analyzeSelectedResume}
              disabled={loading || isAuthLoading}
              className={`${premiumPrimaryCta} px-10 py-4`}
            >
              {loading
                ? "Building report..."
                : isAuthLoading
                  ? "Checking account..."
                  : "Analyze Resume"}
            </button>

            {error && (
              <div className="mx-auto mt-5 max-w-xl rounded-xl border border-rose-200 bg-rose-50 p-4 text-left">
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

function getResumeAnalysisPublicError(error: unknown): string {
  if (error instanceof ResumeExtractionError) {
    return RESUME_EXTRACTION_ERRORS[error.code].message;
  }

  if (
    error instanceof Error &&
    error.message === STALE_RESUME_OPERATION_MESSAGE
  ) {
    return STALE_RESUME_OPERATION_MESSAGE;
  }

  return "Resume analysis failed. Please try again.";
}

async function saveResumeAnalysisForOperation(
  result: ResumeAnalysisResult,
  expectedUserId: string | null,
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
      error:
        "Resume analyzed in this browser. Account save did not finish.",
    };
  }

  if (
    !saveResult.ok &&
    saveResult.reason === "owner_changed"
  ) {
    throw new Error(
      STALE_RESUME_OPERATION_MESSAGE,
    );
  }

  return saveResult;
}

function writeResumeSyncStatusForSaveResult(
  saveResult: SaveResumeAnalysisResult,
  currentUserId: string | null,
): void {
  if (saveResult.ok) {
    writeResumeSyncStatus({
      status: "synced",
      message:
        "Resume saved to your SkillMint account.",
      syncedAt: new Date().toISOString(),
      databaseId: saveResult.data.id,
    }, {
      currentUserId,
    });

    return;
  }

  writeResumeSyncStatus({
    status: "local-only",
    message: getLocalOnlySyncMessage(
      saveResult.error,
    ),
  }, {
    currentUserId,
  });
}

function getLocalOnlySyncMessage(error: string): string {
  if (isMissingSupabaseConfigError(error)) {
    return "Resume analyzed in this browser. Account saving is unavailable.";
  }

  if (error.includes("Sign in")) {
    return "Resume analyzed in this browser. Sign in to save your progress.";
  }

  return error || "Resume analyzed in this browser. Account save did not finish.";
}

function isMissingSupabaseConfigError(error: string): boolean {
  const normalizedError = error.toLowerCase();

  return (
    normalizedError.includes("supabase") &&
    normalizedError.includes("environment variables") &&
    normalizedError.includes("missing")
  );
}
