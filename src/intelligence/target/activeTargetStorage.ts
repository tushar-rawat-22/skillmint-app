import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";

import type {
  ActiveTarget,
  ActiveTargetJdMatch,
  ActiveTargetResumeContext,
  ActiveTargetStatus,
} from "./activeTargetContract";
import {
  normalizeActiveTarget,
  normalizeOptionalString,
} from "./activeTargetSelection";

export const ACTIVE_TARGET_STORAGE_KEY = "skillmint:active-target:v1";
export const ACTIVE_TARGET_STORAGE_VERSION = 1;

type ActiveTargetStorageEnvelope = {
  version: typeof ACTIVE_TARGET_STORAGE_VERSION;
  ownerUserId: string | null;
  target: ActiveTarget;
};

type ActiveTargetParseOptions = {
  currentUserId?: string | null;
};

type ActiveTargetSetOptions = {
  ownerUserId?: string | null;
};

export function getActiveTarget(
  options: ActiveTargetParseOptions = {},
): ActiveTarget | null {
  return parseActiveTarget(readActiveTargetStorageSnapshot(), options);
}

export function setActiveTarget(
  target: ActiveTarget,
  options: ActiveTargetSetOptions = {},
): boolean {
  const storage = getBrowserStorage();

  if (!storage) {
    return false;
  }

  try {
    const envelope: ActiveTargetStorageEnvelope = {
      version: ACTIVE_TARGET_STORAGE_VERSION,
      ownerUserId: normalizeOwnerUserId(options.ownerUserId),
      target: normalizeActiveTarget(target),
    };

    storage.setItem(
      ACTIVE_TARGET_STORAGE_KEY,
      JSON.stringify(envelope),
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
  options: ActiveTargetParseOptions = {},
): ActiveTarget | null {
  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    const envelope = parseStorageEnvelope(parsedValue);

    if (!envelope) {
      return null;
    }

    if (!isVisibleForCurrentUser(envelope.ownerUserId, options)) {
      return null;
    }

    return normalizeActiveTarget(envelope.target);
  } catch {
    return null;
  }
}

function parseStorageEnvelope(
  value: unknown,
): ActiveTargetStorageEnvelope | null {
  if (isStorageEnvelope(value)) {
    return value;
  }

  if (isActiveTarget(value)) {
    return {
      version: ACTIVE_TARGET_STORAGE_VERSION,
      ownerUserId: null,
      target: value,
    };
  }

  return null;
}

function isStorageEnvelope(
  value: unknown,
): value is ActiveTargetStorageEnvelope {
  if (!isRecord(value)) {
    return false;
  }

  if (value.version !== ACTIVE_TARGET_STORAGE_VERSION) {
    return false;
  }

  if (!(value.ownerUserId === null || isString(value.ownerUserId))) {
    return false;
  }

  return isActiveTarget(value.target);
}

function isVisibleForCurrentUser(
  ownerUserId: string | null,
  options: ActiveTargetParseOptions,
): boolean {
  if (!("currentUserId" in options)) {
    return ownerUserId === null;
  }

  if (options.currentUserId === undefined) {
    return false;
  }

  const currentUserId = normalizeOwnerUserId(options.currentUserId);

  return ownerUserId === currentUserId;
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
    !isIsoDateString(value.createdAt) ||
    !isIsoDateString(value.updatedAt)
  ) {
    return false;
  }

  if (
    value.companyName !== undefined &&
    !isOptionalNonEmptyString(value.companyName)
  ) {
    return false;
  }

  if (
    value.roleTitle !== undefined &&
    !isOptionalNonEmptyString(value.roleTitle)
  ) {
    return false;
  }

  if (
    value.targetRole !== undefined &&
    !isOptionalNonEmptyString(value.targetRole)
  ) {
    return false;
  }

  if (
    value.source === "manual" &&
    value.manualIntent !== undefined &&
    value.manualIntent !== "custom_goal"
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
    isStringArray(value.recommendations) &&
    (
      value.resumeContext === undefined ||
      isActiveTargetResumeContext(value.resumeContext)
    )
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
    isOptionalIsoDateString(value.analyzedAt) &&
    isOptionalNonEmptyString(value.fileName) &&
    isOptionalNonEmptyString(value.scoringVersion)
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

function isOptionalNonEmptyString(value: unknown): boolean {
  return value === undefined ||
    (typeof value === "string" && value.trim().length > 0);
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

function isOptionalIsoDateString(value: unknown): boolean {
  return value === undefined || isIsoDateString(value);
}

function normalizeOwnerUserId(value: string | null | undefined): string | null {
  return normalizeOptionalString(value ?? undefined, 160) ?? null;
}
