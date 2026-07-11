import type { JobDescriptionMatchResult } from "@/intelligence/core/jobDescriptionMatch";
import type { RoleMatchResult } from "@/intelligence/types/results";

import type {
  ActiveTarget,
  ActiveTargetJdMatch,
  ActiveTargetRecommendedPathSource,
  ActiveTargetResumeContext,
  ActiveTargetSource,
} from "./activeTargetContract";

const MAX_TITLE_LENGTH = 140;
const MAX_SHORT_TEXT_LENGTH = 160;
const MAX_GAP_LENGTH = 320;
const MAX_JD_TEXT_LENGTH = 12000;
const MAX_MATCH_ARRAY_ITEMS = 20;

type LatestJdTargetInput = {
  title?: string;
  companyName?: string;
  roleTitle?: string;
  location?: string;
  jdText?: string;
  result: JobDescriptionMatchResult;
  resumeContext?: ActiveTargetResumeContext | null;
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
  const createdAt = normalizeTimestamp(input.now);
  const title = getTargetTitle(input.title, input.roleTitle, "Latest pasted JD");
  const jdHash = stableHash([
    input.jdText ?? "",
    title,
    input.companyName ?? "",
    input.roleTitle ?? "",
  ].join("|"));
  const jdMatch = mapJdMatch(input.result, input.resumeContext);

  return {
    id: `active-target:latest-jd:${jdHash}`,
    source: "latest_jd",
    status: "active",
    title,
    companyName: normalizeOptionalString(input.companyName, MAX_SHORT_TEXT_LENGTH),
    roleTitle: normalizeOptionalString(input.roleTitle, MAX_TITLE_LENGTH) ?? title,
    location: normalizeOptionalString(input.location, MAX_SHORT_TEXT_LENGTH),
    jdText: normalizeOptionalString(input.jdText, MAX_JD_TEXT_LENGTH),
    jdHash,
    jdMatch,
    targetRole: normalizeOptionalString(input.targetRole, MAX_TITLE_LENGTH) ?? title,
    careerField: normalizeOptionalString(input.careerField, MAX_SHORT_TEXT_LENGTH),
    mainGap: getJdMainGap(jdMatch),
    nextBestMove: getJdNextBestMove(jdMatch),
    createdAt,
    updatedAt: createdAt,
  };
}

export function createActiveTargetFromProfileFitRole(
  input: ProfileFitTargetInput,
): ActiveTarget {
  const createdAt = normalizeTimestamp(input.now);
  const role = normalizeOptionalString(input.roleMatch.role, MAX_TITLE_LENGTH) ??
    "Closest profile-fit role";
  const firstGap = input.roleMatch.gaps[0];

  return {
    id: `active-target:profile-fit:${slugifyTargetPart(role)}`,
    source: "profile_fit",
    status: "active",
    title: role,
    roleTitle: role,
    targetRole: role,
    careerField: normalizeOptionalString(input.careerField, MAX_SHORT_TEXT_LENGTH),
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
): ActiveTarget | null {
  const createdAt = normalizeTimestamp(input.now);
  const targetRole = normalizeOptionalString(input.targetRole, MAX_TITLE_LENGTH);

  if (!targetRole) {
    return null;
  }

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
    careerField: normalizeOptionalString(input.careerField, MAX_SHORT_TEXT_LENGTH),
    mainGap: currentReality,
    nextBestMove:
      "Build or show real goal-relevant proof before optimizing your resume for this target.",
    createdAt,
    updatedAt: createdAt,
  };
}

export function createManualActiveTarget(
  input: ManualTargetInput,
): ActiveTarget | null {
  const createdAt = normalizeTimestamp(input.now);
  const title = normalizeOptionalString(input.title, MAX_TITLE_LENGTH);

  if (!title) {
    return null;
  }

  return {
    id: `active-target:manual:${slugifyTargetPart(title)}`,
    source: "manual",
    status: "active",
    title,
    roleTitle: normalizeOptionalString(input.targetRole, MAX_TITLE_LENGTH) ?? title,
    targetRole: normalizeOptionalString(input.targetRole, MAX_TITLE_LENGTH) ?? title,
    careerField: normalizeOptionalString(input.careerField, MAX_SHORT_TEXT_LENGTH),
    manualIntent: "custom_goal",
    mainGap: "Paste a JD to unlock target-specific gaps.",
    nextBestMove:
      "Add clearer proof evidence before optimizing for this target.",
    createdAt,
    updatedAt: createdAt,
  };
}

