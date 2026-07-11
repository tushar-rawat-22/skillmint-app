import type { JobDescriptionMatchResult } from "@/intelligence/core/jobDescriptionMatch";
import type { RoleMatchResult } from "@/intelligence/types/results";

import type {
  ActiveTarget,
  ActiveTargetJdMatch,
  ActiveTargetRecommendedPathSource,
  ActiveTargetSource,
} from "./activeTargetContract";

type LatestJdTargetInput = {
  title?: string;
  companyName?: string;
  roleTitle?: string;
  location?: string;
  jdText?: string;
  result: JobDescriptionMatchResult;
  targetRole?: string | null;
  careerField?: string | null;
  now?: string;
};

type ProfileFitTargetInput = {
  roleMatch: RoleMatchResult;
  careerField?: string | null;
  now?: string;
};

type UltimateGoalTargetInput = {
  targetRole: string;
  careerField?: string | null;
  closestRole?: string;
  now?: string;
};

type ManualTargetInput = {
  title: string;
  targetRole?: string | null;
  careerField?: string | null;
  now?: string;
};

export function createActiveTargetFromLatestJd(
  input: LatestJdTargetInput,
): ActiveTarget {
  const createdAt = input.now ?? new Date().toISOString();
  const title = getTargetTitle(input.title, input.roleTitle, "Latest pasted JD");
  const jdHash = stableHash([
    input.jdText ?? "",
    title,
    input.companyName ?? "",
    input.roleTitle ?? "",
  ].join("|"));
  const jdMatch = mapJdMatch(input.result);

  return {
    id: `active-target:latest-jd:${jdHash}`,
    source: "latest_jd",
    status: "active",
    title,
    companyName: normalizeOptionalString(input.companyName),
    roleTitle: normalizeOptionalString(input.roleTitle) ?? title,
    location: normalizeOptionalString(input.location),
    jdText: normalizeOptionalString(input.jdText),
    jdHash,
    jdMatch,
    targetRole: normalizeOptionalString(input.targetRole) ?? title,
    careerField: normalizeOptionalString(input.careerField),
    mainGap: getJdMainGap(jdMatch),
    nextBestMove: getJdNextBestMove(jdMatch),
    createdAt,
    updatedAt: createdAt,
  };
}

export function createActiveTargetFromProfileFitRole(
  input: ProfileFitTargetInput,
): ActiveTarget {
  const createdAt = input.now ?? new Date().toISOString();
  const role = input.roleMatch.role.trim() || "Closest profile-fit role";
  const firstGap = input.roleMatch.gaps[0];

  return {
    id: `active-target:profile-fit:${slugifyTargetPart(role)}`,
    source: "profile_fit",
    status: "active",
    title: role,
    roleTitle: role,
    targetRole: role,
    careerField: normalizeOptionalString(input.careerField),
    mainGap: firstGap
      ? `${firstGap} still needs clearer proof for this profile-fit direction.`
      : "Add clearer proof evidence before optimizing for this target.",
    nextBestMove: firstGap
      ? `Build or show real ${firstGap} proof before adding it to your resume.`
      : "Paste a JD to unlock target-specific gaps.",
    createdAt,
    updatedAt: createdAt,
  };
}

export function createActiveTargetFromUltimateGoal(
  input: UltimateGoalTargetInput,
): ActiveTarget {
  const createdAt = input.now ?? new Date().toISOString();
  const targetRole = input.targetRole.trim();
  const currentReality = input.closestRole &&
      !input.closestRole.toLowerCase().includes(targetRole.toLowerCase())
    ? `Your current resume is closer to ${input.closestRole}, while this target points toward ${targetRole}.`
    : `Your setup target points toward ${targetRole}.`;

  return {
    id: `active-target:ultimate-goal:${slugifyTargetPart(targetRole)}`,
    source: "ultimate_goal",
    status: "active",
    title: targetRole,
    roleTitle: targetRole,
    targetRole,
    careerField: normalizeOptionalString(input.careerField),
    mainGap: currentReality,
    nextBestMove:
      "Build or show real goal-relevant proof before optimizing your resume for this target.",
    createdAt,
    updatedAt: createdAt,
  };
}

