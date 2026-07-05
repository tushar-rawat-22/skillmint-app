"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import UploadHero from "@/components/upload/UploadHero";
import DropZone from "@/components/upload/DropZone";
import FileCard from "@/components/upload/FileCard";
import AnalysisProgress from "@/components/upload/AnalysisProgress";
import { NextBestActionPanel } from "@/modules/activation";
import {
  analyzeResume as runResumeAnalysis,
  type ResumeAnalysisResult,
} from "@/lib/resume/analyzeResume";
import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";
import { saveCurrentUserResumeAnalysis } from "@/modules/resume";

const RESUME_ANALYSIS_STORAGE_KEY = "skillmint:resume-analysis";
const RESUME_SYNC_STATUS_STORAGE_KEY = "skillmint:resume-sync-status";

type ResumeSyncStatus = {
  status: "synced" | "local-only";
  message: string;
  syncedAt?: string;
  databaseId?: string;
};

export default function UploadPage() {
  const router = useRouter();
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

    setError(null);

    setLoading(true);

    try {
      const result = await runResumeAnalysis(file);

      localStorage.setItem(
        RESUME_ANALYSIS_STORAGE_KEY,
        JSON.stringify(result),
      );
      notifySkillMintWorkspaceUpdated();

      await persistResumeSyncStatus(result);

      router.push("/resume");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Resume analysis failed. Please try again.",
      );

      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-black pb-24 text-white">
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
              disabled={loading}
              className="rounded-xl bg-green-600 px-10 py-4 font-semibold text-white transition hover:bg-green-500 disabled:cursor-not-allowed disabled:bg-green-900 disabled:text-gray-300"
            >
              {loading ? "Analyzing..." : "Analyze Resume"}
            </button>

            {error && (
              <div className="mx-auto mt-5 max-w-xl rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-left">
                <p className="text-sm font-bold text-red-100">
                  Analysis failed
                </p>

                <p className="mt-1 text-sm leading-6 text-red-200/80">
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
      });
      return;
    }

    writeResumeSyncStatus({
      status: "local-only",
      message: getLocalOnlySyncMessage(saveResult.error),
    });
  } catch {
    writeResumeSyncStatus({
      status: "local-only",
      message: "Resume analyzed in this browser. Account save did not finish.",
    });
  }
}

function writeResumeSyncStatus(status: ResumeSyncStatus): void {
  try {
    localStorage.setItem(
      RESUME_SYNC_STATUS_STORAGE_KEY,
      JSON.stringify(status),
    );
    notifySkillMintWorkspaceUpdated();
  } catch {
    // Sync status is noncritical; the resume analysis is already saved in this browser.
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
