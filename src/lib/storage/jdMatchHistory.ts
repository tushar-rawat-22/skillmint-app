import type { JobDescriptionMatchResult } from "@/intelligence/core/jobDescriptionMatch";
import type { ResumeImprovementPlan } from "@/intelligence/core/resumeImprovement";
import type { ResumeRewritePlan } from "@/intelligence/core/resumeRewrite";
import type { ActiveTargetResumeContext } from "@/intelligence/target";
import {
  readVisibleStorageValue,
  removeOwnedStoragePartition,
  writeOwnedJsonStorageValue,
} from "@/lib/storage/ownedSkillMintStorage";
import type {
  BrowserOwnerContext,
  SkillMintStorageDescriptor,
} from "@/lib/storage/skillMintStorageTypes";
import { isUuidShapedIdentifier } from "@/lib/storage/skillMintStorageTypes";

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
  syncStatus?: "synced" | "local-only" | "pending" | "failed";
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
    importable: true,
    exportPolicy: "json_value",
    validateValue: isSavedJobMatchList,
    prepareAnonymousImport: prepareAnonymousJobMatchHistory,
    description:
      "Browser-local list of recent JD Match snapshots and plans.",
  };
const MAX_SAVED_MATCHES = 20;

export function getAccountHistoryRestoreMessage(
  latestMatchWriteSucceeded: boolean,
): string {
  return latestMatchWriteSucceeded
    ? "Loaded recent job matches from your account."
    : "Loaded recent history, but the latest match could not be set in this browser.";
}

export function isSavedJobMatchList(value: unknown): value is SavedJobMatch[] {
  return Array.isArray(value) && value.every(isSavedJobMatch);
}

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
): SavedJobMatch[] | null {
  const nextMatches = sortNewestFirst([
    match,
    ...getSavedJobMatches(options).filter((savedMatch) =>
      savedMatch.id !== match.id
    ),
  ]).slice(0, MAX_SAVED_MATCHES);

  const didWrite = writeOwnedJsonStorageValue(
    JD_MATCH_HISTORY_STORAGE_DESCRIPTOR,
    nextMatches,
    options,
  );

  return didWrite ? nextMatches : null;
}

export function replaceSavedJobMatches(
  matches: SavedJobMatch[],
  options: BrowserOwnerContext = {
    currentUserId: null,
  },
): SavedJobMatch[] | null {
  const nextMatches = sortNewestFirst(matches).slice(0, MAX_SAVED_MATCHES);

  const didWrite = writeOwnedJsonStorageValue(
    JD_MATCH_HISTORY_STORAGE_DESCRIPTOR,
    nextMatches,
    options,
  );

  return didWrite ? nextMatches : null;
}

export function deleteSavedJobMatch(
  id: string,
  options: BrowserOwnerContext = {
    currentUserId: null,
  },
): SavedJobMatch[] | null {
  const nextMatches = getSavedJobMatches(options).filter(
    (savedMatch) => savedMatch.id !== id,
  );

  const didWrite = writeOwnedJsonStorageValue(
    JD_MATCH_HISTORY_STORAGE_DESCRIPTOR,
    nextMatches,
    options,
  );

  return didWrite ? nextMatches : null;
}

export function clearSavedJobMatches(
  options: BrowserOwnerContext = { currentUserId: null },
): boolean {
  return removeOwnedStoragePartition(
    JD_MATCH_HISTORY_STORAGE_DESCRIPTOR,
    options,
  ).ok;
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

export function isSavedJobMatch(value: unknown): value is SavedJobMatch {
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
    isIsoDateString(value.analyzedAt)
  );
}

export function prepareAnonymousJobMatchHistory(
  value: unknown,
): { ok: true; value: SavedJobMatch[] } | { ok: false; reason: string } {
  if (!isSavedJobMatchList(value)) {
    return { ok: false, reason: "JD Match history is invalid." };
  }

  const usedIds = new Set<string>();
  return {
    ok: true,
    value: value.map((match, index) => {
      const preferredId = getSafeLocalJobMatchId(match.id, match.databaseId);
      const id = preferredId && !usedIds.has(preferredId)
        ? preferredId
        : createImportedLocalJobMatchId(match.analyzedAt, index, usedIds);
      usedIds.add(id);

      // Rebuild the documented local record; never copy unproven root metadata.
      return {
        id,
        jobTitle: match.jobTitle,
        companyName: match.companyName,
        jobDescription: match.jobDescription,
        result: match.result,
        improvementPlan: match.improvementPlan ?? null,
        rewritePlan: match.rewritePlan ?? null,
        ...(match.roadmap === undefined ? {} : { roadmap: match.roadmap }),
        ...(match.resumeContext === undefined
          ? {}
          : { resumeContext: match.resumeContext }),
        analyzedAt: match.analyzedAt,
        syncStatus: "local-only",
      };
    }),
  };
}

export function detachDeletedJobMatchHistoryReferences(
  value: unknown,
): { value: unknown; changed: boolean } {
  if (!isSavedJobMatchList(value)) return { value, changed: false };

  if (!value.some((match) => hasSavedReportReference(match.databaseId))) {
    return { value, changed: false };
  }

  const usedIds = new Set(
    value
      .filter((match) => !hasSavedReportReference(match.databaseId))
      .map((match) => match.id),
  );
  const nextValue = value.map((match, index) => {
    if (!hasSavedReportReference(match.databaseId)) {
      return match;
    }

    const preferredId = getSafeLocalJobMatchId(match.id, match.databaseId);
    const id = preferredId && !usedIds.has(preferredId)
      ? preferredId
      : createImportedLocalJobMatchId(match.analyzedAt, index, usedIds);
    usedIds.add(id);
    return {
      id,
      jobTitle: match.jobTitle,
      companyName: match.companyName,
      jobDescription: match.jobDescription,
      result: match.result,
      improvementPlan: match.improvementPlan ?? null,
      rewritePlan: match.rewritePlan ?? null,
      ...(match.roadmap === undefined ? {} : { roadmap: match.roadmap }),
      ...(match.resumeContext === undefined
        ? {}
        : { resumeContext: match.resumeContext }),
      analyzedAt: match.analyzedAt,
      syncStatus: "local-only",
    };
  });

  return { value: nextValue, changed: true };
}

export function createImportedLocalJobMatchId(
  analyzedAt: string,
  index: number,
  usedIds: ReadonlySet<string>,
): string {
  const timestamp = Number.isFinite(Date.parse(analyzedAt))
    ? analyzedAt.replace(/[^0-9]/g, "").slice(0, 14)
    : "unknown-time";
  const base = `imported-jd-${timestamp || "unknown-time"}-${index + 1}`;
  let suffix = 0;
  let candidate = base;
  while (usedIds.has(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix + 1}`;
  }
  return candidate;
}

function getSafeLocalJobMatchId(
  id: unknown,
  databaseId: unknown,
): string | undefined {
  if (
    typeof id !== "string" ||
    !id.trim() ||
    id === databaseId ||
    isUuidShapedIdentifier(id)
  ) {
    return undefined;
  }

  return id;
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

function hasSavedReportReference(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalSyncStatus(
  value: unknown,
): value is SavedJobMatch["syncStatus"] {
  return value === undefined ||
    value === "synced" ||
    value === "local-only" ||
    value === "pending" ||
    value === "failed";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string");
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isIsoDateString(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}
