import type { JobDescriptionMatchResult } from "@/intelligence/core/jobDescriptionMatch";
import type { ResumeImprovementPlan } from "@/intelligence/core/resumeImprovement";
import type { ResumeRewritePlan } from "@/intelligence/core/resumeRewrite";
import type { ActiveTargetResumeContext } from "@/intelligence/target";
import {
  readVisibleStorageValue,
  removeOwnedStoragePartition,
  writeOwnedJsonStorageValue,
} from "@/lib/storage/ownedSkillMintStorage";
import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";
import type {
  BrowserOwnerContext,
  SkillMintStorageDescriptor,
} from "@/lib/storage/skillMintStorageTypes";
import { isUuidShapedIdentifier } from "@/lib/storage/skillMintStorageTypes";
import { isSavedJobMatch } from "@/lib/storage/jdMatchHistory";

export const JD_MATCH_STORAGE_KEY = "skillmint:jd-match";
export const JD_MATCH_SYNC_STATUS_STORAGE_KEY =
  "skillmint:jd-match-sync-status";

export const JD_MATCH_STORAGE_DESCRIPTOR: SkillMintStorageDescriptor = {
  key: JD_MATCH_STORAGE_KEY,
  version: 1,
  category: "job_match",
  ownerScope: "anonymous_or_account",
  containsPersonalData: true,
  clearWithBrowserReset: true,
  exportable: true,
  importable: true,
  exportPolicy: "json_value",
  validateValue: isBrowserJobMatch,
  prepareAnonymousImport: prepareAnonymousCurrentJobMatch,
  description:
    "Latest browser-local JD Match snapshot, tied to one resume context when available.",
};

export const JD_MATCH_SYNC_STATUS_STORAGE_DESCRIPTOR:
  SkillMintStorageDescriptor = {
    key: JD_MATCH_SYNC_STATUS_STORAGE_KEY,
    version: 1,
    category: "sync_status",
    ownerScope: "anonymous_or_account",
    containsPersonalData: false,
    clearWithBrowserReset: true,
    exportable: true,
  importable: true,
  exportPolicy: "json_value",
  validateValue: isBrowserJobMatchSyncStatus,
  prepareAnonymousImport: prepareAnonymousJobMatchSyncStatus,
    description:
      "Browser-local sync status for the latest JD Match account save.",
  };

export type BrowserJobMatch = {
  id?: string;
  databaseId?: string;
  syncStatus?: "synced" | "local-only" | "pending" | "failed";
  jobTitle: string;
  companyName: string;
  jobDescription: string;
  result: JobDescriptionMatchResult;
  improvementPlan: ResumeImprovementPlan | null;
  rewritePlan: ResumeRewritePlan | null;
  roadmap?: unknown;
  resumeContext?: ActiveTargetResumeContext;
  analyzedAt: string;
};

export type BrowserJobMatchSyncStatus = {
  status: "synced" | "local-only" | "pending" | "failed";
  message: string;
  syncedAt?: string;
  databaseId?: string;
};

export function readCurrentJobMatchSnapshot(
  options: BrowserOwnerContext,
): string | null {
  return readVisibleStorageValue(JD_MATCH_STORAGE_DESCRIPTOR, options);
}

export function writeCurrentJobMatchSnapshot(
  match: BrowserJobMatch,
  options: BrowserOwnerContext,
): boolean {
  const didWrite = writeOwnedJsonStorageValue(
    JD_MATCH_STORAGE_DESCRIPTOR,
    match,
    options,
  );

  if (didWrite) {
    notifySkillMintWorkspaceUpdated();
  }

  return didWrite;
}

export function clearCurrentJobMatchSnapshot(
  options: BrowserOwnerContext = { currentUserId: null },
): boolean {
  const result = removeOwnedStoragePartition(
    JD_MATCH_STORAGE_DESCRIPTOR,
    options,
  );

  if (result.ok && result.changed) {
    notifySkillMintWorkspaceUpdated();
  }

  return result.ok;
}

export function readCurrentJobMatchSyncStatusSnapshot(
  options: BrowserOwnerContext,
): string | null {
  return readVisibleStorageValue(
    JD_MATCH_SYNC_STATUS_STORAGE_DESCRIPTOR,
    options,
  );
}

