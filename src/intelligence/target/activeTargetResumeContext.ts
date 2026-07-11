import type {
  ActiveTargetJdMatch,
  ActiveTargetResumeContext,
} from "./activeTargetContract";
import { stableHash } from "./activeTargetSelection";

const MAX_CONTEXT_LABEL_LENGTH = 140;

type ResumeContextInput = {
  fileName?: unknown;
  fileType?: unknown;
  fileSize?: unknown;
  extractedText?: unknown;
  analyzedAt?: unknown;
  scoringVersion?: unknown;
  userProfile?: unknown;
};

export function createActiveTargetResumeContext(
  input: ResumeContextInput | null | undefined,
): ActiveTargetResumeContext | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const extractedText = getString(input.extractedText) ?? "";
  const fileName = getString(input.fileName);
  const fileType = getString(input.fileType);
  const fileSize = typeof input.fileSize === "number" &&
    Number.isFinite(input.fileSize)
    ? input.fileSize
    : null;
  const scoringVersion = getString(input.scoringVersion);
  const scoreProfile = getScoreProfile(input.userProfile);

  if (!extractedText && !fileName && !scoreProfile) {
    return null;
  }

  const fingerprint = stableHash(JSON.stringify({
    fileName: fileName ?? "",
    fileType: fileType ?? "",
    fileSize,
    extractedTextHash: stableHash(extractedText),
    scoringVersion: scoringVersion ?? "",
    scoreProfile,
  }));

  return {
    fingerprint,
    analyzedAt: getValidIsoDate(input.analyzedAt),
    fileName: fileName?.slice(0, MAX_CONTEXT_LABEL_LENGTH),
    scoringVersion: scoringVersion?.slice(0, MAX_CONTEXT_LABEL_LENGTH),
  };
}

export function createActiveTargetResumeContextFromStoredAnalysis(
  storedValue: string | null,
): ActiveTargetResumeContext | null {
  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    return createActiveTargetResumeContext(parsedValue);
  } catch {
    return null;
  }
}

export function isJdMatchCurrentForResume(
  jdMatch: ActiveTargetJdMatch | null | undefined,
  currentResumeContext: ActiveTargetResumeContext | null | undefined,
): boolean {
  return isResumeContextCurrent(
    jdMatch?.resumeContext,
    currentResumeContext,
  );
}

export function isResumeContextCurrent(
  savedResumeContext: ActiveTargetResumeContext | null | undefined,
  currentResumeContext: ActiveTargetResumeContext | null | undefined,
): boolean {
  return Boolean(
    savedResumeContext?.fingerprint &&
      currentResumeContext?.fingerprint &&
      savedResumeContext.fingerprint === currentResumeContext.fingerprint,
  );
}

export function getStaleJdMatchReason(
  jdMatch: ActiveTargetJdMatch | null | undefined,
  currentResumeContext: ActiveTargetResumeContext | null | undefined,
): string | undefined {
  if (!jdMatch) {
    return undefined;
  }

  if (!jdMatch.resumeContext?.fingerprint) {
    return "This JD Match was saved before SkillMint tracked resume context. Re-run it for the current resume.";
  }

  if (!currentResumeContext?.fingerprint) {
    return "No active resume context is loaded. Re-run this JD match after restoring a resume report.";
  }

  if (jdMatch.resumeContext.fingerprint !== currentResumeContext.fingerprint) {
    return "This JD Match was calculated for a different active resume. Re-run it for the current resume.";
  }

  return undefined;
}

function getScoreProfile(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const profile = value as Record<string, unknown>;
  const scoreKeys = [
    "resumeScore",
    "skillsScore",
    "projectsScore",
    "experienceScore",
    "educationScore",
    "githubScore",
    "linkedinScore",
    "atsScore",
    "recruiterScore",
    "activityScore",
  ];
  const scores: Record<string, number> = {};

  for (const key of scoreKeys) {
    const valueForKey = profile[key];

    if (typeof valueForKey === "number" && Number.isFinite(valueForKey)) {
      scores[key] = valueForKey;
    }
  }

  return Object.keys(scores).length ? scores : null;
}

function getString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmedValue = value.trim();

  return trimmedValue || undefined;
}

function getValidIsoDate(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }

  const dateTime = Date.parse(value);

  return Number.isFinite(dateTime) ? new Date(dateTime).toISOString() : undefined;
}
