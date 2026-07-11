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
  premiumInput,
  premiumPageStack,
  premiumPrimaryCta,
  premiumSecondaryCta,
  premiumSurface,
  premiumWarningSurface,
} from "@/components/ui/premium";
import {
  generateCareerRoadmap,
  type CareerRoadmap,
} from "@/intelligence/core/careerRoadmap";
import type { JobDescriptionMatchResult } from "@/intelligence/core/jobDescriptionMatch";
import type { ResumeImprovementPlan } from "@/intelligence/core/resumeImprovement";
import type {
  ResumeRewritePlan,
  ResumeRewriteSuggestion,
} from "@/intelligence/core/resumeRewrite";
import type {
  Mission,
  MissionStatus,
  MissionStatusMap,
} from "@/intelligence/missions";
import {
  isMissionStatus,
  MISSION_STATUS_STORAGE_DESCRIPTOR,
  SELECTED_CAREER_PATH_STORAGE_DESCRIPTOR,
  setMissionStatus,
  setSelectedCareerPathId,
} from "@/intelligence/missions";
import {
  buildCareerPathEngineResult,
  type CareerPathEngineResult,
  type CareerPathPhase,
  type CareerPathTrack,
} from "@/intelligence/roadmap";
import {
  buildActiveTargetEngineResult,
  createActiveTargetResumeContextFromStoredAnalysis,
  isResumeContextCurrent,
  parseActiveTarget,
  readActiveTargetStorageSnapshot,
  type ActiveTarget,
  type ActiveTargetResumeContext,
} from "@/intelligence/target";
import type { UserProfile } from "@/intelligence/types/profile";
import {
  notifySkillMintWorkspaceUpdated,
  subscribeToSkillMintWorkspaceUpdates,
} from "@/lib/storage/skillMintStorageEvents";
import { useCareerData } from "@/modules/dashboard/hooks/useCareerData";
import {
  NextBestActionPanel,
  UpgradeInterestCard,
} from "@/modules/activation";
import { updateCurrentUserJobMatchRoadmap } from "@/modules/jobMatch";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import {
  TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR,
} from "@/modules/onboarding/storage/targetRoleSetupStorage";
import {
  readActiveResumeReportSnapshot,
} from "@/modules/resume/services/activeResumeReportStorage";
import {
  readCurrentJobMatchSnapshot,
  writeCurrentJobMatchSnapshot,
} from "@/lib/storage/jdMatchCurrentStorage";
import { readVisibleStorageValue } from "@/lib/storage/ownedSkillMintStorage";

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
  resumeContext?: ActiveTargetResumeContext;
};

type RoadmapSetupSource = {
  targetRole: string;
  careerField?: string;
};

type StoredAnalysisContext = {
  profile: UserProfile;
  extractedText: string;
};

type RoadmapSyncState = {
  status: "synced" | "local-only";
  message: string;
};

type CopyState = {
  key: string;
  status: "idle" | "copied" | "failed";
};

const USER_SELECTABLE_STATUSES: Array<{
  value: MissionStatus;
  label: string;
}> = [
  {
    value: "suggested",
    label: "Suggested",
  },
  {
    value: "started",
    label: "Started",
  },
  {
    value: "done_by_user",
    label: "Marked done",
  },
  {
    value: "blocked",
    label: "Blocked",
  },
];