export function writeCurrentJobMatchSyncStatus(
  status: BrowserJobMatchSyncStatus,
  options: BrowserOwnerContext,
): boolean {
  const didWrite = writeOwnedJsonStorageValue(
    JD_MATCH_SYNC_STATUS_STORAGE_DESCRIPTOR,
    status,
    options,
  );

  if (didWrite) {
    notifySkillMintWorkspaceUpdated();
  }

  return didWrite;
}

export function isBrowserJobMatch(value: unknown): value is BrowserJobMatch {
  if (!isRecord(value)) return false;

  return isSavedJobMatch({
    ...value,
    id: typeof value.id === "string" ? value.id : "current-job-match",
  });
}

export function isBrowserJobMatchSyncStatus(
  value: unknown,
): value is BrowserJobMatchSyncStatus {
  if (!isRecord(value)) return false;

  return isJobMatchSyncState(value.status) &&
    typeof value.message === "string" &&
    (value.syncedAt === undefined || (
      typeof value.syncedAt === "string" &&
      Number.isFinite(Date.parse(value.syncedAt))
    )) &&
    (value.databaseId === undefined || typeof value.databaseId === "string");
}

function isJobMatchSyncState(
  value: unknown,
): value is BrowserJobMatchSyncStatus["status"] {
  return value === "synced" ||
    value === "local-only" ||
    value === "pending" ||
    value === "failed";
}

export function prepareAnonymousCurrentJobMatch(
  value: unknown,
): { ok: true; value: BrowserJobMatch } | { ok: false; reason: string } {
  if (!isBrowserJobMatch(value)) {
    return { ok: false, reason: "JD Match snapshot is invalid." };
  }

  const localId = getSafeLocalJobMatchId(value.id, value.databaseId);
  return {
    ok: true,
    value: {
      ...(localId ? { id: localId } : {}),
      jobTitle: value.jobTitle,
      companyName: value.companyName,
      jobDescription: value.jobDescription,
      result: value.result,
      improvementPlan: value.improvementPlan ?? null,
      rewritePlan: value.rewritePlan ?? null,
      ...(value.roadmap === undefined ? {} : { roadmap: value.roadmap }),
      ...(value.resumeContext === undefined
        ? {}
        : { resumeContext: value.resumeContext }),
      analyzedAt: value.analyzedAt,
      syncStatus: "local-only",
    },
  };
}

export function prepareAnonymousJobMatchSyncStatus(
  value: unknown,
): { ok: true; value: BrowserJobMatchSyncStatus } | { ok: false; reason: string } {
  if (!isBrowserJobMatchSyncStatus(value)) {
    return { ok: false, reason: "JD Match sync status is invalid." };
  }

  return {
    ok: true,
    value: {
      status: "local-only",
      message: "Imported into this browser workspace. It is not saved to your account.",
    },
  };
}

export function detachDeletedCurrentJobMatchReference(
  value: unknown,
): { value: unknown; changed: boolean } {
  if (!isBrowserJobMatch(value) || !hasSavedReportReference(value.databaseId)) {
    return { value, changed: false };
  }

  const localId = getSafeLocalJobMatchId(value.id, value.databaseId);
  return {
    value: {
      ...(localId ? { id: localId } : {}),
      jobTitle: value.jobTitle,
      companyName: value.companyName,
      jobDescription: value.jobDescription,
      result: value.result,
      improvementPlan: value.improvementPlan ?? null,
      rewritePlan: value.rewritePlan ?? null,
      ...(value.roadmap === undefined ? {} : { roadmap: value.roadmap }),
      ...(value.resumeContext === undefined
        ? {}
        : { resumeContext: value.resumeContext }),
      analyzedAt: value.analyzedAt,
      syncStatus: "local-only",
    },
    changed: true,
  };
}

export function detachDeletedJobMatchSyncStatusReference(
  value: unknown,
): { value: unknown; changed: boolean } {
  if (
    !isBrowserJobMatchSyncStatus(value) ||
    !hasSavedReportReference(value.databaseId)
  ) {
    return { value, changed: false };
  }

  return {
    value: {
      status: "local-only",
      message: "Saved account reference was deleted; browser JD Match remains local.",
    },
    changed: true,
  };
}

export function getSafeLocalJobMatchId(
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasSavedReportReference(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
