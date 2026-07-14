import type { ResumeAnalysisResult } from "@/lib/resume/analyzeResume";
import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";
import type { UserProfile } from "@/intelligence/types/profile";
import {
  readVisibleStorageValue,
  updateOwnedStorageValue,
  writeOwnedJsonStorageValue,
} from "@/lib/storage/ownedSkillMintStorage";
import type {
  BrowserOwnerContext,
  SkillMintStorageDescriptor,
} from "@/lib/storage/skillMintStorageTypes";
import type {
  PersistentResumeAnalysis,
  RepositoryResult,
} from "@/modules/resume/types";

export const ACTIVE_RESUME_ANALYSIS_STORAGE_KEY =
  "skillmint:resume-analysis";
export const RESUME_SYNC_STATUS_STORAGE_KEY = "skillmint:resume-sync-status";

export const ACTIVE_RESUME_ANALYSIS_STORAGE_DESCRIPTOR:
  SkillMintStorageDescriptor = {
    key: ACTIVE_RESUME_ANALYSIS_STORAGE_KEY,
    version: 1,
    category: "resume",
    ownerScope: "anonymous_or_account",
    containsPersonalData: true,
    clearWithBrowserReset: true,
    exportable: true,
    importable: true,
    exportPolicy: "json_value",
    validateValue: isActiveResumeAnalysis,
    prepareAnonymousImport: prepareAnonymousActiveResumeAnalysis,
    description:
      "Current active resume analysis powering this browser dashboard.",
  };

export const RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR:
  SkillMintStorageDescriptor = {
    key: RESUME_SYNC_STATUS_STORAGE_KEY,
    version: 1,
    category: "sync_status",
    ownerScope: "anonymous_or_account",
    containsPersonalData: false,
    clearWithBrowserReset: true,
    exportable: true,
  importable: true,
  exportPolicy: "json_value",
  validateValue: isResumeSyncStatus,
  prepareAnonymousImport: prepareAnonymousResumeSyncStatus,
    description:
      "Browser-local sync status for the active resume analysis.",
  };

export type ActiveResumeAnalysis = Omit<
  ResumeAnalysisResult,
  "parsedProfile" | "userProfile"
> & {
  parsedProfile: ResumeAnalysisResult["parsedProfile"];
  userProfile: UserProfile;
};

export type ResumeSyncStatus = {
  status: "synced" | "local-only" | "pending" | "failed";
  message: string;
  syncedAt?: string;
  databaseId?: string;
};

type ActiveResumeStorageOptions = BrowserOwnerContext;

const EMPTY_PARSED_PROFILE: ResumeAnalysisResult["parsedProfile"] = {
  skills: [],
  projects: [],
  education: [],
  experience: [],
  certifications: [],
  links: {},
  rawSections: {},
};

export function setActiveResumeReportFromSavedAnalysis(
  resumeAnalysis: PersistentResumeAnalysis,
  options: ActiveResumeStorageOptions = {
    currentUserId: null,
  },
): RepositoryResult<ActiveResumeAnalysis> {
  const activeReport =
    mapPersistentResumeAnalysisToActiveReport(resumeAnalysis);

  if (!activeReport) {
    return {
      ok: false,
      error:
        "This saved resume analysis is missing report data needed for the active dashboard.",
    };
  }

  const didWriteReport = writeActiveResumeReport(activeReport, options);

  if (!didWriteReport) {
    return {
      ok: false,
      error:
        "Could not set this saved analysis as active in this browser.",
    };
  }

  writeResumeSyncStatus(
    {
      status: "synced",
      message: "Loaded saved resume analysis as the active report.",
      syncedAt: new Date().toISOString(),
      databaseId: resumeAnalysis.id,
    },
    options,
  );
  notifySkillMintWorkspaceUpdated();

  return {
    ok: true,
    data: activeReport,
  };
}

export function mapPersistentResumeAnalysisToActiveReport(
  resumeAnalysis: PersistentResumeAnalysis,
): ActiveResumeAnalysis | null {
  if (!resumeAnalysis.fileName || !resumeAnalysis.fileType) {
    return null;
  }

  if (!isUserProfile(resumeAnalysis.userProfile)) {
    return null;
  }

  return {
    fileName: resumeAnalysis.fileName,
    fileType: resumeAnalysis.fileType,
    fileSize: 0,
    extractedText: resumeAnalysis.extractedText ?? "",
    parsedProfile: isParsedResumeProfile(resumeAnalysis.parsedProfile)
      ? resumeAnalysis.parsedProfile
      : EMPTY_PARSED_PROFILE,
    userProfile: resumeAnalysis.userProfile,
    analyzedAt: resumeAnalysis.createdAt,
    status: "completed",
  };
}

export function writeActiveResumeReport(
  analysis: ActiveResumeAnalysis,
  options: ActiveResumeStorageOptions = {
    currentUserId: null,
  },
): boolean {
  return writeOwnedJsonStorageValue(
    ACTIVE_RESUME_ANALYSIS_STORAGE_DESCRIPTOR,
    analysis,
    options,
  );
}

export function writeResumeSyncStatus(
  status: ResumeSyncStatus,
  options: ActiveResumeStorageOptions = {
    currentUserId: null,
  },
): boolean {
  return writeOwnedJsonStorageValue(
    RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR,
    status,
    options,
  );
}