export default function RoadmapPage() {
  const {
    user,
    isLoading: isAuthLoading,
  } = useAuthSession();
  const currentUserId = isAuthLoading ? undefined : user?.id ?? null;
  const storedAnalysis = useSyncExternalStore(
    subscribeToStoredData,
    () => readStoredAnalysis(currentUserId),
    getServerSnapshot,
  );
  const storedJobMatch = useSyncExternalStore(
    subscribeToStoredData,
    () => readStoredJobMatch(currentUserId),
    getServerSnapshot,
  );
  const storedSetup = useSyncExternalStore(
    subscribeToStoredData,
    () => readStoredSetup(currentUserId),
    getServerSnapshot,
  );
  const storedActiveTarget = useSyncExternalStore(
    subscribeToStoredData,
    readStoredActiveTarget,
    getServerSnapshot,
  );
  const storedMissionStatuses = useSyncExternalStore(
    subscribeToStoredData,
    () => readStoredMissionStatuses(currentUserId),
    getServerSnapshot,
  );
  const selectedPathId = useSyncExternalStore(
    subscribeToStoredData,
    () => readStoredSelectedPath(currentUserId),
    getServerSnapshot,
  );
  const data = useCareerData(currentUserId);
  const analysisContext = useMemo(
    () => getStoredAnalysisContext(storedAnalysis),
    [storedAnalysis],
  );
  const resumeContext = useMemo(
    () => createActiveTargetResumeContextFromStoredAnalysis(storedAnalysis),
    [storedAnalysis],
  );
  const latestJobMatch = useMemo(
    () => parseLatestJobMatch(storedJobMatch, resumeContext),
    [resumeContext, storedJobMatch],
  );
  const setupSource = useMemo(
    () => parseSetupSource(storedSetup),
    [storedSetup],
  );
  const rawActiveTarget = useMemo(
    () => parseActiveTarget(storedActiveTarget, {
      currentUserId,
    }),
    [currentUserId, storedActiveTarget],
  );
  const activeTargetResult = useMemo(
    () =>
      buildActiveTargetEngineResult({
        activeTarget: rawActiveTarget,
        hasResumeAnalysis: Boolean(analysisContext),
        resumeContext,
        careerIQ: analysisContext ? data.careerIQ : null,
        proof: analysisContext ? data.proof : null,
        roleMatches: analysisContext ? data.roleMatches : [],
        latestJobMatch: latestJobMatch
          ? {
              title: formatLatestJobMatchSource(latestJobMatch),
              companyName: latestJobMatch.companyName,
              roleTitle: latestJobMatch.jobTitle,
              jobDescription: latestJobMatch.jobDescription,
              result: latestJobMatch.result,
            }
          : null,
        targetRole: data.targetRole ?? setupSource?.targetRole,
        careerField: data.careerField ?? setupSource?.careerField,
      }),
    [
      analysisContext,
      data.careerField,
      data.careerIQ,
      data.proof,
      data.roleMatches,
      data.targetRole,
      latestJobMatch,
      rawActiveTarget,
      resumeContext,
      setupSource,
    ],
  );
  const activeTarget = activeTargetResult.activeTarget;
  const missionStatusMap = useMemo(
    () => parseMissionStatusMap(storedMissionStatuses),
    [storedMissionStatuses],
  );
  const [roadmapSyncState, setRoadmapSyncState] =
    useState<RoadmapSyncState | null>(null);
  const [copyState, setCopyState] = useState<CopyState>({
    key: "",
    status: "idle",
  });
  const roadmapRoleContext = useMemo(
    () => getRoadmapRoleContext(latestJobMatch, setupSource),
    [latestJobMatch, setupSource],
  );
  const legacyRoadmap = useMemo(() => {
    if (!analysisContext) {
      return null;
    }

    return generateCareerRoadmap(
      analysisContext.profile,
      latestJobMatch?.result ?? null,
      latestJobMatch?.improvementPlan ?? null,
      latestJobMatch?.rewritePlan ?? null,
      {
        targetRole: roadmapRoleContext,
        setupTargetRole: setupSource?.targetRole,
        jobDescription: latestJobMatch?.jobDescription,
      },
    );
  }, [analysisContext, latestJobMatch, roadmapRoleContext, setupSource]);
  const careerPathResult = useMemo(() => {
    if (!analysisContext) {
      return null;
    }

    const targetLatestJobMatch = getLatestJobMatchForActiveTarget(
      activeTarget,
      latestJobMatch,
    );

    return buildCareerPathEngineResult({
      profile: data.profile,
      careerIQ: data.careerIQ,
      proof: data.proof,
      roleMatches: data.roleMatches,
      latestJobMatch: targetLatestJobMatch
        ? {
            title: targetLatestJobMatch.title,
            companyName: targetLatestJobMatch.companyName,
            result: targetLatestJobMatch.result,
          }
        : null,
      activeTarget,
      resumeContext,
      targetRole: activeTarget?.targetRole ??
        data.targetRole ??
        setupSource?.targetRole,
      careerField: data.careerField ?? setupSource?.careerField,
      missionStatusMap,
      selectedPathId,
      resumeText: analysisContext.extractedText,
    });
  }, [
    analysisContext,
    data.careerField,
    data.careerIQ,
    data.profile,
    data.proof,
    data.roleMatches,
    data.targetRole,
    activeTarget,
    latestJobMatch,
    missionStatusMap,
    resumeContext,
    selectedPathId,
    setupSource,
  ]);
  const selectedTrack = getSelectedTrack(careerPathResult);
  const latestDatabaseMatchId = latestJobMatch?.databaseId ?? null;

  useEffect(() => {
    if (!legacyRoadmap) {
      return;
    }

    const generatedRoadmap = legacyRoadmap;
    let isActive = true;
    const timeoutId = window.setTimeout(() => {
      persistLatestJobMatchRoadmap(generatedRoadmap, {
        currentUserId,
      });
      void syncRoadmapToDatabase();
    }, 0);

    async function syncRoadmapToDatabase() {
      if (!latestDatabaseMatchId) {
        if (isActive) {
          setRoadmapSyncState({
            status: "local-only",
            message:
              "Career Path Engine is saved in this browser. Account roadmap sync will retry after your latest match is saved.",
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

        persistLatestJobMatchRoadmap(generatedRoadmap, {
          currentUserId,
        });
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
            "Career Path Engine is saved in this browser. Account roadmap sync did not finish right now.",
        });
      }
    }

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [currentUserId, latestDatabaseMatchId, legacyRoadmap]);

  function handleSelectPath(pathId: string) {
    setSelectedCareerPathId(pathId, {
      currentUserId,
    });
    notifySkillMintWorkspaceUpdated();
  }

  function handleMissionStatusChange(
    missionId: string,
    status: MissionStatus,
  ) {
    if (status === "evidence_detected") {
      return;
    }

    setMissionStatus(missionId, status, {
      currentUserId,
    });
    notifySkillMintWorkspaceUpdated();
  }

  async function handleCopy(key: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState({
        key,
        status: "copied",
      });
    } catch {
      setCopyState({
        key,
        status: "failed",
      });
    }
  }

  if (!analysisContext || !careerPathResult || !selectedTrack) {
    return (
      <DashboardLayout>
        <section className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className={premiumEyebrow}>
              Mission Execution
            </p>

            <h1 className="mt-4 text-4xl font-black md:text-5xl">
              Build the missing source first.
            </h1>

            <p className="mt-4 text-slate-600">
              SkillMint needs an active resume report before it can create
              proof-aware missions or career paths.
            </p>
          </div>

          <RoadmapSourceCard
            hasResume={Boolean(analysisContext)}
            setupSource={setupSource}
            latestJobMatch={latestJobMatch}
            activeTarget={activeTarget}
            activeTargetJdMatchStatus={activeTargetResult.jdMatchStatus}
          />

          <NextBestActionPanel className="mt-6" />

          <EmptyState
            eyebrow="Next step"
            title="Analyze your resume to generate missions."
            body="Setup gives SkillMint your direction, but resume evidence is required before a truthful Mission Execution plan can be generated."
            href="/upload"
            action="Upload resume"
          />
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className={premiumPageStack}>
        <section className={premiumHeroSurface}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className={premiumEyebrow}>
                Mission Execution
              </p>

              <h1 className="mt-4 break-words text-4xl font-black md:text-5xl">
                Career Path Engine
              </h1>

              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                Choose one path at a time. Missions help you build proof, but
                only resume re-analysis can move a score or detect evidence.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className={premiumSecondaryCta}
              >
                View dashboard
              </Link>

              <Link
                href="/ats"
                className={premiumSecondaryCta}
              >
                Open ATS Match
              </Link>
            </div>
          </div>
        </section>

        <RoadmapSourceCard
          hasResume={Boolean(analysisContext)}
          setupSource={setupSource}
          latestJobMatch={latestJobMatch}
          activeTarget={activeTarget}
          activeTargetJdMatchStatus={activeTargetResult.jdMatchStatus}
        />

        <PathSelector
          result={careerPathResult}
          selectedPathId={selectedTrack.id}
          onSelect={handleSelectPath}
        />

        <SelectedPathPanel
          track={selectedTrack}
          nextBestMissions={careerPathResult.nextBestMissions}
          copyState={copyState}
          onCopy={handleCopy}
        />

        <section className="grid gap-5 xl:grid-cols-3">
          {selectedTrack.phases.map((phase) => (
            <PathPhaseCard
              key={phase.window}
              phase={phase}
              copyState={copyState}
              onCopy={handleCopy}
              onStatusChange={handleMissionStatusChange}
            />
          ))}
        </section>

        <section className={premiumWarningSurface}>
          <p className="text-sm font-bold text-amber-950">
            Mission trust rule
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-900">
            Marked done is self-progress, not proof verification. Missing proof
            means unverified, not false. Re-upload the resume when evidence is
            visible so SkillMint can detect the latest state.
          </p>
        </section>

        {roadmapSyncState && (
          <RoadmapSyncStatusCard state={roadmapSyncState} />
        )}

        <NextBestActionPanel />

        <UpgradeInterestCard
          source="roadmap"
          title="Want a guided 30-day sprint?"
          body="SkillMint is free during beta. Paid plans are not required for this roadmap. Paid beta interest only helps shape deeper proof reviews and career planning."
          cta="Join paid beta"
        />
      </div>
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

type RoadmapSourceCardProps = {
  hasResume: boolean;
  setupSource: RoadmapSetupSource | null;
  latestJobMatch: LatestJobMatch | null;
  activeTarget: ActiveTarget | null;
  activeTargetJdMatchStatus: string;
};

function RoadmapSourceCard({
  hasResume,
  setupSource,
  latestJobMatch,
  activeTarget,
  activeTargetJdMatchStatus,
}: RoadmapSourceCardProps) {
  return (
    <section className={premiumSurface}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className={premiumEyebrow}>
            Roadmap Source
          </p>

          <h2 className="mt-3 text-xl font-bold text-slate-950">
            Your source signals
          </h2>

          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Closest Role Path uses Profile-fit roles. Latest JD Path uses one
            pasted job description. Ultimate Goal Path uses setup direction.
            SkillMint keeps those sources separate.
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

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SourceSignal
          label="Active resume report"
          value={hasResume ? "Available" : "Missing"}
          tone={hasResume ? "success" : "warning"}
        />

        <SourceSignal
          label="Ultimate goal"
          value={setupSource?.targetRole ?? "Not set"}
          tone={setupSource ? "success" : "warning"}
        />

        <SourceSignal
          label="Latest JD Match"
          value={formatLatestJobMatchSource(latestJobMatch)}
          tone={latestJobMatch ? "success" : "warning"}
        />

        <SourceSignal
          label="Active Target"
          value={formatActiveTargetSource(
            activeTarget,
            activeTargetJdMatchStatus,
          )}
          tone={activeTarget ? "success" : "warning"}
        />
      </div>
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

type PathSelectorProps = {
  result: CareerPathEngineResult;
  selectedPathId: string;
  onSelect: (pathId: string) => void;
};

function PathSelector({
  result,
  selectedPathId,
  onSelect,
}: PathSelectorProps) {
  return (
    <section className={premiumSurface}>
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <p className={premiumEyebrow}>
            Path selector
          </p>

          <h2 className="mt-2 text-2xl font-black text-slate-950">
            Pick the plan you want to execute.
          </h2>
        </div>

        <span className={premiumBadge}>
          One path shown at a time
        </span>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-3">
        {result.tracks.map((track) => {
          const isSelected = track.id === selectedPathId;
          const isRecommended = track.id === result.recommendedPathId;

          return (
            <button
              key={track.id}
              type="button"
              onClick={() => onSelect(track.id)}
              className={`min-w-0 rounded-2xl border p-4 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                isSelected
                  ? "border-emerald-300 bg-emerald-50 text-emerald-950"
                  : "border-slate-200 bg-white text-slate-900 hover:border-emerald-200 hover:bg-emerald-50"
              }`}
            >
              <div className="flex flex-wrap gap-2">
                <span className={premiumBadge}>
                  {formatTrackStatus(track.status)}
                </span>

                {isRecommended && (
                  <span className="inline-flex rounded-full border border-emerald-200 bg-white px-3 py-1 text-xs font-semibold text-emerald-800">
                    Recommended
                  </span>
                )}
              </div>

              <h3 className="mt-4 break-words text-base font-black">
                {track.title}
              </h3>

              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-600">
                {track.status === "available"
                  ? track.summary
                  : track.lockedReason ?? track.summary}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

type SelectedPathPanelProps = {
  track: CareerPathTrack;
  nextBestMissions: Mission[];
  copyState: CopyState;
  onCopy: (key: string, value: string) => void;
};

function SelectedPathPanel({
  track,
  nextBestMissions,
  copyState,
  onCopy,
}: SelectedPathPanelProps) {
  const pathCopy = buildTrackCopyText(track);
  const planCopy = buildFullPlanCopyText(track);

  return (
    <section className={premiumHeroSurface}>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap gap-2">
            <span className={premiumBadge}>
              {track.label}
            </span>

            <span className={premiumBadge}>
              {formatTrackStatus(track.status)}
            </span>

            {track.targetRole && (
              <span className={premiumBadge}>
                Target: {track.targetRole}
              </span>
            )}
          </div>

          <h2 className="mt-4 break-words text-3xl font-black text-slate-950">
            {track.title}
          </h2>

          <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
            {track.summary}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onCopy("path-summary", pathCopy)}
            className={premiumSecondaryCta}
          >
            {getCopyLabel(copyState, "path-summary", "Copy path summary")}
          </button>

          <button
            type="button"
            onClick={() => onCopy("full-plan", planCopy)}
            className={premiumSecondaryCta}
          >
            {getCopyLabel(copyState, "full-plan", "Copy full plan")}
          </button>
        </div>
      </div>

      {track.status === "available" ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <PathInsight
            label="Current reality"
            value={track.currentReality}
          />

          <PathInsight
            label="Main gap"
            value={track.mainGap}
          />

          <PathInsight
            label="Next best things"
            value={formatNextBestMissions(nextBestMissions)}
          />
        </div>
      ) : (
        <div className={`mt-6 ${premiumWarningSurface}`}>
          <p className="text-sm font-bold text-amber-950">
            {track.lockedReason ?? track.mainGap}
          </p>

          <p className="mt-2 text-sm leading-6 text-amber-900">
            SkillMint keeps unavailable paths locked instead of inventing
            missions from missing context.
          </p>
        </div>
      )}
    </section>
  );
}

type PathInsightProps = {
  label: string;
  value: string;
};

function PathInsight({ label, value }: PathInsightProps) {
  return (
    <article className={premiumCompactSurface}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>

      <p className="mt-3 break-words text-sm leading-6 text-slate-700">
        {value}
      </p>
    </article>
  );
}

type PathPhaseCardProps = {
  phase: CareerPathPhase;
  copyState: CopyState;
  onCopy: (key: string, value: string) => void;
  onStatusChange: (missionId: string, status: MissionStatus) => void;
};

function PathPhaseCard({
  phase,
  copyState,
  onCopy,
  onStatusChange,
}: PathPhaseCardProps) {
  return (
    <section className={`${premiumSurface} min-w-0`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className={premiumEyebrow}>
            {formatPhaseWindow(phase.window)}
          </p>

          <h2 className="mt-2 text-xl font-black text-slate-950">
            {phase.title}
          </h2>
        </div>

        <button
          type="button"
          onClick={() => onCopy(phase.window, buildPhaseCopyText(phase))}
          className={`${premiumSecondaryCta} px-4 py-2`}
        >
          {getCopyLabel(copyState, phase.window, "Copy")}
        </button>
      </div>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {phase.goal}
      </p>

      <div className="mt-5 space-y-4">
        {phase.missions.length ? (
          phase.missions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              copyState={copyState}
              onCopy={onCopy}
              onStatusChange={onStatusChange}
            />
          ))
        ) : (
          <article className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm leading-6 text-slate-600">
              This path needs a real source before missions can be generated.
            </p>
          </article>
        )}
      </div>
    </section>
  );
}

type MissionCardProps = {
  mission: Mission;
  copyState: CopyState;
  onCopy: (key: string, value: string) => void;
  onStatusChange: (missionId: string, status: MissionStatus) => void;
};

function MissionCard({
  mission,
  copyState,
  onCopy,
  onStatusChange,
}: MissionCardProps) {
  const isEvidenceDetected = mission.status === "evidence_detected";

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap gap-2">
        <span className={getStatusClassName(mission.status)}>
          {formatMissionStatus(mission.status)}
        </span>

        <span className={premiumBadge}>
          {mission.linkedScore}
        </span>

        <span className={premiumBadge}>
          Impact: {mission.impact}
        </span>

        <span className={premiumBadge}>
          Effort: {mission.difficulty}
        </span>
      </div>

      <h3 className="mt-4 break-words text-base font-black leading-snug text-slate-950">
        {mission.title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-700">
        {mission.whyThisMatters}
      </p>

      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Evidence needed
        </p>

        <p className="mt-2 text-sm leading-6 text-slate-700">
          {mission.evidenceNeeded}
        </p>
      </div>

      <ol className="mt-4 space-y-2 text-sm leading-6 text-slate-700">
        {mission.steps.map((step) => (
          <li
            key={step}
            className="break-words border-l border-slate-300 pl-3"
          >
            {step}
          </li>
        ))}
      </ol>

      <p className="mt-4 text-xs leading-5 text-slate-500">
        {mission.completionCheck}
      </p>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <label className="min-w-0 flex-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
          Status
          <select
            value={mission.status}
            disabled={isEvidenceDetected}
            onChange={(event) =>
              onStatusChange(
                mission.id,
                event.target.value as MissionStatus,
              )}
            className={`${premiumInput} mt-2 py-2`}
          >
            {isEvidenceDetected && (
              <option value="evidence_detected">
                Evidence detected
              </option>
            )}

            {USER_SELECTABLE_STATUSES.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={() =>
            onCopy(mission.id, mission.copyText ?? buildMissionCopyText(mission))
          }
          className={`${premiumSecondaryCta} px-4 py-2`}
        >
          {getCopyLabel(copyState, mission.id, "Copy")}
        </button>
      </div>

      {mission.status === "done_by_user" && (
        <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          Marked done. Re-upload your resume so SkillMint can check whether the
          evidence is now visible.
        </p>
      )}

      {isEvidenceDetected && (
        <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-900">
          Evidence detected from the latest resume analysis. This is not
          external proof verification.
        </p>
      )}
    </article>
  );
}

type RoadmapSyncStatusCardProps = {
  state: RoadmapSyncState;
};

function RoadmapSyncStatusCard({ state }: RoadmapSyncStatusCardProps) {
  const isSynced = state.status === "synced";

  return (
    <section
      className={`rounded-lg border p-4 ${
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

function subscribeToStoredData(onStoreChange: () => void): () => void {
  return subscribeToSkillMintWorkspaceUpdates(onStoreChange);
}

function readStoredAnalysis(
  currentUserId: string | null | undefined,
): string | null {
  return readActiveResumeReportSnapshot({
    currentUserId,
  });
}

function readStoredJobMatch(
  currentUserId: string | null | undefined,
): string | null {
  return readCurrentJobMatchSnapshot({
    currentUserId,
  });
}

function readStoredSetup(
  currentUserId: string | null | undefined,
): string | null {
  return readVisibleStorageValue(TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR, {
    currentUserId,
  });
}

function readStoredActiveTarget(): string | null {
  return readActiveTargetStorageSnapshot();
}

function readStoredMissionStatuses(
  currentUserId: string | null | undefined,
): string | null {
  return readVisibleStorageValue(MISSION_STATUS_STORAGE_DESCRIPTOR, {
    currentUserId,
  });
}

function readStoredSelectedPath(
  currentUserId: string | null | undefined,
): string | null {
  const storedValue = readVisibleStorageValue(
    SELECTED_CAREER_PATH_STORAGE_DESCRIPTOR,
    {
      currentUserId,
    },
  );

  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    return typeof parsedValue === "string" ? parsedValue : storedValue;
  } catch {
    return storedValue;
  }
}

function getServerSnapshot(): null {
  return null;
}

function getStoredAnalysisContext(
  storedAnalysis: string | null,
): StoredAnalysisContext | null {
  if (!storedAnalysis) {
    return null;
  }

  try {
    const parsedAnalysis = JSON.parse(storedAnalysis);

    if (!isRecord(parsedAnalysis) || !isUserProfile(parsedAnalysis.userProfile)) {
      return null;
    }

    return {
      profile: parsedAnalysis.userProfile,
      extractedText: isString(parsedAnalysis.extractedText)
        ? parsedAnalysis.extractedText
        : "",
    };
  } catch {
    return null;
  }
}

function parseLatestJobMatch(
  storedJobMatch: string | null,
  resumeContext: ActiveTargetResumeContext | null,
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

    const matchResumeContext = isActiveTargetResumeContext(
      parsedJobMatch.resumeContext,
    )
      ? parsedJobMatch.resumeContext
      : null;

    if (!isResumeContextCurrent(matchResumeContext, resumeContext)) {
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
      resumeContext: matchResumeContext ?? undefined,
    };
  } catch {
    return null;
  }
}

function isActiveTargetResumeContext(
  value: unknown,
): value is ActiveTargetResumeContext {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.fingerprint) &&
    (value.analyzedAt === undefined || isString(value.analyzedAt)) &&
    (value.fileName === undefined || isString(value.fileName)) &&
    (value.scoringVersion === undefined || isString(value.scoringVersion))
  );
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

    if (!targetRole) {
      return null;
    }

    return {
      targetRole,
      careerField: isString(parsedSetup.careerField)
        ? parsedSetup.careerField
        : undefined,
    };
  } catch {
    return null;
  }
}

function parseMissionStatusMap(
  storedMissionStatuses: string | null,
): MissionStatusMap {
  if (!storedMissionStatuses) {
    return {};
  }

  try {
    const parsedStatuses = JSON.parse(storedMissionStatuses);

    if (!isRecord(parsedStatuses)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedStatuses).filter(
        (entry): entry is [string, MissionStatus] =>
          isString(entry[0]) && isMissionStatus(entry[1]),
      ),
    );
  } catch {
    return {};
  }
}

function getSelectedTrack(
  result: CareerPathEngineResult | null,
): CareerPathTrack | null {
  if (!result) {
    return null;
  }

  return result.tracks.find((track) => track.id === result.selectedPathId) ??
    result.tracks.find((track) => track.id === result.recommendedPathId) ??
    result.tracks[0] ??
    null;
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

  return `${Math.round(latestJobMatch.result.matchScore)}% latest JD match`;
}

function formatActiveTargetSource(
  activeTarget: ActiveTarget | null,
  jdMatchStatus: string,
): string {
  if (!activeTarget) {
    return "Not set";
  }

  if (jdMatchStatus === "stale") {
    return "Re-run JD match for current resume";
  }

  if (activeTarget.companyName && activeTarget.roleTitle) {
    return `${activeTarget.roleTitle} at ${activeTarget.companyName}`;
  }

  return activeTarget.title;
}

function getLatestJobMatchForActiveTarget(
  activeTarget: ActiveTarget | null,
  latestJobMatch: LatestJobMatch | null,
): {
  title: string;
  companyName?: string;
  result: JobDescriptionMatchResult;
} | null {
  if (activeTarget?.source === "latest_jd" && activeTarget.jdMatch) {
    return {
      title: activeTarget.roleTitle ?? activeTarget.title,
      companyName: activeTarget.companyName,
      result: {
        matchScore: activeTarget.jdMatch.score,
        verdict: activeTarget.jdMatch.verdict ?? "Active Target JD Match",
        brutalReality: activeTarget.jdMatch.brutalReality ??
          "JD Match is based on one pasted job description.",
        matchedSkills: activeTarget.jdMatch.matchedSkills,
        missingSkills: activeTarget.jdMatch.missingSkills,
        missingKeywords: activeTarget.jdMatch.missingKeywords,
        strengths: activeTarget.jdMatch.strengths,
        weaknesses: activeTarget.jdMatch.weaknesses,
        recommendations: activeTarget.jdMatch.recommendations,
      },
    };
  }

  return latestJobMatch
    ? {
        title: formatLatestJobMatchSource(latestJobMatch),
        companyName: latestJobMatch.companyName,
        result: latestJobMatch.result,
      }
    : null;
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

function persistLatestJobMatchRoadmap(
  roadmap: CareerRoadmap,
  ownerContext: {
    currentUserId: string | null | undefined;
  },
): void {
  const storedJobMatch = readCurrentJobMatchSnapshot(ownerContext);

  try {
    if (!storedJobMatch) {
      return;
    }

    const parsedJobMatch = JSON.parse(storedJobMatch);

    if (!isRecord(parsedJobMatch)) {
      return;
    }

    if (!isJobDescriptionMatchResult(parsedJobMatch.result)) {
      return;
    }

    writeCurrentJobMatchSnapshot({
      id: isString(parsedJobMatch.id) ? parsedJobMatch.id : undefined,
      databaseId: isString(parsedJobMatch.databaseId)
        ? parsedJobMatch.databaseId
        : undefined,
      syncStatus: isJobMatchSyncStatus(parsedJobMatch.syncStatus)
        ? parsedJobMatch.syncStatus
        : undefined,
      jobTitle: isString(parsedJobMatch.jobTitle)
        ? parsedJobMatch.jobTitle
        : "Untitled Role",
      companyName: isString(parsedJobMatch.companyName)
        ? parsedJobMatch.companyName
        : "Unknown Company",
      jobDescription: isString(parsedJobMatch.jobDescription)
        ? parsedJobMatch.jobDescription
        : "",
      result: parsedJobMatch.result,
      improvementPlan: isResumeImprovementPlan(parsedJobMatch.improvementPlan)
        ? parsedJobMatch.improvementPlan
        : null,
      rewritePlan: isResumeRewritePlan(parsedJobMatch.rewritePlan)
        ? parsedJobMatch.rewritePlan
        : null,
      roadmap,
      resumeContext: isActiveTargetResumeContext(parsedJobMatch.resumeContext)
        ? parsedJobMatch.resumeContext
        : undefined,
      analyzedAt: isString(parsedJobMatch.analyzedAt)
        ? parsedJobMatch.analyzedAt
        : new Date().toISOString(),
    }, ownerContext);
  } catch {
    return;
  }
}

function isJobMatchSyncStatus(value: unknown): value is "synced" | "local-only" {
  return value === "synced" || value === "local-only";
}

function getRoadmapLocalOnlyMessage(error: string): string {
  if (isMissingSupabaseConfigError(error)) {
    return "Career Path Engine is saved in this browser. Account saving is unavailable.";
  }

  if (error.includes("Sign in")) {
    return "Career Path Engine is saved in this browser. Sign in to save your progress.";
  }

  return error ||
    "Career Path Engine is saved in this browser. Account save did not finish.";
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

function formatTrackStatus(status: CareerPathTrack["status"]): string {
  if (status === "available") return "Available";
  if (status === "locked") return "Locked";

  return "Empty";
}

function formatMissionStatus(status: MissionStatus): string {
  if (status === "done_by_user") return "Marked done";
  if (status === "evidence_detected") return "Evidence detected";

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getStatusClassName(status: MissionStatus): string {
  const baseClassName =
    "inline-flex rounded-full border px-3 py-1 text-xs font-semibold";

  if (status === "evidence_detected") {
    return `${baseClassName} border-emerald-200 bg-emerald-50 text-emerald-800`;
  }

  if (status === "done_by_user") {
    return `${baseClassName} border-amber-200 bg-amber-50 text-amber-800`;
  }

  if (status === "blocked") {
    return `${baseClassName} border-rose-200 bg-rose-50 text-rose-800`;
  }

  if (status === "started") {
    return `${baseClassName} border-sky-200 bg-sky-50 text-sky-800`;
  }

  return `${baseClassName} border-slate-200 bg-white text-slate-700`;
}

function formatPhaseWindow(window: CareerPathPhase["window"]): string {
  if (window === "30_days") return "30-day focus";
  if (window === "60_days") return "60-day build";

  return "90-day proof plan";
}

function formatNextBestMissions(missions: Mission[]): string {
  if (!missions.length) {
    return "No missions available until this path has a real source.";
  }

  return missions.slice(0, 3).map((mission) => mission.title).join(" | ");
}

function getCopyLabel(
  copyState: CopyState,
  key: string,
  fallback: string,
): string {
  if (copyState.key !== key) {
    return fallback;
  }

  if (copyState.status === "copied") return "Copied";
  if (copyState.status === "failed") return "Copy failed";

  return fallback;
}

function buildTrackCopyText(track: CareerPathTrack): string {
  return track.copyText ?? [
    "My SkillMint path:",
    `${track.title}: ${track.targetRole ?? track.label}`,
    `Current reality: ${track.currentReality}`,
    `Main gap: ${track.mainGap}`,
    "Marked done is not verification. Re-upload your resume so SkillMint can check whether evidence is visible.",
  ].join("\n");
}

function buildFullPlanCopyText(track: CareerPathTrack): string {
  return [
    buildTrackCopyText(track),
    ...track.phases.map(buildPhaseCopyText),
  ].join("\n\n");
}

function buildPhaseCopyText(phase: CareerPathPhase): string {
  const missionLines = phase.missions.map((mission, index) =>
    `${index + 1}. ${mission.title} - ${mission.evidenceNeeded}`
  );

  return [
    `${phase.title}: ${phase.goal}`,
    ...missionLines,
  ].join("\n");
}

function buildMissionCopyText(mission: Mission): string {
  return [
    `SkillMint mission: ${mission.title}`,
    `Linked score: ${mission.linkedScore}`,
    `Why: ${mission.whyThisMatters}`,
    `Evidence needed: ${mission.evidenceNeeded}`,
    `Completion check: ${mission.completionCheck}`,
  ].join("\n");
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
