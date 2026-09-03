import {
  readVisibleStorageValue,
  writeOwnedStorageValue,
} from "@/lib/storage/ownedSkillMintStorage";
import type {
  BrowserOwnerContext,
  SkillMintStorageDescriptor,
} from "@/lib/storage/skillMintStorageTypes";

export const CANDIDATE_ACTIVATION_STORAGE_KEY =
  "skillmint:candidate-activation:v1";

export type CandidateActivationAction =
  | "started"
  | "done_by_user"
  | "blocked";

export type CandidateActivation = {
  activeTargetId: string;
  missionId: string;
  action: CandidateActivationAction;
  actedAt: string;
};

export const CANDIDATE_ACTIVATION_STORAGE_DESCRIPTOR: SkillMintStorageDescriptor = {
  key: CANDIDATE_ACTIVATION_STORAGE_KEY,
  version: 1,
  category: "activation",
  ownerScope: "anonymous_or_account",
  containsPersonalData: true,
  clearWithBrowserReset: true,
  exportable: true,
  importable: true,
  exportPolicy: "json_value",
  validateValue: isCandidateActivation,
  description:
    "Browser-local marker proving a candidate acted on a roadmap for the currently selected Active Target.",
};

export function getCandidateActivation(
  options: BrowserOwnerContext = { currentUserId: null },
): CandidateActivation | null {
  const storedValue = readVisibleStorageValue(
    CANDIDATE_ACTIVATION_STORAGE_DESCRIPTOR,
    options,
  );

  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue);
    return isCandidateActivation(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export function recordCandidateActivation(
  activation: CandidateActivation,
  options: BrowserOwnerContext = { currentUserId: null },
): boolean {
  const result = writeOwnedStorageValue(
    CANDIDATE_ACTIVATION_STORAGE_DESCRIPTOR,
    activation,
    options,
  );

  return result.ok && result.changed;
}

function isCandidateActivation(value: unknown): value is CandidateActivation {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.activeTargetId) &&
    isNonEmptyString(value.missionId) &&
    isCandidateActivationAction(value.action) &&
    isIsoDateString(value.actedAt)
  );
}

function isCandidateActivationAction(
  value: unknown,
): value is CandidateActivationAction {
  return value === "started" || value === "done_by_user" || value === "blocked";
}

function isIsoDateString(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
