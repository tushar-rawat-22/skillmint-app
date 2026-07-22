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
import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";
import {
  saveCurrentUserResumeAnalysis,
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
    if (!file || loading) return;

    const startedAt = Date.now();
    const fileType = getAnalyticsFileType(file);
    fireAndForgetAnalytics(() => analytics.resumeAnalysisStarted({
      file_type: fileType,
    }));
    setError(null);

    setLoading(true);

    try {
      const result = await runResumeAnalysis(file);

      const didSaveBrowserReport = writeActiveResumeReport(result, {
        currentUserId,
      });

      if (!didSaveBrowserReport) {
        throw new Error(
          "Could not save this analysis in browser storage. Please try again.",
        );
      }
      notifySkillMintWorkspaceUpdated();

      await persistResumeSyncStatus(result, currentUserId);

      router.push("/resume");
    } catch (error) {
      fireAndForgetAnalytics(() => analytics.resumeAnalysisFailed({
        file_type: fileType,
        error_code: getResumeAnalyticsErrorCode(error),
        duration_bucket: getAnalyticsDurationBucket(startedAt, Date.now()),
      }));
      setError(
        error instanceof Error
          ? error.message
          : "Resume analysis failed. Please try again.",
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

async function persistResumeSyncStatus(
  result: ResumeAnalysisResult,
  currentUserId: string | null | undefined,
): Promise<void> {
  try {
    const saveResult = await saveCurrentUserResumeAnalysis({
      fileName: result.fileName,
      fileType: result.fileType,
      extractedText: result.extractedText,
      parsedProfile: result.parsedProfile,
      userProfile: result.userProfile,
    });

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
  } catch {
    writeResumeSyncStatus({
      status: "local-only",
      message: "Resume analyzed in this browser. Account save did not finish.",
    }, {
      currentUserId,
    });
  }
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
