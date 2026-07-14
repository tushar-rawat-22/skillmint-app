"use client";

import {
  getBrowserStorage,
  readVisibleStoredValue,
  writeOwnedStorageValue,
  type OwnerStorageMutationResult,
} from "@/lib/storage/ownedSkillMintStorage";
import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";
import {
  getBrowserDataOwner,
  type BrowserOwnerContext,
  type SkillMintStorageDescriptor,
} from "@/lib/storage/skillMintStorageTypes";
import {
  isSafePersistedAccountFailureCode,
  isStrictFeedbackTimestamp,
  localFeedbackFailure,
  normalizeFeedbackInput,
} from "@/modules/feedback/feedbackReliability";
import type {
  LocalBetaFeedback,
  PersistedAccountFailureCode,
  RepositoryResult,
  SubmitFeedbackInput,
} from "@/modules/feedback/types";

export const BETA_FEEDBACK_STORAGE_KEY = "skillmint:beta-feedback";
export const BETA_FEEDBACK_STORAGE_DESCRIPTOR: SkillMintStorageDescriptor = {
  key: BETA_FEEDBACK_STORAGE_KEY,
  version: 1,
  category: "feedback",
  ownerScope: "anonymous_or_account",
  containsPersonalData: true,
  clearWithBrowserReset: true,
  exportable: true,
  importable: true,
  exportPolicy: "json_value",
  validateValue: isLegacyLocalBetaFeedbackList,
  description:
    "Browser-local beta feedback fallback when account sync is unavailable.",
};

const MAX_LOCAL_FEEDBACK_ITEMS = 20;
const MAX_ID_GENERATION_ATTEMPTS = 8;

type FeedbackStorage = Pick<Storage, "getItem" | "setItem">;

export type FeedbackLocalStorageEnvironment = {
  getStorage: () => FeedbackStorage | null;
  now: () => string;
  createId: () => string;
  notifyWorkspaceUpdated: () => void;
};

const productionEnvironment: FeedbackLocalStorageEnvironment = {
  getStorage: getBrowserStorage,
  now: () => new Date().toISOString(),
  createId: createLocalFeedbackId,
  notifyWorkspaceUpdated: notifySkillMintWorkspaceUpdated,
};

export function getLocalFeedbackItems(
  context: BrowserOwnerContext,
): RepositoryResult<LocalBetaFeedback[]> {
  return getLocalFeedbackItemsWithEnvironment(context, productionEnvironment);
}

export function getLocalFeedbackItemsWithEnvironment(
  context: BrowserOwnerContext,
  environment: FeedbackLocalStorageEnvironment,
): RepositoryResult<LocalBetaFeedback[]> {
  try {
    if (!getBrowserDataOwner(context.currentUserId)) return failure("owner_unresolved");
    const storageResult = resolveStorage(environment);
    if (!storageResult.ok) return storageResult;
    return readItemsFromStorage(context, storageResult.data);
  } catch {
    return failure("unknown");
  }
}

export function saveFeedbackLocally(
  input: SubmitFeedbackInput,
  context: BrowserOwnerContext,
  syncError?: PersistedAccountFailureCode,
): RepositoryResult<LocalBetaFeedback> {
  return saveFeedbackLocallyWithEnvironment(
    input,
    context,
    syncError,
    productionEnvironment,
  );
}

export function saveFeedbackLocallyWithEnvironment(
  input: unknown,
  context: BrowserOwnerContext,
  syncError: PersistedAccountFailureCode | undefined,
  environment: FeedbackLocalStorageEnvironment,
): RepositoryResult<LocalBetaFeedback> {
  try {
    const normalized = normalizeFeedbackInput(input);
    if (!normalized.ok) return normalized;
    if (syncError !== undefined && !isSafePersistedAccountFailureCode(syncError)) {
      return failure("invalid_input");
    }

    const owner = getBrowserDataOwner(context.currentUserId);
    if (!owner) return failure("owner_unresolved");

    const storageResult = resolveStorage(environment);
    if (!storageResult.ok) return storageResult;
    const existing = readItemsFromStorage(context, storageResult.data);
    if (!existing.ok) return existing;

    const createdAt = environment.now();
    if (!isCanonicalLocalTimestamp(createdAt)) return failure("unknown");

    const ids = new Set(existing.data.map((item) => item.id));
    const id = createUniqueId(ids, environment, [
      normalized.data.message,
      ...(owner.kind === "account" ? [owner.userId] : []),
    ]);
    if (!id) return failure("id_generation_failed");

    const feedbackItem: LocalBetaFeedback = {
      id,
      ...normalized.data,
      createdAt,
      syncStatus: "local-only",
      ...(owner.kind === "account" && syncError ? { syncError } : {}),
    };
    const nextItems = [feedbackItem, ...existing.data]
      .slice(0, MAX_LOCAL_FEEDBACK_ITEMS);
    const mutation = writeOwnedStorageValue(
      BETA_FEEDBACK_STORAGE_DESCRIPTOR,
      nextItems,
      context,
      { storage: storageResult.data as Storage, updatedAt: createdAt },
    );
    if (!mutation.ok) return mutationFailure(mutation);

    try { environment.notifyWorkspaceUpdated(); } catch { /* Persistence succeeded. */ }
    return { ok: true, data: { ...feedbackItem } };
  } catch {
    return failure("unknown");
  }
}