export function createManualActiveTarget(
  input: ManualTargetInput,
): ActiveTarget {
  const createdAt = input.now ?? new Date().toISOString();
  const title = input.title.trim();

  return {
    id: `active-target:manual:${slugifyTargetPart(title)}`,
    source: "manual",
    status: "active",
    title,
    roleTitle: normalizeOptionalString(input.targetRole) ?? title,
    targetRole: normalizeOptionalString(input.targetRole) ?? title,
    careerField: normalizeOptionalString(input.careerField),
    mainGap: "Paste a JD to unlock target-specific gaps.",
    nextBestMove:
      "Add clearer proof evidence before optimizing for this target.",
    createdAt,
    updatedAt: createdAt,
  };
}

export function normalizeActiveTarget(target: ActiveTarget): ActiveTarget {
  const normalizedTarget: ActiveTarget = {
    ...target,
    title: target.title.trim(),
    status: target.status === "needs_resume_analysis"
      ? "needs_resume_analysis"
      : "active",
    mainGap: target.mainGap.trim() ||
      "Add clearer proof evidence before optimizing for this target.",
    nextBestMove: target.nextBestMove.trim() ||
      "Build or show real proof before changing your resume.",
    createdAt: target.createdAt || new Date().toISOString(),
    updatedAt: target.updatedAt || target.createdAt || new Date().toISOString(),
  };

  if (normalizedTarget.source !== "latest_jd") {
    delete normalizedTarget.jdMatch;
    delete normalizedTarget.jdText;
    delete normalizedTarget.jdHash;
  }

  return normalizedTarget;
}

export function getRecommendedPathSourceForTarget(
  target: ActiveTarget | null | undefined,
): ActiveTargetRecommendedPathSource | undefined {
  if (!target) {
    return undefined;
  }

  if (target.source === "latest_jd") return "latest_jd";
  if (target.source === "profile_fit") return "profile_fit";

  return "ultimate_goal";
}

export function getActiveTargetSourceLabel(source: ActiveTargetSource): string {
  if (source === "latest_jd") return "Latest JD";
  if (source === "profile_fit") return "Closest Role Path";
  if (source === "ultimate_goal") return "Ultimate Goal";

  return "Manual Target";
}

function mapJdMatch(result: JobDescriptionMatchResult): ActiveTargetJdMatch {
  return {
    score: result.matchScore,
    verdict: result.verdict,
    brutalReality: result.brutalReality,
    matchedSkills: result.matchedSkills,
    missingSkills: result.missingSkills,
    missingKeywords: result.missingKeywords,
    strengths: result.strengths,
    weaknesses: result.weaknesses,
    recommendations: result.recommendations,
  };
}

function getJdMainGap(jdMatch: ActiveTargetJdMatch): string {
  const firstMissingSkill = jdMatch.missingSkills[0] ??
    jdMatch.missingKeywords[0];

  if (firstMissingSkill) {
    return `${firstMissingSkill} is requested, but your resume does not show ${firstMissingSkill} usage.`;
  }

  return jdMatch.weaknesses[0] ??
    "Add clearer proof evidence before optimizing for this target.";
}

function getJdNextBestMove(jdMatch: ActiveTargetJdMatch): string {
  const firstMissingSkill = jdMatch.missingSkills[0] ??
    jdMatch.missingKeywords[0];

  if (firstMissingSkill) {
    return `Build or show real ${firstMissingSkill} proof before adding it to your resume.`;
  }

  return "Strengthen the most relevant proof before tailoring this resume.";
}

function getTargetTitle(
  title: string | undefined,
  roleTitle: string | undefined,
  fallback: string,
): string {
  return normalizeOptionalString(title) ??
    normalizeOptionalString(roleTitle) ??
    fallback;
}

function normalizeOptionalString(value: string | null | undefined): string | undefined {
  const trimmedValue = value?.trim();

  return trimmedValue || undefined;
}

export function slugifyTargetPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-") || "target";
}

export function stableHash(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
}
