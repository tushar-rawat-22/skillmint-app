import type { JobDescriptionMatchResult } from "@/intelligence/core/jobDescriptionMatch";
import type { ResumeImprovementPlan } from "@/intelligence/core/resumeImprovement";
import type { ResumeRewritePlan } from "@/intelligence/core/resumeRewrite";
import type { ActiveTargetResumeContext } from "@/intelligence/target";
import {
  readVisibleStorageValue,
  writeOwnedJsonStorageValue,
} from "@/lib/storage/ownedSkillMintStorage";
import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";
import type {
  BrowserOwnerContext,
  SkillMintStorageDescriptor,
} from "@/lib/storage/skillMintStorageTypes";

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
  exportPolicy: "json_value",
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
    exportPolicy: "json_value",
    description:
      "Browser-local sync status for the latest JD Match account save.",
  };

export type BrowserJobMatch = {
  id?: string;
  databaseId?: string;
  syncStatus?: "synced" | "local-only";
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
  status: "synced" | "local-only";
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

export function clearCurrentJobMatchSnapshot(): boolean {
  const storage = getBrowserStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(JD_MATCH_STORAGE_KEY);
    notifySkillMintWorkspaceUpdated();
    return true;
  } catch {
    return false;
  }
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
