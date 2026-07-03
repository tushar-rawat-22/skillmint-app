"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import {
  analyzeJobDescriptionMatch,
  type JobDescriptionMatchResult,
} from "@/intelligence/core/jobDescriptionMatch";
import type { UserProfile } from "@/intelligence/types/profile";

const RESUME_ANALYSIS_STORAGE_KEY = "skillmint:resume-analysis";
const JD_MATCH_STORAGE_KEY = "skillmint:jd-match";
const MIN_JOB_DESCRIPTION_LENGTH = 80;

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
  const [jobDescription, setJobDescription] = useState("");
  const [error, setError] = useState("");
  const [matchResult, setMatchResult] =
    useState<JobDescriptionMatchResult | null>(null);

  if (!userProfile) {
    return (
      <DashboardLayout>
        <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-green-400">
            JD Match
          </p>

          <h1 className="mt-5 text-4xl font-black md:text-5xl">
            Upload and analyze your resume first.
          </h1>

          <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-400">
            SkillMint needs your latest resume intelligence before it can
            compare you against a specific job description.
          </p>

          <Link
            href="/upload"
            className="mt-8 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-500"
          >
            Upload Resume
          </Link>
        </section>
      </DashboardLayout>
    );
  }

  function handleAnalyzeMatch() {
    if (!userProfile) {
      setError("Upload and analyze your resume before matching a JD.");
      setMatchResult(null);
      return;
    }

    const trimmedJobDescription = jobDescription.trim();

    if (trimmedJobDescription.length < MIN_JOB_DESCRIPTION_LENGTH) {
      setError(
        "Paste a fuller job description with responsibilities and required skills.",
      );
      setMatchResult(null);
      return;
    }

    setError("");

    const result = analyzeJobDescriptionMatch(
      userProfile,
      trimmedJobDescription,
    );

    setMatchResult(result);
    persistMatchResult(trimmedJobDescription, result);
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
              Job Description ATS Matcher
            </h1>

            <p className="mt-4 max-w-2xl text-gray-400">
              Paste a JD and see whether your resume is actually ready.
            </p>
          </div>

          <Link
            href="/resume"
            className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-100 transition hover:border-green-500 hover:text-green-300"
          >
            View Resume Analysis
          </Link>
        </div>

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
                Use the complete JD. Short snippets make the match less useful.
              </p>
            </div>

            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
              {jobDescription.trim().length} chars
            </span>
          </div>

          <textarea
            id="job-description"
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            rows={12}
            placeholder="Paste the full job description here..."
            className="mt-5 min-h-72 w-full resize-y rounded-lg border border-gray-800 bg-black/40 p-4 text-sm leading-7 text-gray-100 outline-none transition placeholder:text-gray-600 focus:border-green-500"
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

        {matchResult ? (
          <MatchResultPanel result={matchResult} />
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
      </section>
    </DashboardLayout>
  );
}

type MatchResultPanelProps = {
  result: JobDescriptionMatchResult;
};

function MatchResultPanel({ result }: MatchResultPanelProps) {
  return (
    <section className="mt-6 space-y-6">
      <article className="rounded-lg border border-green-500/30 bg-green-500/10 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-300/80">
          Strict ATS Match
        </p>

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
    </section>
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

function persistMatchResult(
  jobDescription: string,
  result: JobDescriptionMatchResult,
) {
  try {
    localStorage.setItem(
      JD_MATCH_STORAGE_KEY,
      JSON.stringify({
        jobDescription,
        result,
        analyzedAt: new Date().toISOString(),
      }),
    );
  } catch {
    // Local storage failures should not block the user from seeing the result.
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
  return localStorage.getItem(RESUME_ANALYSIS_STORAGE_KEY);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" &&
    !Array.isArray(value);
}
