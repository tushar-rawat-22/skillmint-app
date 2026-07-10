"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import {
  premiumBadge,
  premiumCompactSurface,
  premiumEyebrow,
  premiumHeroSurface,
  premiumPrimaryCta,
  premiumSecondaryCta,
  premiumSurface,
} from "@/components/ui/premium";
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
import {
  notifySkillMintWorkspaceUpdated,
  subscribeToSkillMintWorkspaceUpdates,
} from "@/lib/storage/skillMintStorageEvents";
import {
  NextBestActionPanel,
  UpgradeInterestCard,
} from "@/modules/activation";
import { updateCurrentUserJobMatchRoadmap } from "@/modules/jobMatch";
import { TARGET_ROLE_SETUP_STORAGE_KEY } from "@/modules/onboarding/storage/targetRoleSetupStorage";

const RESUME_ANALYSIS_STORAGE_KEY = "skillmint:resume-analysis";
const JD_MATCH_STORAGE_KEY = "skillmint:jd-match";

type LatestJobMatch = {
  id?: string;
  databaseId?: string;
  jobTitle?: string;
  companyName?: string;
  jobDescription?: string;
  result: JobDescriptionMatchResult;
  improvementPlan: ResumeImprovementPlan | null;
  rewritePlan: ResumeRewritePlan | null;
  roadmap?: unknown;
};

type RoadmapSetupSource = {
  targetRole: string;
};

