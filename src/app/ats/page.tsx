"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

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
  const [improvementPlan, setImprovementPlan] =
    useState<ResumeImprovementPlan | null>(null);
  const [rewritePlan, setRewritePlan] =
    useState<ResumeRewritePlan | null>(null);

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
      setImprovementPlan(null);
      setRewritePlan(null);
      return;
    }

    const trimmedJobDescription = jobDescription.trim();

    if (trimmedJobDescription.length < MIN_JOB_DESCRIPTION_LENGTH) {
      setError(
        "Paste a fuller job description with responsibilities and required skills.",
      );
      setMatchResult(null);
      setImprovementPlan(null);
      setRewritePlan(null);
      return;
    }

    setError("");

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

    setMatchResult(result);
    setImprovementPlan(plan);
    setRewritePlan(rewrite);
    persistMatchResult(trimmedJobDescription, result, plan, rewrite);
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
          <MatchResultPanel
            result={matchResult}
            improvementPlan={improvementPlan}
            rewritePlan={rewritePlan}
          />
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
  improvementPlan: ResumeImprovementPlan | null;
  rewritePlan: ResumeRewritePlan | null;
};

function MatchResultPanel({
  result,
  improvementPlan,
  rewritePlan,
}: MatchResultPanelProps) {
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

      {improvementPlan && (
        <ImprovementPlanPanel plan={improvementPlan} />
      )}

      {rewritePlan && (
        <RewritePlanPanel plan={rewritePlan} />
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

function persistMatchResult(
  jobDescription: string,
  result: JobDescriptionMatchResult,
  improvementPlan: ResumeImprovementPlan,
  rewritePlan: ResumeRewritePlan,
) {
  try {
    localStorage.setItem(
      JD_MATCH_STORAGE_KEY,
      JSON.stringify({
        jobDescription,
        result,
        improvementPlan,
        rewritePlan,
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