export function normalizeActiveTarget(target: ActiveTarget): ActiveTarget {
  const source = target.source;
  const title = normalizeOptionalString(target.title, MAX_TITLE_LENGTH);
  const createdAt = normalizeTimestamp(target.createdAt);
  const updatedAt = normalizeTimestamp(target.updatedAt || createdAt);

  const normalizedTarget: ActiveTarget = {
    ...target,
    title: title ?? "Active Target",
    status: target.status === "needs_resume_analysis"
      ? "needs_resume_analysis"
      : "active",
    companyName: normalizeOptionalString(target.companyName, MAX_SHORT_TEXT_LENGTH),
    roleTitle: normalizeOptionalString(target.roleTitle, MAX_TITLE_LENGTH),
    location: normalizeOptionalString(target.location, MAX_SHORT_TEXT_LENGTH),
    jdText: normalizeOptionalString(target.jdText, MAX_JD_TEXT_LENGTH),
    jdHash: normalizeOptionalString(target.jdHash, MAX_SHORT_TEXT_LENGTH),
    targetRole: normalizeOptionalString(target.targetRole, MAX_TITLE_LENGTH),
    careerField: normalizeOptionalString(target.careerField, MAX_SHORT_TEXT_LENGTH),
    manualIntent: source === "manual" ? "custom_goal" : undefined,
    mainGap: normalizeOptionalString(target.mainGap, MAX_GAP_LENGTH) ||
      "Add clearer proof evidence before optimizing for this target.",
    nextBestMove: normalizeOptionalString(target.nextBestMove, MAX_GAP_LENGTH) ||
      "Build or show real proof before changing your resume.",
    createdAt,
    updatedAt,
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
  if (target.source === "manual") return "ultimate_goal";

  return "ultimate_goal";
}

export function getActiveTargetSourceLabel(source: ActiveTargetSource): string {
  if (source === "latest_jd") return "Latest JD";
  if (source === "profile_fit") return "Closest Role Path";
  if (source === "ultimate_goal") return "Ultimate Goal";

  return "Manual Target";
}

function mapJdMatch(
  result: JobDescriptionMatchResult,
  resumeContext: ActiveTargetResumeContext | null | undefined,
): ActiveTargetJdMatch {
  return {
    score: clampScore(result.matchScore),
    verdict: normalizeOptionalString(result.verdict, MAX_GAP_LENGTH),
    brutalReality: normalizeOptionalString(result.brutalReality, MAX_GAP_LENGTH),
    matchedSkills: normalizeStringArray(result.matchedSkills),
    missingSkills: normalizeStringArray(result.missingSkills),
    missingKeywords: normalizeStringArray(result.missingKeywords),
    strengths: normalizeStringArray(result.strengths),
    weaknesses: normalizeStringArray(result.weaknesses),
    recommendations: normalizeStringArray(result.recommendations, MAX_GAP_LENGTH),
    resumeContext: resumeContext ?? undefined,
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
  return normalizeOptionalString(title, MAX_TITLE_LENGTH) ??
    normalizeOptionalString(roleTitle, MAX_TITLE_LENGTH) ??
    fallback;
}

export function normalizeOptionalString(
  value: string | null | undefined,
  maxLength = MAX_SHORT_TEXT_LENGTH,
): string | undefined {
  const trimmedValue = value
    ?.replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);

  return trimmedValue || undefined;
}

function normalizeStringArray(
  values: string[],
  maxLength = MAX_SHORT_TEXT_LENGTH,
): string[] {
  return values
    .map((value) => normalizeOptionalString(value, maxLength))
    .filter((value): value is string => Boolean(value))
    .slice(0, MAX_MATCH_ARRAY_ITEMS);
}

function normalizeTimestamp(value: string | undefined): string {
  if (value) {
    const timestamp = Date.parse(value);

    if (Number.isFinite(timestamp)) {
      return new Date(timestamp).toISOString();
    }
  }

  return new Date().toISOString();
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
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