type RoadmapSyncState = {
  status: "synced" | "local-only";
  message: string;
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
  const storedSetup = useSyncExternalStore(
    subscribeToStoredData,
    readStoredSetup,
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
  const setupSource = useMemo(
    () => parseSetupSource(storedSetup),
    [storedSetup],
  );
  const roadmapRoleContext = useMemo(
    () => getRoadmapRoleContext(latestJobMatch, setupSource),
    [latestJobMatch, setupSource],
  );
  const [roadmapSyncState, setRoadmapSyncState] =
    useState<RoadmapSyncState | null>(null);
  const roadmap = useMemo(() => {
    if (!userProfile) {
      return null;
    }

    return generateCareerRoadmap(
      userProfile,
      latestJobMatch?.result ?? null,
      latestJobMatch?.improvementPlan ?? null,
      latestJobMatch?.rewritePlan ?? null,
      {
        targetRole: roadmapRoleContext,
        setupTargetRole: setupSource?.targetRole,
        jobDescription: latestJobMatch?.jobDescription,
      },
    );
  }, [latestJobMatch, roadmapRoleContext, setupSource, userProfile]);
  const latestDatabaseMatchId = latestJobMatch?.databaseId ?? null;

  useEffect(() => {
    if (!roadmap) {
      return;
    }

    const generatedRoadmap = roadmap;
    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      persistLatestJobMatchRoadmap(generatedRoadmap);
      void syncRoadmapToDatabase();
    }, 0);

    async function syncRoadmapToDatabase() {
      if (!latestDatabaseMatchId) {
        if (isActive) {
          setRoadmapSyncState({
            status: "local-only",
            message:
              "Roadmap built in this browser. Account save will retry after your latest match is saved.",
          });
        }
        return;
      }

      try {
        const result = await updateCurrentUserJobMatchRoadmap({
          id: latestDatabaseMatchId,
          roadmap: generatedRoadmap,
        });

        if (!isActive) {
          return;
        }

        if (!result.ok) {
          setRoadmapSyncState({
            status: "local-only",
            message: getRoadmapLocalOnlyMessage(result.error),
          });
          return;
        }

        persistLatestJobMatchRoadmap(generatedRoadmap);
        setRoadmapSyncState({
          status: "synced",
          message: "Roadmap synced to your account.",
        });
      } catch {
        if (!isActive) {
          return;
        }

        setRoadmapSyncState({
          status: "local-only",
          message:
            "Roadmap built in this browser. Account save did not finish right now.",
        });
      }
    }

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [latestDatabaseMatchId, roadmap]);

  if (!userProfile || !roadmap) {
    return (
      <DashboardLayout>
        <section className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className={premiumEyebrow}>
              Career Roadmap
            </p>

            <h1 className="mt-4 text-4xl font-black md:text-5xl">
              Build the missing source first.
            </h1>

            <p className="mt-4 text-slate-600">
              Your roadmap is built from resume proof, career direction, and
              your latest job match when available.
            </p>
          </div>

          <RoadmapSourceCard
            hasResume={Boolean(userProfile)}
            setupSource={setupSource}
            latestJobMatch={latestJobMatch}
          />

          <NextBestActionPanel className="mt-6" />

          <EmptyState
            eyebrow="Next Step"
            title="Analyze your resume to generate the roadmap."
            body="Setup gives SkillMint your direction, but resume intelligence is required before a truthful 30/60/90-day roadmap can be generated."
            href="/upload"
            action="Upload Resume"
          />
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <section className="mx-auto max-w-6xl">
        <div className={premiumHeroSurface}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className={premiumEyebrow}>
                Career Roadmap
              </p>

              <h1 className="mt-4 text-4xl font-black md:text-5xl">
                Career Roadmap
              </h1>

              <p className="mt-4 max-w-2xl text-slate-600">
                Your 30/60/90-day plan built from resume proof, career direction,
                and your latest job match when available.
              </p>
            </div>

            <Link
              href="/ats"
              className={premiumSecondaryCta}
            >
              Open ATS Match
            </Link>
          </div>
        </div>

        <RoadmapSourceCard
          hasResume={Boolean(userProfile)}
          setupSource={setupSource}
          latestJobMatch={latestJobMatch}
        />

        <NextBestActionPanel className="mt-6" />

        {!latestJobMatch && (
          <section className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-950">
            <h2 className="text-lg font-bold">
              Add a job description for a more targeted roadmap.
            </h2>

            <p className="mt-2 max-w-3xl text-sm leading-6">
              This version uses your resume profile only. A job description
              match unlocks role-specific gaps, keywords, and application
              strategy.
            </p>

            <Link
              href="/ats"
              className={`${premiumSecondaryCta} mt-4`}
            >
              Go to ATS Match
            </Link>
          </section>
        )}

        <ReadinessCard
          roadmap={roadmap}
          latestJobMatch={latestJobMatch}
        />

        {roadmapSyncState && (
          <RoadmapSyncStatusCard state={roadmapSyncState} />
        )}

        <div className="mt-6">
          <UpgradeInterestCard
            source="roadmap"
            title="Want a guided 30-day sprint?"
            body="SkillMint is free during beta. Paid plans are not required for this roadmap. Paid beta interest only helps shape deeper weekly missions, accountability, and advanced career plans."
            cta="Join paid beta"
          />
        </div>

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
    <section className="mx-auto mt-8 flex min-h-[38vh] max-w-3xl flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_14px_42px_rgba(15,23,42,0.06)]">
      <p className={premiumEyebrow}>
        {eyebrow}
      </p>

      <h1 className="mt-5 text-4xl font-black md:text-5xl">
        {title}
      </h1>

      <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
        {body}
      </p>

      <Link
        href={href}
        className={`${premiumPrimaryCta} mt-8`}
      >
        {action}
      </Link>
    </section>
  );
}

type RoadmapSyncStatusCardProps = {
  state: RoadmapSyncState;
};

type RoadmapSourceCardProps = {
  hasResume: boolean;
  setupSource: RoadmapSetupSource | null;
  latestJobMatch: LatestJobMatch | null;
};

function RoadmapSourceCard({
  hasResume,
  setupSource,
  latestJobMatch,
}: RoadmapSourceCardProps) {
  return (
    <section className={`mt-8 ${premiumSurface}`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className={premiumEyebrow}>
            Roadmap Source
          </p>

          <h2 className="mt-3 text-xl font-bold text-slate-950">
            Your source signals
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            SkillMint builds this plan from resume proof, career direction, and
            the latest job match when available. Active Target uses the latest
            job match first; Profile-fit roles are separate general role
            suggestions.
          </p>
        </div>

        {!latestJobMatch && (
          <Link
            href="/ats"
            className={premiumSecondaryCta}
          >
            Add job match
          </Link>
        )}
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <SourceSignal
          label="Resume proof"
          value={hasResume ? "Available" : "Missing"}
          tone={hasResume ? "success" : "warning"}
        />

        <SourceSignal
          label="Career direction"
          value={setupSource?.targetRole ?? "Not set"}
          tone={setupSource ? "success" : "warning"}
        />

        <SourceSignal
          label="Job match"
          value={formatLatestJobMatchSource(latestJobMatch)}
          tone={latestJobMatch ? "success" : "warning"}
        />
      </div>

      {!latestJobMatch && (
        <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
          Add a job description in ATS Match to make this roadmap more
          job-specific.
        </p>
      )}
    </section>
  );
}

type SourceSignalProps = {
  label: string;
  value: string;
  tone: "success" | "warning";
};

function SourceSignal({ label, value, tone }: SourceSignalProps) {
  const toneClassName = tone === "success"
    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
    : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div className={`min-w-0 rounded-lg border p-4 ${toneClassName}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-75">
        {label}
      </p>

      <p className="mt-2 break-words text-sm font-bold">
        {value}
      </p>
    </div>
  );
}

function RoadmapSyncStatusCard({ state }: RoadmapSyncStatusCardProps) {
  const isSynced = state.status === "synced";

  return (
    <section
      className={`mt-4 rounded-lg border p-4 ${
        isSynced
          ? "border-emerald-200 bg-emerald-50"
          : "border-amber-200 bg-amber-50"
      }`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {isSynced ? "Roadmap synced" : "Roadmap local"}
          </p>

          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-700">
            {state.message}
          </p>
        </div>

        <span className={premiumBadge}>
          {isSynced ? "Synced" : "Local"}
        </span>
      </div>
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
    <section className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-950 shadow-[0_14px_42px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
            Current Readiness
          </p>

          <h2 className="mt-4 break-words text-3xl font-black text-slate-950">
            {roadmap.targetRole}
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-emerald-950">
            {roadmap.brutalSummary}
          </p>
        </div>

        <div className="shrink-0">
          <span className={getReadinessClassName(roadmap.readiness)}>
            {roadmap.readiness}
          </span>

          {latestJobMatch && (
            <p className="mt-3 text-right text-sm text-emerald-800">
              Latest match: {latestJobMatch.result.matchScore}%
            </p>
          )}
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-emerald-200 bg-white p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-800">
          Current Blockers
        </h3>

        <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
          {roadmap.currentBlockers.map((blocker) => (
            <li
              key={blocker}
              className="break-words border-l border-emerald-300 pl-3"
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
    <section className={premiumCompactSurface}>
      <h2 className="text-xl font-bold text-slate-950">
        {phase.title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-600">
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
    <section className={`mt-6 ${premiumSurface}`}>
      <div>
        <h2 className="text-xl font-bold text-slate-950">
          {title}
        </h2>

        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
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
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-5">
      <TaskMeta task={task} />

      <h3 className="mt-4 break-words text-lg font-bold text-slate-950">
        {task.title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {task.reason}
      </p>

      <p className="mt-3 text-sm leading-6 text-slate-800">
        {task.action}
      </p>
    </article>
  );
}

function CompactTaskCard({ task }: TaskCardProps) {
  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <TaskMeta task={task} />

      <h3 className="mt-3 break-words text-base font-bold text-slate-950">
        {task.title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-700">
        {task.action}
      </p>
    </article>
  );
}

function TaskMeta({ task }: TaskCardProps) {
  const effort = getTaskEffort(task);
  const impact = getTaskImpact(task);

  return (
    <div className="flex flex-wrap gap-2">
      <span className={getPriorityClassName(task.priority)}>
        Priority: {task.priority}
      </span>

      <span className={getEffortClassName(effort)}>
        Effort: {effort}
      </span>

      <span className={getImpactClassName(impact)}>
        Impact: {impact}
      </span>

      <span className={premiumBadge}>
        {task.estimatedTime}
      </span>
    </div>
  );
}

type RoadmapEffort = "Low" | "Medium" | "High";
type RoadmapImpact =
  | "Proof"
  | "ATS"
  | "Recruiter Trust"
  | "Portfolio"
  | "Interview"
  | "Skill Gap";

function getTaskEffort(task: RoadmapTask): RoadmapEffort {
  const taskText = `${task.title} ${task.action} ${task.estimatedTime}`
    .toLowerCase();

  if (/\b(15|20|30|45)\s*(min|mins|minutes)\b/.test(taskText)) {
    return "Low";
  }

  if (
    taskText.includes("deploy") ||
    taskText.includes("build") ||
    taskText.includes("project") ||
    taskText.includes("portfolio") ||
    taskText.includes("case study")
  ) {
    return "High";
  }

  if (
    taskText.includes("rewrite") ||
    taskText.includes("readme") ||
    taskText.includes("screenshots") ||
    taskText.includes("practice") ||
    taskText.includes("tracker")
  ) {
    return "Medium";
  }

  if (
    taskText.includes("add") ||
    taskText.includes("list") ||
    taskText.includes("review")
  ) {
    return "Low";
  }

  if (task.priority === "High") {
    return "Medium";
  }

  return "Low";
}

function getTaskImpact(task: RoadmapTask): RoadmapImpact {
  const taskText = `${task.title} ${task.reason} ${task.action}`.toLowerCase();

  if (task.category === "ATS" || taskText.includes("keyword")) {
    return "ATS";
  }

  if (task.category === "Interview" || taskText.includes("interview")) {
    return "Interview";
  }

  if (
    task.category === "Skills" ||
    taskText.includes("missing skill") ||
    taskText.includes("learn")
  ) {
    return "Skill Gap";
  }

  if (
    task.category === "GitHub" ||
    task.category === "Portfolio" ||
    taskText.includes("github") ||
    taskText.includes("portfolio") ||
    taskText.includes("demo")
  ) {
    return "Portfolio";
  }

  if (
    task.category === "Applications" ||
    taskText.includes("recruiter") ||
    taskText.includes("linkedin")
  ) {
    return "Recruiter Trust";
  }

  return "Proof";
}

type ApplicationStrategyProps = {
  items: string[];
};

function ApplicationStrategy({ items }: ApplicationStrategyProps) {
  return (
    <section className={`mt-6 ${premiumSurface}`}>
      <h2 className="text-xl font-bold text-slate-950">
        Application Strategy
      </h2>

      <ul className="mt-5 grid gap-3 text-sm leading-6 text-slate-700 lg:grid-cols-2">
        {items.map((item) => (
          <li
            key={item}
            className="break-words rounded-2xl border border-slate-200 bg-slate-50 p-4"
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
    return `${baseClassName} border-emerald-300 bg-white text-emerald-800`;
  }

  if (readiness === "Apply selectively") {
    return `${baseClassName} border-sky-300 bg-white text-sky-800`;
  }

  if (readiness === "Getting ready") {
    return `${baseClassName} border-amber-300 bg-white text-amber-800`;
  }

  return `${baseClassName} border-rose-300 bg-white text-rose-800`;
}

function getPriorityClassName(priority: RoadmapTask["priority"]): string {
  const baseClassName =
    "rounded-full border px-3 py-1 text-xs font-semibold";

  if (priority === "High") {
    return `${baseClassName} border-rose-200 bg-rose-50 text-rose-800`;
  }

  if (priority === "Medium") {
    return `${baseClassName} border-amber-200 bg-amber-50 text-amber-800`;
  }

  return `${baseClassName} border-emerald-200 bg-emerald-50 text-emerald-800`;
}

function getEffortClassName(effort: RoadmapEffort): string {
  const baseClassName =
    "rounded-full border px-3 py-1 text-xs font-semibold";

  if (effort === "High") {
    return `${baseClassName} border-slate-300 bg-white text-slate-800`;
  }

  if (effort === "Medium") {
    return `${baseClassName} border-sky-200 bg-sky-50 text-sky-800`;
  }

  return `${baseClassName} border-slate-200 bg-white text-slate-700`;
}

function getImpactClassName(impact: RoadmapImpact): string {
  const baseClassName =
    "rounded-full border px-3 py-1 text-xs font-semibold";

  if (impact === "Proof") {
    return `${baseClassName} border-emerald-200 bg-emerald-50 text-emerald-800`;
  }

  if (impact === "ATS") {
    return `${baseClassName} border-sky-200 bg-sky-50 text-sky-800`;
  }

  if (impact === "Recruiter Trust") {
    return `${baseClassName} border-amber-200 bg-amber-50 text-amber-800`;
  }

  if (impact === "Portfolio") {
    return `${baseClassName} border-slate-300 bg-white text-slate-800`;
  }

  if (impact === "Interview") {
    return `${baseClassName} border-rose-200 bg-rose-50 text-rose-800`;
  }

  return `${baseClassName} border-sky-200 bg-sky-50 text-sky-800`;
}

function subscribeToStoredData(onStoreChange: () => void): () => void {
  return subscribeToSkillMintWorkspaceUpdates(onStoreChange);
}

function readStoredAnalysis(): string | null {
  return getBrowserStorage()?.getItem(RESUME_ANALYSIS_STORAGE_KEY) ?? null;
}

function readStoredJobMatch(): string | null {
  return getBrowserStorage()?.getItem(JD_MATCH_STORAGE_KEY) ?? null;
}

function readStoredSetup(): string | null {
  return getBrowserStorage()?.getItem(TARGET_ROLE_SETUP_STORAGE_KEY) ?? null;
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
      id: isString(parsedJobMatch.id) ? parsedJobMatch.id : undefined,
      databaseId: isString(parsedJobMatch.databaseId)
        ? parsedJobMatch.databaseId
        : getDatabaseIdFromLegacyId(parsedJobMatch.id),
      jobTitle: isString(parsedJobMatch.jobTitle)
        ? parsedJobMatch.jobTitle
        : undefined,
      companyName: isString(parsedJobMatch.companyName)
        ? parsedJobMatch.companyName
        : undefined,
      jobDescription: isString(parsedJobMatch.jobDescription)
        ? parsedJobMatch.jobDescription
        : undefined,
      result: parsedJobMatch.result,
      improvementPlan: isResumeImprovementPlan(
        parsedJobMatch.improvementPlan,
      )
        ? parsedJobMatch.improvementPlan
        : null,
      rewritePlan: isResumeRewritePlan(parsedJobMatch.rewritePlan)
        ? parsedJobMatch.rewritePlan
        : null,
      roadmap: parsedJobMatch.roadmap,
    };
  } catch {
    return null;
  }
}

function parseSetupSource(storedSetup: string | null): RoadmapSetupSource | null {
  if (!storedSetup) {
    return null;
  }

  try {
    const parsedSetup = JSON.parse(storedSetup);

    if (!isRecord(parsedSetup) || !isString(parsedSetup.targetRole)) {
      return null;
    }

    const targetRole = parsedSetup.targetRole.trim();

    return targetRole ? { targetRole } : null;
  } catch {
    return null;
  }
}

function formatLatestJobMatchSource(
  latestJobMatch: LatestJobMatch | null,
): string {
  if (!latestJobMatch) {
    return "Not added";
  }

  if (latestJobMatch.jobTitle && latestJobMatch.companyName) {
    return `${latestJobMatch.jobTitle} at ${latestJobMatch.companyName}`;
  }

  if (latestJobMatch.jobTitle) {
    return latestJobMatch.jobTitle;
  }

  return `${latestJobMatch.result.matchScore}% match`;
}

function getRoadmapRoleContext(
  latestJobMatch: LatestJobMatch | null,
  setupSource: RoadmapSetupSource | null,
): string | undefined {
  if (latestJobMatch?.jobTitle && latestJobMatch.companyName) {
    return `${latestJobMatch.jobTitle} at ${latestJobMatch.companyName}`;
  }

  if (latestJobMatch?.jobTitle) {
    return latestJobMatch.jobTitle;
  }

  return setupSource?.targetRole;
}

function persistLatestJobMatchRoadmap(roadmap: CareerRoadmap): void {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    const storedJobMatch = storage.getItem(JD_MATCH_STORAGE_KEY);

    if (!storedJobMatch) {
      return;
    }

    const parsedJobMatch = JSON.parse(storedJobMatch);

    if (!isRecord(parsedJobMatch)) {
      return;
    }

    storage.setItem(
      JD_MATCH_STORAGE_KEY,
      JSON.stringify({
        ...parsedJobMatch,
        roadmap,
      }),
    );
    notifySkillMintWorkspaceUpdated();
  } catch {
    return;
  }
}

function getRoadmapLocalOnlyMessage(error: string): string {
  if (isMissingSupabaseConfigError(error)) {
    return "Roadmap built in this browser. Account saving is unavailable.";
  }

  if (error.includes("Sign in")) {
    return "Roadmap built in this browser. Sign in to save your progress.";
  }

  return error || "Roadmap built in this browser. Account save did not finish.";
}

function isMissingSupabaseConfigError(error: string): boolean {
  const normalizedError = error.toLowerCase();

  return (
    normalizedError.includes("supabase") &&
    normalizedError.includes("environment variables") &&
    normalizedError.includes("missing")
  );
}

function getDatabaseIdFromLegacyId(value: unknown): string | undefined {
  return isString(value) && isUuid(value) ? value : undefined;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    .test(value);
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
