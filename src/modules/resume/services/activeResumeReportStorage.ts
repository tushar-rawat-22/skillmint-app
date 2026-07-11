import type { ResumeAnalysisResult } from "@/lib/resume/analyzeResume";
import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";
import type { UserProfile } from "@/intelligence/types/profile";
import {
  readVisibleStorageValue,
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
    exportPolicy: "json_value",
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
    exportPolicy: "json_value",
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
  status: "synced" | "local-only";
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

export function detachActiveResumeSyncStatus(databaseId: string): boolean {
  const storage = getBrowserStorage();

  if (!storage) {
    return false;
  }

  try {
    const storedValue = storage.getItem(RESUME_SYNC_STATUS_STORAGE_KEY);

    if (!storedValue) {
      return false;
    }

    const parsedValue = JSON.parse(storedValue);
    const value = isRecord(parsedValue) && "value" in parsedValue
      ? parsedValue.value
      : parsedValue;

    if (!isRecord(value) || value.databaseId !== databaseId) {
      return false;
    }

    storage.removeItem(RESUME_SYNC_STATUS_STORAGE_KEY);
    notifySkillMintWorkspaceUpdated();
    return true;
  } catch {
    return false;
  }
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

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" &&
    !Array.isArray(value);
}