export function readActiveResumeReportSnapshot(
  options: ActiveResumeStorageOptions,
): string | null {
  return readVisibleStorageValue(
    ACTIVE_RESUME_ANALYSIS_STORAGE_DESCRIPTOR,
    options,
  );
}

export function readResumeSyncStatusSnapshot(
  options: ActiveResumeStorageOptions,
): string | null {
  return readVisibleStorageValue(
    RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR,
    options,
  );
}

export function detachActiveResumeSyncStatus(
  databaseId: string,
  context: BrowserOwnerContext,
): boolean {
  const result = updateOwnedStorageValue(
    RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR,
    context,
    (value) => {
      if (!isRecord(value) || value.databaseId !== databaseId) {
        return { value, changed: false };
      }

      const nextValue = { ...value };
      delete nextValue.databaseId;
      if (nextValue.status === "synced") {
        nextValue.status = "local-only";
        nextValue.message = "Saved account reference was deleted; browser report remains local.";
        delete nextValue.syncedAt;
      }
      return { value: nextValue, changed: true };
    },
  );

  if (result.ok && result.changed) {
    notifySkillMintWorkspaceUpdated();
  }

  return result.ok && result.changed;
}

export function prepareAnonymousResumeSyncStatus(
  value: unknown,
): { ok: true; value: ResumeSyncStatus } | { ok: false; reason: string } {
  if (!isResumeSyncStatus(value)) {
    return { ok: false, reason: "Resume sync status is invalid." };
  }

  return {
    ok: true,
    value: {
      status: "local-only",
      message: "Imported into this browser workspace. It is not saved to your account.",
    },
  };
}

export function prepareAnonymousActiveResumeAnalysis(
  value: unknown,
): { ok: true; value: ActiveResumeAnalysis } | { ok: false; reason: string } {
  if (!isActiveResumeAnalysis(value)) {
    return { ok: false, reason: "Active resume analysis is invalid." };
  }

  // Rebuild the documented browser report shape. Anonymous browser values may
  // have passed a permissive runtime validator while carrying stale remote data.
  return {
    ok: true,
    value: {
      fileName: value.fileName,
      fileType: value.fileType,
      fileSize: value.fileSize,
      extractedText: value.extractedText,
      parsedProfile: value.parsedProfile,
      userProfile: value.userProfile,
      analyzedAt: value.analyzedAt,
      status: value.status,
    },
  };
}

export function detachDeletedResumeSyncStatusReference(
  value: unknown,
): { value: unknown; changed: boolean } {
  if (!isResumeSyncStatus(value) || !hasSavedReportReference(value.databaseId)) {
    return { value, changed: false };
  }

  return {
    value: {
      status: "local-only",
      message: "Saved account reference was deleted; browser report remains local.",
    },
    changed: true,
  };
}

function isParsedResumeProfile(
  value: unknown,
): value is ResumeAnalysisResult["parsedProfile"] {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Record<string, unknown>;

  return (
    isStringArray(profile.skills) &&
    isStringArray(profile.projects) &&
    isStringArray(profile.education) &&
    isStringArray(profile.experience) &&
    isStringArray(profile.certifications) &&
    isRecord(profile.links) &&
    isRecord(profile.rawSections)
  );
}

export function isActiveResumeAnalysis(
  value: unknown,
): value is ActiveResumeAnalysis {
  if (!isRecord(value)) return false;

  return typeof value.fileName === "string" &&
    typeof value.fileType === "string" &&
    isNumber(value.fileSize) &&
    typeof value.extractedText === "string" &&
    isParsedResumeProfile(value.parsedProfile) &&
    isUserProfile(value.userProfile) &&
    typeof value.analyzedAt === "string" &&
    Number.isFinite(Date.parse(value.analyzedAt)) &&
    value.status === "completed";
}

export function isResumeSyncStatus(value: unknown): value is ResumeSyncStatus {
  if (!isRecord(value)) return false;

  return isResumeSyncState(value.status) &&
    typeof value.message === "string" &&
    (value.syncedAt === undefined || (
      typeof value.syncedAt === "string" &&
      Number.isFinite(Date.parse(value.syncedAt))
    )) &&
    (value.databaseId === undefined || typeof value.databaseId === "string");
}

function isResumeSyncState(value: unknown): value is ResumeSyncStatus["status"] {
  return value === "synced" ||
    value === "local-only" ||
    value === "pending" ||
    value === "failed";
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Record<string, unknown>;

  return (
    isNumber(profile.resumeScore) &&
    isNumber(profile.skillsScore) &&
    isNumber(profile.projectsScore) &&
    isNumber(profile.experienceScore) &&
    isNumber(profile.educationScore) &&
    isNumber(profile.githubScore) &&
    isNumber(profile.linkedinScore) &&
    isNumber(profile.atsScore) &&
    isNumber(profile.recruiterScore) &&
    isNumber(profile.activityScore) &&
    isStringArray(profile.skills) &&
    isStringArray(profile.projects) &&
    isStringArray(profile.experience) &&
    typeof profile.education === "string" &&
    Array.isArray(profile.certifications) &&
    Array.isArray(profile.codingProfiles)
  );
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function hasSavedReportReference(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" &&
    !Array.isArray(value);
}
