import type { JobDescriptionMatchResult } from "@/intelligence/core/jobDescriptionMatch";
import type { ResumeImprovementPlan } from "@/intelligence/core/resumeImprovement";
import type { ResumeRewritePlan } from "@/intelligence/core/resumeRewrite";
import type { ActiveTargetResumeContext } from "@/intelligence/target";
import {
  readVisibleStorageValue,
  writeOwnedJsonStorageValue,
} from "@/lib/storage/ownedSkillMintStorage";
import type {
  BrowserOwnerContext,
  SkillMintStorageDescriptor,
} from "@/lib/storage/skillMintStorageTypes";

export interface SavedJobMatch {
  id: string;
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  result: JobDescriptionMatchResult;
  improvementPlan: ResumeImprovementPlan | null;
  rewritePlan: ResumeRewritePlan | null;
  roadmap?: unknown;
  databaseId?: string;
  syncStatus?: "synced" | "local-only";
  resumeContext?: ActiveTargetResumeContext;
  analyzedAt: string;
}

export const JD_MATCH_HISTORY_STORAGE_KEY = "skillmint:jd-match-history";
export const JD_MATCH_HISTORY_STORAGE_DESCRIPTOR:
  SkillMintStorageDescriptor = {
    key: JD_MATCH_HISTORY_STORAGE_KEY,
    version: 1,
    category: "job_match",
    ownerScope: "anonymous_or_account",
    containsPersonalData: true,
    clearWithBrowserReset: true,
    exportable: true,
    exportPolicy: "json_value",
    description:
      "Browser-local list of recent JD Match snapshots and plans.",
  };
const MAX_SAVED_MATCHES = 20;

export function getSavedJobMatches(
  options: BrowserOwnerContext = {
    currentUserId: null,
  },
): SavedJobMatch[] {
  const storedValue = readVisibleStorageValue(
    JD_MATCH_HISTORY_STORAGE_DESCRIPTOR,
    options,
  );

  try {
    if (!storedValue) {
      return [];
    }

    const parsedValue = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    if (!parsedValue.every(isSavedJobMatch)) {
      return [];
    }

    return sortNewestFirst(parsedValue.map(normalizeSavedJobMatch)).slice(
      0,
      MAX_SAVED_MATCHES,
    );
  } catch {
    return [];
  }
}

export function saveJobMatch(
  match: SavedJobMatch,
  options: BrowserOwnerContext = {
    currentUserId: null,
  },
): SavedJobMatch[] {
  const nextMatches = sortNewestFirst([
    match,
    ...getSavedJobMatches(options).filter((savedMatch) =>
      savedMatch.id !== match.id
    ),
  ]).slice(0, MAX_SAVED_MATCHES);

  writeOwnedJsonStorageValue(
    JD_MATCH_HISTORY_STORAGE_DESCRIPTOR,
    nextMatches,
    options,
  );

  return nextMatches;
}

export function replaceSavedJobMatches(
  matches: SavedJobMatch[],
  options: BrowserOwnerContext = {
    currentUserId: null,
  },
): SavedJobMatch[] {
  const nextMatches = sortNewestFirst(matches).slice(0, MAX_SAVED_MATCHES);

  writeOwnedJsonStorageValue(
    JD_MATCH_HISTORY_STORAGE_DESCRIPTOR,
    nextMatches,
    options,
  );

  return nextMatches;
}

export function deleteSavedJobMatch(
  id: string,
  options: BrowserOwnerContext = {
    currentUserId: null,
  },
): SavedJobMatch[] {
  const nextMatches = getSavedJobMatches(options).filter(
    (savedMatch) => savedMatch.id !== id,
  );

  writeOwnedJsonStorageValue(
    JD_MATCH_HISTORY_STORAGE_DESCRIPTOR,
    nextMatches,
    options,
  );

  return nextMatches;
}

export function clearSavedJobMatches(): void {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(JD_MATCH_HISTORY_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function getLatestJobMatch(
  options: BrowserOwnerContext = {
    currentUserId: null,
  },
): SavedJobMatch | null {
  return getSavedJobMatches(options)[0] ?? null;
}

function sortNewestFirst(matches: SavedJobMatch[]): SavedJobMatch[] {
  return [...matches].sort((leftMatch, rightMatch) => {
    const leftTime = Date.parse(leftMatch.analyzedAt);
    const rightTime = Date.parse(rightMatch.analyzedAt);

    return getSortableTime(rightTime) - getSortableTime(leftTime);
  });
}

function normalizeSavedJobMatch(match: SavedJobMatch): SavedJobMatch {
  return {
    ...match,
    improvementPlan: match.improvementPlan ?? null,
    rewritePlan: match.rewritePlan ?? null,
  };
}

function getSortableTime(time: number): number {
  return Number.isFinite(time) ? time : 0;
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

function isSavedJobMatch(value: unknown): value is SavedJobMatch {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.id) &&
    isString(value.jobTitle) &&
    isString(value.companyName) &&
    isString(value.jobDescription) &&
    isJobDescriptionMatchResult(value.result) &&
    isNullableResumeImprovementPlan(value.improvementPlan) &&
    isNullableResumeRewritePlan(value.rewritePlan) &&
    isOptionalString(value.databaseId) &&
    isOptionalSyncStatus(value.syncStatus) &&
    (
      value.resumeContext === undefined ||
      isActiveTargetResumeContext(value.resumeContext)
    ) &&
    isString(value.analyzedAt)
  );
}

function isActiveTargetResumeContext(
  value: unknown,
): value is ActiveTargetResumeContext {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isString(value.fingerprint) &&
    isOptionalString(value.analyzedAt) &&
    isOptionalString(value.fileName) &&
    isOptionalString(value.scoringVersion)
  );
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

function isNullableResumeImprovementPlan(
  value: unknown,
): value is ResumeImprovementPlan | null {
  return value === null ||
    value === undefined ||
    isResumeImprovementPlan(value);
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

function isNullableResumeRewritePlan(
  value: unknown,
): value is ResumeRewritePlan | null {
  return value === null ||
    value === undefined ||
    isResumeRewritePlan(value);
}

function isResumeRewriteSuggestion(
  value: unknown,
): value is ResumeRewritePlan["summaryRewrite"] {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isOptionalString(value: unknown): value is string | undefined {
  return value === undefined || typeof value === "string";
}

function isOptionalSyncStatus(
  value: unknown,
): value is SavedJobMatch["syncStatus"] {
  return value === undefined ||
    value === "synced" ||
    value === "local-only";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string");
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
