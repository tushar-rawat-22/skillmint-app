"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import UploadHero from "@/components/upload/UploadHero";
import DropZone from "@/components/upload/DropZone";
import FileCard from "@/components/upload/FileCard";
import AnalysisProgress from "@/components/upload/AnalysisProgress";
import { analyzeResume as runResumeAnalysis } from "@/lib/resume/analyzeResume";

const RESUME_ANALYSIS_STORAGE_KEY = "skillmint:resume-analysis";

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
              <p className="mx-auto mt-4 max-w-xl text-sm text-red-300">
                {error}
              </p>
            )}
          </div>
        </>
      )}

      <AnalysisProgress loading={loading} />
    </main>
  );
}
