import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";
import {
  readVisibleStorageValue,
  readVisibleStoredValue,
  removeOwnedStoragePartition,
  writeOwnedStorageValue,
} from "@/lib/storage/ownedSkillMintStorage";
import type {
  BrowserOwnerContext,
  LegacyOwnerEnvelopeClassification,
  SkillMintStorageDescriptor,
} from "@/lib/storage/skillMintStorageTypes";
import { normalizeAccountOwnerId } from "@/lib/storage/skillMintStorageTypes";

import type {
  ActiveTarget,
  ActiveTargetJdMatch,
  ActiveTargetResumeContext,
  ActiveTargetStatus,
} from "./activeTargetContract";
import {
  normalizeActiveTarget,
} from "./activeTargetSelection";

export const ACTIVE_TARGET_STORAGE_KEY = "skillmint:active-target:v1";
export const ACTIVE_TARGET_STORAGE_VERSION = 1;

export const ACTIVE_TARGET_STORAGE_DESCRIPTOR: SkillMintStorageDescriptor = {
  key: ACTIVE_TARGET_STORAGE_KEY,
  version: ACTIVE_TARGET_STORAGE_VERSION,
  category: "active_target",
  ownerScope: "anonymous_or_account",
  containsPersonalData: true,
  clearWithBrowserReset: true,
  exportable: true,
  importable: true,
  exportPolicy: "json_value",
  validateValue: isActiveTarget,
  classifyLegacyOwnerEnvelope: classifyActiveTargetLegacyEnvelope,
  description:
    "Browser-local Active Target focus layer with owner isolation.",
};

type ActiveTargetParseOptions = {
  currentUserId?: string | null | undefined;
};

type ActiveTargetSetOptions = {
  ownerUserId?: string | null | undefined;
};

export function getActiveTarget(
  options: ActiveTargetParseOptions = {},
): ActiveTarget | null {
  const storedValue = readVisibleStorageValue(
    ACTIVE_TARGET_STORAGE_DESCRIPTOR,
    toBrowserOwnerContext(options),
  );

  if (!storedValue) return null;

  try {
    const value = JSON.parse(storedValue);
    return isActiveTarget(value) ? normalizeActiveTarget(value) : null;
  } catch {
    return null;
  }
}

export function setActiveTarget(
  target: ActiveTarget,
  options: ActiveTargetSetOptions = {},
): boolean {
  const result = writeOwnedStorageValue(
    ACTIVE_TARGET_STORAGE_DESCRIPTOR,
    normalizeActiveTarget(target),
    toBrowserOwnerContext(options),
  );

  if (result.ok) {
    notifySkillMintWorkspaceUpdated();
  }

  return result.ok && result.changed;
}

export function clearActiveTarget(
  options: ActiveTargetParseOptions = {},
): boolean {
  const result = removeOwnedStoragePartition(
    ACTIVE_TARGET_STORAGE_DESCRIPTOR,
    toBrowserOwnerContext(options),
  );

  if (result.ok && result.changed) {
    notifySkillMintWorkspaceUpdated();
  }

  return result.ok && result.changed;
}

export function getActiveTargetStatus(): ActiveTargetStatus {
  return getActiveTarget() ? "active" : "none";
}

export function readActiveTargetStorageSnapshot(
  options: ActiveTargetParseOptions = {},
): string | null {
  return readVisibleStorageValue(
    ACTIVE_TARGET_STORAGE_DESCRIPTOR,
    toBrowserOwnerContext(options),
  );
}

export function parseActiveTarget(
  storedValue: string | null,
  options: ActiveTargetParseOptions = {},
): ActiveTarget | null {
  if (!storedValue) {
    return null;
  }

  try {
    const result = readVisibleStoredValue(
      storedValue,
      ACTIVE_TARGET_STORAGE_DESCRIPTOR,
      toBrowserOwnerContext(options),
    );
    if (result.status !== "visible" || !result.serializedValue) return null;
    const value = JSON.parse(result.serializedValue);
    return isActiveTarget(value) ? normalizeActiveTarget(value) : null;
  } catch {
    return null;
  }
}

function classifyActiveTargetLegacyEnvelope(
  value: unknown,
): LegacyOwnerEnvelopeClassification {
  if (!isRecord(value) || !("ownerUserId" in value) && !("target" in value)) {
    return { status: "not_applicable" };
  }
  if (!Object.keys(value).every((key) =>
    ["version", "ownerUserId", "target"].includes(key)
  )) {
    return { status: "invalid" };
  }
  if (value.version !== ACTIVE_TARGET_STORAGE_VERSION) {
    return typeof value.version === "number"
      ? { status: "unsupported_version" }
      : { status: "invalid" };
  }
  const owner = value.ownerUserId === null
    ? { kind: "anonymous" as const }
    : (() => {
        const userId = normalizeAccountOwnerId(value.ownerUserId);
        return userId ? { kind: "account" as const, userId } : null;
      })();
  if (!owner || !isActiveTarget(value.target)) return { status: "invalid" };
  return {
    status: "valid",
    owner,
    value: value.target,
    updatedAt: value.target.updatedAt,
  };
}

export function isActiveTarget(value: unknown): value is ActiveTarget {
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
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) {
    return false;
  }

  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function isOptionalIsoDateString(value: unknown): boolean {
  return value === undefined || isIsoDateString(value);
}

function toBrowserOwnerContext(
  options: ActiveTargetParseOptions | ActiveTargetSetOptions,
): BrowserOwnerContext {
  return {
    currentUserId: "ownerUserId" in options
      ? options.ownerUserId
      : "currentUserId" in options
        ? options.currentUserId
        : null,
  };
}
