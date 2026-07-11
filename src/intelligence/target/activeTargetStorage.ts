import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";

import type {
  ActiveTarget,
  ActiveTargetJdMatch,
  ActiveTargetStatus,
} from "./activeTargetContract";
import { normalizeActiveTarget } from "./activeTargetSelection";

export const ACTIVE_TARGET_STORAGE_KEY = "skillmint:active-target:v1";

export function getActiveTarget(): ActiveTarget | null {
  return parseActiveTarget(readActiveTargetStorageSnapshot());
}

export function setActiveTarget(target: ActiveTarget): boolean {
  const storage = getBrowserStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(
      ACTIVE_TARGET_STORAGE_KEY,
      JSON.stringify(normalizeActiveTarget(target)),
    );
    notifySkillMintWorkspaceUpdated();
    return true;
  } catch {
    return false;
  }
}

export function clearActiveTarget(): boolean {
  const storage = getBrowserStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.removeItem(ACTIVE_TARGET_STORAGE_KEY);
    notifySkillMintWorkspaceUpdated();
    return true;
  } catch {
    return false;
  }
}

export function getActiveTargetStatus(): ActiveTargetStatus {
  return getActiveTarget() ? "active" : "none";
}

export function readActiveTargetStorageSnapshot(): string | null {
  const storage = getBrowserStorage();

  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(ACTIVE_TARGET_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function parseActiveTarget(
  storedValue: string | null,
): ActiveTarget | null {
  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    if (!isActiveTarget(parsedValue)) {
      return null;
    }

    return normalizeActiveTarget(parsedValue);
  } catch {
    return null;
  }
}

function isActiveTarget(value: unknown): value is ActiveTarget {
  if (!isRecord(value)) {
    return false;
  }

  if (
    !isString(value.id) ||
    !isActiveTargetSource(value.source) ||
    !isActiveTargetStatus(value.status) ||
    !isString(value.title) ||
    !isString(value.mainGap) ||
    !isString(value.nextBestMove) ||
    !isString(value.createdAt) ||
    !isString(value.updatedAt)
  ) {
    return false;
  }

  if (value.source === "latest_jd") {
    return isActiveTargetJdMatch(value.jdMatch);
  }

  return true;
}

function isActiveTargetJdMatch(value: unknown): value is ActiveTargetJdMatch {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNumber(value.score) &&
    isOptionalString(value.verdict) &&
    isOptionalString(value.brutalReality) &&
    isStringArray(value.matchedSkills) &&
    isStringArray(value.missingSkills) &&
    isStringArray(value.missingKeywords) &&
    isStringArray(value.strengths) &&
    isStringArray(value.weaknesses) &&
    isStringArray(value.recommendations)
  );
}

function isActiveTargetSource(value: unknown): boolean {
  return value === "latest_jd" ||
    value === "profile_fit" ||
    value === "ultimate_goal" ||
    value === "manual";
}

function isActiveTargetStatus(value: unknown): value is ActiveTargetStatus {
  return value === "none" ||
    value === "active" ||
    value === "needs_resume_analysis";
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" &&
    !Array.isArray(value);
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string");
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
