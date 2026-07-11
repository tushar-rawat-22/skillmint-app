import {
  generateStructuredMissions,
  makeMissionId,
  type LatestJobMissionContext,
  type Mission,
  type MissionSourcePath,
  type MissionStatusMap,
} from "@/intelligence/missions";
import {
  isMissionEvidenceDetected,
  type MissionEvidenceContext,
} from "@/intelligence/missions/missionEvidence";
import type { ProofScoreResult } from "@/intelligence/proof";
import type { ActiveTarget } from "@/intelligence/target";
import type { UserProfile } from "@/intelligence/types/profile";
import type {
  CareerIQResult,
  RoleMatchResult,
} from "@/intelligence/types/results";

import type {
  CareerPathPhase,
  CareerPathSource,
  CareerPathStatus,
  CareerPathTrack,
} from "./careerPathContract";

export type RoadmapTrackGeneratorInput = {
  profile: UserProfile;
  careerIQ: CareerIQResult;
  proof: ProofScoreResult;
  roleMatches: RoleMatchResult[];
  latestJobMatch?: LatestJobMissionContext | null;
  activeTarget?: ActiveTarget | null;
  targetRole?: string | null;
  careerField?: string | null;
  missionStatusMap?: MissionStatusMap;
  resumeText?: string;
};

export function buildClosestRoleTrack(
  input: RoadmapTrackGeneratorInput,
  recommended: boolean,
): CareerPathTrack {
  const topRole = input.roleMatches[0];

  if (!topRole) {
    return buildLockedTrack({
      id: "path:profile-fit",
      source: "profile_fit",
      title: "Closest Role Path",
      label: "Closest Role Path",
      status: "empty",
      summary:
        "Upload a resume so SkillMint can find the role your current evidence is closest to.",
      currentReality:
        "SkillMint needs resume evidence before it can build a Profile-fit Path.",
      mainGap: "No profile-fit role data is available yet.",
      lockedReason: "Analyze a resume to unlock this path.",
      recommended,
    });
  }

  const missions = prepareTrackMissions(input, "profile_fit", topRole.role);
  const phases = buildPhases(missions, "profile_fit", topRole.role);

  return {
    id: "path:profile-fit",
    source: "profile_fit",
    title: "Closest Role Path",
    label: "Closest Role Path",
    status: "available",
    targetRole: topRole.role,
    summary:
      `Based on your current resume, this is the role you are closest to: ${topRole.role}.`,
    currentReality:
      `${topRole.role} is the strongest profile-fit direction at ${Math.round(topRole.matchScore)}%. This is separate from any Latest JD Match.`,
    mainGap: getMainGap(missions, "Build stronger proof for the closest role."),
    recommended,
    nextBestMissionId: missions[0]?.id,
    phases,
    copyText: buildPathCopyText("Closest Role", topRole.role, missions[0]),
  };
}

export function buildLatestJdTrack(
  input: RoadmapTrackGeneratorInput,
  recommended: boolean,
): CareerPathTrack {
  const latestJobMatch = input.latestJobMatch;

  if (!latestJobMatch) {
    return buildLockedTrack({
      id: "path:latest-jd",
      source: "latest_jd",
      title: "Latest JD Path",
      label: "Latest JD Path",
      status: "locked",
      summary:
        "Paste a job description in ATS Match to unlock this path.",
      currentReality:
        "No Latest JD Match is available. This path is intentionally locked until one pasted JD exists.",
      mainGap: "No pasted JD has been analyzed yet.",
      lockedReason:
        "Paste a job description in ATS Match to unlock this path.",
      recommended,
    });
  }

  const label = latestJobMatch.title?.trim() || "Latest pasted JD";
  const missions = prepareTrackMissions(input, "latest_jd", label);
  const phases = buildPhases(missions, "latest_jd", label);

  return {
    id: "path:latest-jd",
    source: "latest_jd",
    title: "Latest JD Path",
    label: "Latest JD Path",
    status: "available",
    targetRole: label,
    summary: input.activeTarget?.source === "latest_jd"
      ? "Based on your Active Target JD. This does not replace your Profile-fit path."
      : "Based on one pasted job description. This does not replace your Profile-fit path.",
    currentReality:
      `Latest JD Match is ${Math.round(latestJobMatch.result.matchScore)}% for ${label}.`,
    mainGap: getMainGap(
      missions,
      latestJobMatch.result.weaknesses[0] ??
        "Close the biggest truthful JD evidence gap.",
    ),
    recommended,
    nextBestMissionId: missions[0]?.id,
    phases,
    copyText: buildPathCopyText("Latest JD", label, missions[0]),
  };
}

