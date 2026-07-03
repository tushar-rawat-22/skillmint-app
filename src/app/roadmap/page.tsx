"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import {
  generateCareerRoadmap,
  type CareerRoadmap,
  type RoadmapPhase,
  type RoadmapTask,
} from "@/intelligence/core/careerRoadmap";
import type { JobDescriptionMatchResult } from "@/intelligence/core/jobDescriptionMatch";
import type { ResumeImprovementPlan } from "@/intelligence/core/resumeImprovement";
import type {
  ResumeRewritePlan,
  ResumeRewriteSuggestion,
} from "@/intelligence/core/resumeRewrite";
import type { UserProfile } from "@/intelligence/types/profile";

const RESUME_ANALYSIS_STORAGE_KEY = "skillmint:resume-analysis";
const JD_MATCH_STORAGE_KEY = "skillmint:jd-match";

type LatestJobMatch = {
  result: JobDescriptionMatchResult;
  improvementPlan: ResumeImprovementPlan | null;
  rewritePlan: ResumeRewritePlan | null;
};

export default function RoadmapPage() {
  const storedAnalysis = useSyncExternalStore(
    subscribeToStoredData,
    readStoredAnalysis,
    getServerSnapshot,
  );
  const storedJobMatch = useSyncExternalStore(
    subscribeToStoredData,
    readStoredJobMatch,
    getServerSnapshot,
  );
  const userProfile = useMemo(
    () => getStoredUserProfile(storedAnalysis),
    [storedAnalysis],
  );
  const latestJobMatch = useMemo(
    () => parseLatestJobMatch(storedJobMatch),
    [storedJobMatch],
  );
  const roadmap = useMemo(() => {
    if (!userProfile) {
      return null;
    }

    return generateCareerRoadmap(
      userProfile,
      latestJobMatch?.result ?? null,
      latestJobMatch?.improvementPlan ?? null,
      latestJobMatch?.rewritePlan ?? null,
    );
  }, [latestJobMatch, userProfile]);

  if (!userProfile || !roadmap) {
    return (
      <DashboardLayout>
        <EmptyState
          eyebrow="Career Roadmap"
          title="Upload and analyze your resume first."
          body="SkillMint needs your latest resume intelligence before it can create a practical 30/60/90-day roadmap."
          href="/upload"
          action="Upload Resume"
        />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-green-400">
              Career Roadmap
            </p>

            <h1 className="mt-4 text-4xl font-black md:text-5xl">
              Career Roadmap
            </h1>

            <p className="mt-4 max-w-2xl text-gray-400">
              Your 30/60/90-day plan to become more hire-ready.
            </p>
          </div>

          <Link
            href="/ats"
            className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-100 transition hover:border-green-500 hover:text-green-300"
          >
            Open ATS Match
          </Link>
        </div>

        {!latestJobMatch && (
          <section className="mt-8 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-5">
            <h2 className="text-lg font-bold text-yellow-100">
              Paste a JD in ATS Match for a more targeted roadmap.
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6 text-yellow-50/80">
              This version uses your resume profile only. A job description
              match unlocks role-specific gaps, keywords, and application
              strategy.
            </p>

            <Link
              href="/ats"
              className="mt-4 inline-flex rounded-lg border border-yellow-400/40 px-4 py-2 text-sm font-semibold text-yellow-50 transition hover:border-yellow-300"
            >
              Go to ATS Match
            </Link>
          </section>
        )}

        <ReadinessCard
          roadmap={roadmap}
          latestJobMatch={latestJobMatch}
        />

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <PhaseSection phase={roadmap.thirtyDayPlan} />
          <PhaseSection phase={roadmap.sixtyDayPlan} />
          <PhaseSection phase={roadmap.ninetyDayPlan} />
        </section>

        <TaskSection
          title="Weekly Missions"
          description="Practical weekly moves that turn the roadmap into action."
          tasks={roadmap.weeklyMissions}
        />

        <TaskSection
          title="Project Roadmap"
          description="Build inspectable proof for the target role."
          tasks={roadmap.projectRoadmap}
        />

        <TaskSection
          title="Skill Roadmap"
          description="Learn, build proof, then add skills truthfully."
          tasks={roadmap.skillRoadmap}
        />

        <ApplicationStrategy items={roadmap.applicationStrategy} />
      </section>
    </DashboardLayout>
  );
}

type EmptyStateProps = {
  eyebrow: string;
  title: string;
  body: string;
  href: string;
  action: string;
};

function EmptyState({
  eyebrow,
  title,
  body,
  href,
  action,
}: EmptyStateProps) {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-3xl flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-green-400">
        {eyebrow}
      </p>

      <h1 className="mt-5 text-4xl font-black md:text-5xl">
        {title}
      </h1>

      <p className="mt-5 max-w-2xl text-lg leading-8 text-gray-400">
        {body}
      </p>

      <Link
        href={href}
        className="mt-8 rounded-xl bg-green-600 px-6 py-3 font-semibold text-white transition hover:bg-green-500"
      >
        {action}
      </Link>
    </section>
  );
}