function readItemsFromStorage(
  context: BrowserOwnerContext,
  storage: FeedbackStorage,
): RepositoryResult<LocalBetaFeedback[]> {
  if (!getBrowserDataOwner(context.currentUserId)) return failure("owner_unresolved");

  let raw: string | null;
  try {
    raw = storage.getItem(BETA_FEEDBACK_STORAGE_KEY);
  } catch {
    return failure("storage_read_failed");
  }

  const visible = readVisibleStoredValue(
    raw,
    BETA_FEEDBACK_STORAGE_DESCRIPTOR,
    context,
  );
  if (visible.status === "owner_unknown") return failure("owner_unresolved");
  if (visible.status === "corrupted") return failure("storage_corrupted");
  if (visible.status === "missing" || visible.status === "hidden_for_owner") {
    return { ok: true, data: [] };
  }
  if (visible.serializedValue === null) return failure("storage_corrupted");

  try {
    const parsed: unknown = JSON.parse(visible.serializedValue);
    if (!isDenseArray(parsed) || !parsed.every(isLegacyLocalBetaFeedback)) {
      return failure("storage_corrupted");
    }
    const ids = new Set<string>();
    const output: LocalBetaFeedback[] = [];
    for (const item of parsed) {
      if (ids.has(item.id) || !isStrictFeedbackTimestamp(item.createdAt)) {
        return failure("storage_corrupted");
      }
      ids.add(item.id);
      if (output.length < MAX_LOCAL_FEEDBACK_ITEMS) {
        output.push(sanitizeLocalFeedback(item));
      }
    }
    return { ok: true, data: output };
  } catch {
    return failure("storage_corrupted");
  }
}

function sanitizeLocalFeedback(value: LegacyLocalBetaFeedback): LocalBetaFeedback {
  return {
    id: value.id,
    feedbackType: value.feedbackType,
    sentiment: value.sentiment,
    message: value.message,
    pagePath: value.pagePath,
    createdAt: value.createdAt,
    syncStatus: "local-only",
    ...(isSafePersistedAccountFailureCode(value.syncError)
      ? { syncError: value.syncError }
      : {}),
  };
}

function resolveStorage(
  environment: FeedbackLocalStorageEnvironment,
): RepositoryResult<FeedbackStorage> {
  try {
    const storage = environment.getStorage();
    return storage
      ? { ok: true, data: storage }
      : failure("storage_unavailable");
  } catch {
    return failure("storage_unavailable");
  }
}

function createUniqueId(
  existingIds: Set<string>,
  environment: FeedbackLocalStorageEnvironment,
  forbiddenValues: string[],
): string | null {
  for (let attempt = 0; attempt < MAX_ID_GENERATION_ATTEMPTS; attempt += 1) {
    try {
      const id = environment.createId();
      if (
        typeof id === "string" &&
        id.trim() &&
        !existingIds.has(id) &&
        forbiddenValues.every((value) => !value || !id.includes(value))
      ) return id;
    } catch {
      // Try the next bounded attempt.
    }
  }
  return null;
}

function createLocalFeedbackId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return `feedback-${crypto.randomUUID()}`;
    }
  } catch {
    // Use the guarded non-identifying fallback.
  }
  try {
    return `feedback-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  } catch {
    return "";
  }
}

function mutationFailure<T>(
  mutation: OwnerStorageMutationResult,
): RepositoryResult<T> {
  if (mutation.status === "storage_unavailable") return failure("storage_unavailable");
  if (mutation.status === "storage_read_failed") return failure("storage_read_failed");
  if (mutation.status === "storage_write_failed") return failure("storage_write_failed");
  if (mutation.status === "owner_invalid") return failure("owner_unresolved");
  if (mutation.status === "unrecognized_existing_data") return failure("storage_corrupted");
  return failure("unknown");
}

type LegacyLocalBetaFeedback = Omit<LocalBetaFeedback, "syncError"> & {
  syncError?: string;
};

function isLegacyLocalBetaFeedbackList(value: unknown): boolean {
  return isDenseArray(value) && value.every(isLegacyLocalBetaFeedback);
}

function isLegacyLocalBetaFeedback(value: unknown): value is LegacyLocalBetaFeedback {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const feedback = value as Record<string, unknown>;
  return typeof feedback.id === "string" &&
    Boolean(feedback.id.trim()) &&
    isFeedbackType(feedback.feedbackType) &&
    isFeedbackSentiment(feedback.sentiment) &&
    typeof feedback.message === "string" &&
    (feedback.pagePath === null || typeof feedback.pagePath === "string") &&
    typeof feedback.createdAt === "string" &&
    Number.isFinite(Date.parse(feedback.createdAt)) &&
    feedback.syncStatus === "local-only" &&
    (feedback.syncError === undefined || typeof feedback.syncError === "string");
}

function isDenseArray(value: unknown): value is unknown[] {
  if (!Array.isArray(value)) return false;
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.prototype.hasOwnProperty.call(value, index)) return false;
  }
  return true;
}

function isFeedbackType(value: unknown): value is SubmitFeedbackInput["feedbackType"] {
  return value === "bug" || value === "confusion" || value === "ui" ||
    value === "idea" || value === "other";
}

function isFeedbackSentiment(
  value: unknown,
): value is SubmitFeedbackInput["sentiment"] {
  return value === "negative" || value === "neutral" || value === "positive";
}

function isCanonicalLocalTimestamp(value: unknown): value is string {
  return isStrictFeedbackTimestamp(value) &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) &&
    new Date(value).toISOString() === value;
}

function failure<T>(
  code: Parameters<typeof localFeedbackFailure>[0],
): RepositoryResult<T> {
  return { ok: false, error: localFeedbackFailure(code) };
}