export function buildUltimateGoalTrack(
  input: RoadmapTrackGeneratorInput,
  recommended: boolean,
): CareerPathTrack {
  const targetRole = input.targetRole?.trim();

  if (!targetRole) {
    return buildLockedTrack({
      id: "path:ultimate-goal",
      source: "ultimate_goal",
      title: "Ultimate Goal Path",
      label: "Ultimate Goal Path",
      status: "locked",
      summary:
        "Complete setup to unlock your Ultimate Goal Path.",
      currentReality:
        "No setup goal is stored yet. SkillMint will stay honest until the goal exists.",
      mainGap: "No ultimate goal has been set.",
      lockedReason:
        "Complete setup to unlock your Ultimate Goal Path.",
      recommended,
    });
  }

  const topRole = input.roleMatches[0];
  const missions = prepareTrackMissions(input, "ultimate_goal", targetRole);
  const phases = buildPhases(missions, "ultimate_goal", targetRole);
  const currentReality = topRole
    ? `Your current resume is closer to ${topRole.role}, while your goal points toward ${targetRole}.`
    : `Your goal points toward ${targetRole}, but SkillMint needs stronger resume evidence to compare the gap.`;

  return {
    id: "path:ultimate-goal",
    source: "ultimate_goal",
    title: "Ultimate Goal Path",
    label: "Ultimate Goal Path",
    status: "available",
    targetRole,
    summary:
      "Based on your setup goal. This may be farther from your current resume evidence.",
    currentReality,
    mainGap: getMainGap(missions, "Build goal-relevant evidence before claiming readiness."),
    recommended,
    nextBestMissionId: missions[0]?.id,
    phases,
    copyText: buildPathCopyText("Ultimate Goal", targetRole, missions[0]),
  };
}

function prepareTrackMissions(
  input: RoadmapTrackGeneratorInput,
  sourcePath: MissionSourcePath,
  targetLabel: string,
): Mission[] {
  const generatedMissions = generateStructuredMissions({
    profile: input.profile,
    careerIQ: input.careerIQ,
    proof: input.proof,
    roleMatches: input.roleMatches,
    latestJobMatch: input.latestJobMatch,
    activeTarget: input.activeTarget,
    targetRole: input.targetRole,
    careerField: input.careerField,
    sourcePath,
  });
  const withFallbacks = ensureMissionCount(
    generatedMissions,
    sourcePath,
    targetLabel,
  ).slice(0, 9);

  return applyStatuses(withFallbacks, input);
}

function buildPhases(
  missions: Mission[],
  source: CareerPathSource,
  targetLabel: string,
): CareerPathPhase[] {
  return [
    {
      window: "30_days",
      title: "30-day focus",
      goal: getPhaseGoal("30_days", source, targetLabel),
      missions: missions.slice(0, 3),
    },
    {
      window: "60_days",
      title: "60-day build",
      goal: getPhaseGoal("60_days", source, targetLabel),
      missions: missions.slice(3, 6),
    },
    {
      window: "90_days",
      title: "90-day proof plan",
      goal: getPhaseGoal("90_days", source, targetLabel),
      missions: missions.slice(6, 9),
    },
  ];
}

function applyStatuses(
  missions: Mission[],
  input: RoadmapTrackGeneratorInput,
): Mission[] {
  const evidenceContext: MissionEvidenceContext = {
    profile: input.profile,
    proof: input.proof,
    resumeText: input.resumeText,
  };

  return missions.map((mission) => {
    const evidenceDetected = isMissionEvidenceDetected(
      mission,
      evidenceContext,
    );
    const storedStatus = input.missionStatusMap?.[mission.id];

    if (evidenceDetected) {
      return {
        ...mission,
        status: "evidence_detected",
      };
    }

    if (!storedStatus || storedStatus === "evidence_detected") {
      return mission;
    }

    return {
      ...mission,
      status: storedStatus,
    };
  });
}