type ReadinessCardProps = {
  roadmap: CareerRoadmap;
  latestJobMatch: LatestJobMatch | null;
};

function ReadinessCard({
  roadmap,
  latestJobMatch,
}: ReadinessCardProps) {
  return (
    <section className="mt-8 rounded-lg border border-green-500/30 bg-green-500/10 p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-green-300/80">
            Current Readiness
          </p>

          <h2 className="mt-4 break-words text-3xl font-black text-white">
            {roadmap.targetRole}
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-green-50/80">
            {roadmap.brutalSummary}
          </p>
        </div>

        <div className="shrink-0">
          <span className={getReadinessClassName(roadmap.readiness)}>
            {roadmap.readiness}
          </span>

          {latestJobMatch && (
            <p className="mt-3 text-right text-sm text-green-50/70">
              Latest match: {latestJobMatch.result.matchScore}%
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-lg border border-green-500/20 bg-black/20 p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-green-200/70">
          Current Blockers
        </h3>

        <ul className="mt-4 space-y-3 text-sm leading-6 text-green-50/85">
          {roadmap.currentBlockers.map((blocker) => (
            <li
              key={blocker}
              className="break-words border-l border-green-400/50 pl-3"
            >
              {blocker}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

type PhaseSectionProps = {
  phase: RoadmapPhase;
};

function PhaseSection({ phase }: PhaseSectionProps) {
  return (
    <section className="min-w-0 rounded-lg border border-gray-800 bg-neutral-900 p-5">
      <h2 className="text-xl font-bold text-white">
        {phase.title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-gray-400">
        {phase.goal}
      </p>

      <div className="mt-5 space-y-3">
        {phase.tasks.map((task) => (
          <CompactTaskCard
            key={`${phase.title}-${task.title}`}
            task={task}
          />
        ))}
      </div>
    </section>
  );
}

type TaskSectionProps = {
  title: string;
  description: string;
  tasks: RoadmapTask[];
};

function TaskSection({
  title,
  description,
  tasks,
}: TaskSectionProps) {
  return (
    <section className="mt-6 rounded-lg border border-gray-800 bg-neutral-900 p-6">
      <div>
        <h2 className="text-xl font-bold text-white">
          {title}
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
          {description}
        </p>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {tasks.map((task) => (
          <TaskCard
            key={`${title}-${task.title}`}
            task={task}
          />
        ))}
      </div>
    </section>
  );
}

type TaskCardProps = {
  task: RoadmapTask;
};

function TaskCard({ task }: TaskCardProps) {
  return (
    <article className="min-w-0 rounded-lg border border-gray-800 bg-black/30 p-5">
      <TaskMeta task={task} />

      <h3 className="mt-4 break-words text-lg font-bold text-white">
        {task.title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-gray-400">
        {task.reason}
      </p>

      <p className="mt-3 text-sm leading-6 text-gray-200">
        {task.action}
      </p>
    </article>
  );
}

function CompactTaskCard({ task }: TaskCardProps) {
  return (
    <article className="min-w-0 rounded-lg border border-gray-800 bg-black/30 p-4">
      <TaskMeta task={task} />

      <h3 className="mt-3 break-words text-base font-bold text-white">
        {task.title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-gray-300">
        {task.action}
      </p>
    </article>
  );
}

function TaskMeta({ task }: TaskCardProps) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="rounded-full border border-gray-700 px-3 py-1 text-xs font-semibold text-gray-300">
        {task.category}
      </span>

      <span className={getPriorityClassName(task.priority)}>
        {task.priority}
      </span>

      <span className="rounded-full border border-gray-700 px-3 py-1 text-xs font-semibold text-gray-400">
        {task.estimatedTime}
      </span>
    </div>
  );
}

type ApplicationStrategyProps = {
  items: string[];
};

function ApplicationStrategy({ items }: ApplicationStrategyProps) {
  return (
    <section className="mt-6 rounded-lg border border-gray-800 bg-neutral-900 p-6">
      <h2 className="text-xl font-bold text-white">
        Application Strategy
      </h2>

      <ul className="mt-5 grid gap-3 text-sm leading-6 text-gray-200 lg:grid-cols-2">
        {items.map((item) => (
          <li
            key={item}
            className="break-words rounded-lg border border-gray-800 bg-black/30 p-4"
          >
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function getReadinessClassName(
  readiness: CareerRoadmap["readiness"],
): string {
  const baseClassName =
    "inline-flex rounded-full border px-4 py-2 text-sm font-semibold";

  if (readiness === "Ready to apply") {
    return `${baseClassName} border-green-400/40 bg-green-400/10 text-green-100`;
  }

  if (readiness === "Apply selectively") {
    return `${baseClassName} border-blue-400/40 bg-blue-400/10 text-blue-100`;
  }

  if (readiness === "Getting ready") {
    return `${baseClassName} border-yellow-400/40 bg-yellow-400/10 text-yellow-100`;
  }

  return `${baseClassName} border-red-400/40 bg-red-400/10 text-red-100`;
}

function getPriorityClassName(priority: RoadmapTask["priority"]): string {
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

function subscribeToStoredData(onStoreChange: () => void): () => void {
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
  };
}

function readStoredAnalysis(): string | null {
  return getBrowserStorage()?.getItem(RESUME_ANALYSIS_STORAGE_KEY) ?? null;
}

function readStoredJobMatch(): string | null {
  return getBrowserStorage()?.getItem(JD_MATCH_STORAGE_KEY) ?? null;
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

function parseLatestJobMatch(
  storedJobMatch: string | null,
): LatestJobMatch | null {
  if (!storedJobMatch) {
    return null;
  }

  try {
    const parsedJobMatch = JSON.parse(storedJobMatch);

    if (
      !isRecord(parsedJobMatch) ||
      !isJobDescriptionMatchResult(parsedJobMatch.result)
    ) {
      return null;
    }

    return {
      result: parsedJobMatch.result,
      improvementPlan: isResumeImprovementPlan(
        parsedJobMatch.improvementPlan,
      )
        ? parsedJobMatch.improvementPlan
        : null,
      rewritePlan: isResumeRewritePlan(parsedJobMatch.rewritePlan)
        ? parsedJobMatch.rewritePlan
        : null,
    };
  } catch {
    return null;
  }
}

function isJobDescriptionMatchResult(
  value: unknown,
): value is JobDescriptionMatchResult {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNumber(value.matchScore) &&
    isString(value.verdict) &&
    isString(value.brutalReality) &&
    isStringArray(value.matchedSkills) &&
    isStringArray(value.missingSkills) &&
    isStringArray(value.missingKeywords) &&
    isStringArray(value.strengths) &&
    isStringArray(value.weaknesses) &&
    isStringArray(value.recommendations)
  );
}

function isResumeImprovementPlan(
  value: unknown,
): value is ResumeImprovementPlan {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.readiness) &&
    isString(value.summary) &&
    Array.isArray(value.priorityFixes) &&
    value.priorityFixes.every(isResumeImprovementItem) &&
    isStringArray(value.keywordAdditions) &&
    isStringArray(value.projectSuggestions) &&
    isStringArray(value.proofGaps) &&
    isStringArray(value.sectionFixes) &&
    isStringArray(value.beforeApplyChecklist)
  );
}

function isResumeImprovementItem(
  value: unknown,
): value is ResumeImprovementPlan["priorityFixes"][number] {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.title) &&
    isString(value.reason) &&
    isString(value.action) &&
    isString(value.priority) &&
    isString(value.impact) &&
    isString(value.category)
  );
}

function isResumeRewritePlan(value: unknown): value is ResumeRewritePlan {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.headline) &&
    isResumeRewriteSuggestion(value.summaryRewrite) &&
    isResumeRewriteSuggestion(value.skillsRewrite) &&
    Array.isArray(value.projectRewrites) &&
    value.projectRewrites.every(isResumeRewriteSuggestion) &&
    Array.isArray(value.experienceRewrites) &&
    value.experienceRewrites.every(isResumeRewriteSuggestion) &&
    isStringArray(value.finalWarnings)
  );
}

function isResumeRewriteSuggestion(
  value: unknown,
): value is ResumeRewriteSuggestion {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.section) &&
    isString(value.title) &&
    isString(value.weakExample) &&
    isString(value.improvedExample) &&
    isString(value.whyBetter) &&
    isStringArray(value.evidenceNeeded) &&
    isString(value.caution)
  );
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
    isString(value.education) &&
    Array.isArray(value.certifications) &&
    Array.isArray(value.codingProfiles)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string");
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
