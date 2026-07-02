"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import type { ResumeAnalysisResult } from "@/lib/resume/analyzeResume";

const RESUME_ANALYSIS_STORAGE_KEY = "skillmint:resume-analysis";

export default function ResumePage() {
  const storedAnalysis = useSyncExternalStore(
    subscribeToStoredAnalysis,
    readStoredAnalysis,
    getServerSnapshot,
  );
  const analysis = useMemo(
    () => parseStoredAnalysis(storedAnalysis),
    [storedAnalysis],
  );

  if (!analysis) {
    return (
      <main className="min-h-screen bg-neutral-950 px-6 py-16 text-white">
        <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-green-400">
            Resume Intelligence
          </p>

          <h1 className="mt-5 text-4xl font-black md:text-5xl">
            No resume analysis yet
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-400">
            Upload a resume to create your latest SkillMint extraction
            snapshot.
          </p>

          <Link
            href="/upload"
            className="mt-8 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-500"
          >
            Upload Resume
          </Link>
        </section>
      </main>
    );
  }

  const extractedTextPreview = getExtractedTextPreview(
    analysis.extractedText,
  );

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-12 text-white">
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
            value={analysis.fileName}
          />

          <SummaryItem
            label="Size"
            value={formatFileSize(analysis.fileSize)}
          />

          <SummaryItem
            label="Analyzed"
            value={formatAnalyzedDate(analysis.analyzedAt)}
          />

          <SummaryItem
            label="Status"
            value={formatStatus(analysis.status)}
          />
        </section>

        <section className="mt-6 rounded-lg border border-gray-800 bg-neutral-900 p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Extracted Text Preview
              </h2>

              <p className="mt-1 text-sm text-gray-400">
                {analysis.fileType}
              </p>
            </div>

            <span className="rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-300">
              {formatStatus(analysis.status)}
            </span>
          </div>

          <pre className="mt-6 max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-black/40 p-5 text-sm leading-7 text-gray-200">
            {extractedTextPreview}
          </pre>
        </section>
      </section>
    </main>
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

function getExtractedTextPreview(extractedText: string): string {
  const normalizedText = extractedText.trim();

  if (!normalizedText) {
    return "No extracted text was returned for this resume.";
  }

  if (normalizedText.length <= 900) {
    return normalizedText;
  }

  return `${normalizedText.slice(0, 900)}...`;
}

function formatFileSize(fileSize: number): string {
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

function isResumeAnalysisResult(
  value: unknown,
): value is ResumeAnalysisResult {
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

function subscribeToStoredAnalysis(
  onStoreChange: () => void,
): () => void {
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
  };
}

function readStoredAnalysis(): string | null {
  return localStorage.getItem(RESUME_ANALYSIS_STORAGE_KEY);
}

function getServerSnapshot(): null {
  return null;
}

function parseStoredAnalysis(
  storedAnalysis: string | null,
): ResumeAnalysisResult | null {
  if (!storedAnalysis) {
    return null;
  }

  try {
    const parsedAnalysis = JSON.parse(storedAnalysis);

    return isResumeAnalysisResult(parsedAnalysis)
      ? parsedAnalysis
      : null;
  } catch {
    return null;
  }
}