function ensureMissionCount(
  missions: Mission[],
  sourcePath: MissionSourcePath,
  targetLabel: string,
): Mission[] {
  const fallbackMissions = [
    createFallbackMission({
      sourcePath,
      targetLabel,
      suffix: "proof-polish",
      title: "Polish the strongest proof artifact",
      category: "portfolio",
      linkedScore: "Proof Confidence",
      priority: 520,
      evidenceNeeded:
        "A README, screenshot, demo, report, dashboard, case study, or short walkthrough.",
    }),
    createFallbackMission({
      sourcePath,
      targetLabel,
      suffix: "resume-proof-bullets",
      title: "Rewrite one resume bullet into proof",
      category: "resume",
      linkedScore: "Recruiter Confidence",
      priority: 500,
      evidenceNeeded:
        "A bullet that names the tool, action, result, and evidence candidate where available.",
    }),
    createFallbackMission({
      sourcePath,
      targetLabel,
      suffix: "interview-proof-story",
      title: "Prepare one proof story for interviews",
      category: "impact",
      linkedScore: "Recruiter Confidence",
      priority: 460,
      evidenceNeeded:
        "A concise story explaining problem, action, tradeoff, result, and limitation.",
    }),
    createFallbackMission({
      sourcePath,
      targetLabel,
      suffix: "second-proof-slice",
      title: "Build one small proof slice",
      category: "project",
      linkedScore: "Career IQ",
      priority: 440,
      evidenceNeeded:
        "A small but complete feature, dashboard, report, deployment, or case study tied to the path.",
    }),
    createFallbackMission({
      sourcePath,
      targetLabel,
      suffix: "truthful-keywords",
      title: "Add only truthful role language",
      category: "ats",
      linkedScore: "ATS Readiness",
      priority: 420,
      evidenceNeeded:
        "Role keywords connected to real project, work, certification, or education context.",
    }),
  ];
  const existingIds = new Set(missions.map((mission) => mission.id));
  const neededFallbacks = fallbackMissions.filter((mission) =>
    !existingIds.has(mission.id)
  );

  return [...missions, ...neededFallbacks];
}

function createFallbackMission({
  sourcePath,
  targetLabel,
  suffix,
  title,
  category,
  linkedScore,
  priority,
  evidenceNeeded,
}: {
  sourcePath: MissionSourcePath;
  targetLabel: string;
  suffix: string;
  title: string;
  category: Mission["category"];
  linkedScore: Mission["linkedScore"];
  priority: number;
  evidenceNeeded: string;
}): Mission {
  const idPrefix = sourcePath === "latest_jd"
    ? "latest-jd"
    : sourcePath === "ultimate_goal"
      ? "goal"
      : "profile-fit";

  return {
    id: makeMissionId([idPrefix, targetLabel, suffix]),
    title,
    category,
    status: "suggested",
    priority,
    impact: "medium",
    difficulty: category === "project" ? "hard" : "medium",
    linkedScore,
    sourcePath,
    whyThisMatters:
      "This keeps the path moving without pretending completion changes your score.",
    evidenceNeeded,
    steps: [
      "Pick one truthful evidence improvement.",
      "Make the evidence visible in the resume or linked artifact.",
      "Re-upload your resume so SkillMint can check the latest analysis.",
    ],
    completionCheck:
      "Marked done is not verification. Re-upload your resume so SkillMint can check whether the evidence is now visible.",
    expectedOutcome:
      "Can improve the linked score only after resume evidence changes and SkillMint detects it.",
    createdFrom: category === "ats" ? "ats_gap" : "resume_gap",
  };
}

function buildLockedTrack({
  id,
  source,
  title,
  label,
  status,
  summary,
  currentReality,
  mainGap,
  lockedReason,
  recommended,
}: {
  id: string;
  source: CareerPathSource;
  title: string;
  label: string;
  status: CareerPathStatus;
  summary: string;
  currentReality: string;
  mainGap: string;
  lockedReason: string;
  recommended: boolean;
}): CareerPathTrack {
  return {
    id,
    source,
    title,
    label,
    status,
    summary,
    currentReality,
    mainGap,
    recommended,
    lockedReason,
    phases: buildPhases([], source, label),
    copyText: [
      "My SkillMint path:",
      `${label}: ${lockedReason}`,
    ].join("\n"),
  };
}

function getPhaseGoal(
  window: CareerPathPhase["window"],
  source: CareerPathSource,
  targetLabel: string,
): string {
  const sourceText = source === "latest_jd"
    ? "this pasted JD"
    : source === "ultimate_goal"
      ? "your ultimate goal"
      : "your closest profile-fit role";

  if (window === "30_days") {
    return `Focus the resume on the biggest proof gaps for ${sourceText}: ${targetLabel}.`;
  }

  if (window === "60_days") {
    return `Build or upgrade evidence that makes ${targetLabel} more believable.`;
  }

  return `Turn the strongest evidence into a clean proof plan for ${targetLabel}.`;
}

function getMainGap(missions: Mission[], fallback: string): string {
  return missions[0]?.whyThisMatters ?? fallback;
}

function buildPathCopyText(
  label: string,
  targetRole: string,
  nextMission?: Mission,
): string {
  return [
    "My SkillMint path:",
    `${label}: ${targetRole}`,
    `Next Best Mission: ${nextMission?.title ?? "Add truthful resume evidence"}.`,
    "Marked done is not verification. Re-upload your resume so SkillMint can check whether evidence is visible.",
  ].join("\n");
}
