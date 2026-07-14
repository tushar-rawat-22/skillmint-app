import { getBrowserDataOwner } from "@/lib/storage/skillMintStorageTypes";
import type {
  AccountFeedbackFailureCode,
  FeedbackFailure,
  FeedbackSentiment,
  FeedbackType,
  LocalFeedbackFailureCode,
  PersistedAccountFailureCode,
  RepositoryResult,
  SubmitFeedbackInput,
} from "@/modules/feedback/types";

export const MIN_FEEDBACK_LENGTH = 10;
export const MAX_FEEDBACK_LENGTH = 1000;

export type FeedbackOwnerKey = "anonymous" | `account:${string}`;

export type FeedbackOwnerContext = {
  ownerKey: FeedbackOwnerKey;
  accountUserId: string | null;
};

export type FeedbackRequestIdentity = {
  ownerKey: FeedbackOwnerKey;
  contextEpoch: number;
  requestToken: number;
};

export type FeedbackLiveContext = {
  isMounted: boolean;
  ownerKey: FeedbackOwnerKey | null;
  contextEpoch: number;
};

const FEEDBACK_TYPES: readonly FeedbackType[] = [
  "bug", "confusion", "ui", "idea", "other",
];
const FEEDBACK_SENTIMENTS: readonly FeedbackSentiment[] = [
  "negative", "neutral", "positive",
];
const PERSISTED_ACCOUNT_FAILURE_CODES: readonly PersistedAccountFailureCode[] = [
  "not_configured",
  "not_authenticated",
  "account_changed",
  "network_failure",
  "permission_denied",
  "schema_unavailable",
  "invalid_response",
  "unknown",
];

const ACCOUNT_FAILURES: Record<AccountFeedbackFailureCode, FeedbackFailure> = {
  invalid_input: { code: "invalid_input", message: "Enter 10 to 1000 characters and try again.", retryable: false },
  not_configured: { code: "not_configured", message: "Account feedback saving is not available.", retryable: false },
  not_authenticated: { code: "not_authenticated", message: "Your account session could not be confirmed.", retryable: true },
  account_changed: { code: "account_changed", message: "Your account changed before feedback could be saved.", retryable: true },
  network_failure: { code: "network_failure", message: "The account save could not connect.", retryable: true },
  permission_denied: { code: "permission_denied", message: "The account save was not permitted.", retryable: false },
  schema_unavailable: { code: "schema_unavailable", message: "Account feedback saving is not available.", retryable: false },
  invalid_response: { code: "invalid_response", message: "The account save returned an invalid response.", retryable: false },
  unknown: { code: "unknown", message: "The account save did not finish.", retryable: true },
};

const LOCAL_FAILURES: Record<LocalFeedbackFailureCode, FeedbackFailure> = {
  invalid_input: { code: "invalid_input", message: "Enter 10 to 1000 characters and try again.", retryable: false },
  owner_unresolved: { code: "owner_unresolved", message: "Wait while SkillMint checks your account.", retryable: true },
  storage_unavailable: { code: "storage_unavailable", message: "Browser storage is unavailable.", retryable: true },
  storage_read_failed: { code: "storage_read_failed", message: "Existing browser feedback could not be read safely.", retryable: true },
  storage_corrupted: { code: "storage_corrupted", message: "Existing browser feedback is corrupted and was not replaced.", retryable: false },
  storage_write_failed: { code: "storage_write_failed", message: "Feedback could not be saved in this browser.", retryable: true },
  id_generation_failed: { code: "id_generation_failed", message: "A safe feedback record could not be created.", retryable: true },
  unknown: { code: "unknown", message: "Feedback could not be saved in this browser.", retryable: true },
};

export const FEEDBACK_ACCOUNT_SUCCESS_COPY =
  "Feedback was saved to your account. Thank you.";
export const FEEDBACK_SIGNED_OUT_SUCCESS_COPY =
  "Feedback was saved in this browser. Sign in to save future feedback to your account.";
export const FEEDBACK_ACCOUNT_FALLBACK_COPY =
  "Feedback was saved in this browser. Saving it to your account did not finish.";
export const FEEDBACK_DUAL_FAILURE_COPY =
  "Feedback could not be saved to your account or this browser. Your message is still here so you can copy it and try again.";
export const FEEDBACK_AUTH_UNRESOLVED_COPY =
  "Wait while SkillMint checks your account.";

export function normalizeFeedbackInput(
  input: unknown,
): RepositoryResult<SubmitFeedbackInput> {
  try {
    if (!isRecord(input)) return failure(accountFeedbackFailure("invalid_input"));
    if (!isFeedbackType(input.feedbackType) || !isFeedbackSentiment(input.sentiment)) {
      return failure(accountFeedbackFailure("invalid_input"));
    }
    if (typeof input.message !== "string") {
      return failure(accountFeedbackFailure("invalid_input"));
    }
    const message = input.message.trim();
    if (message.length < MIN_FEEDBACK_LENGTH || message.length > MAX_FEEDBACK_LENGTH) {
      return failure(accountFeedbackFailure("invalid_input"));
    }
    if (!isFeedbackPath(input.pagePath)) {
      return failure(accountFeedbackFailure("invalid_input"));
    }
    return {
      ok: true,
      data: {
        feedbackType: input.feedbackType,
        sentiment: input.sentiment,
        message,
        pagePath: input.pagePath,
      },
    };
  } catch {
    return failure(accountFeedbackFailure("invalid_input"));
  }
}

export function getFeedbackOwnerContext(
  currentUserId: string | null | undefined,
): FeedbackOwnerContext | null {
  try {
    const owner = getBrowserDataOwner(currentUserId);
    if (!owner) return null;
    return owner.kind === "anonymous"
      ? { ownerKey: "anonymous", accountUserId: null }
      : { ownerKey: `account:${owner.userId}`, accountUserId: owner.userId };
  } catch {
    return null;
  }
}

export function getFeedbackOwnerKey(
  currentUserId: string | null | undefined,
): FeedbackOwnerKey | null {
  return getFeedbackOwnerContext(currentUserId)?.ownerKey ?? null;
}

export function isCurrentFeedbackRequest(
  request: FeedbackRequestIdentity,
  live: FeedbackLiveContext,
  active: FeedbackRequestIdentity | null,
): boolean {
  return live.isMounted &&
    live.ownerKey === request.ownerKey &&
    live.contextEpoch === request.contextEpoch &&
    active !== null &&
    active.ownerKey === request.ownerKey &&
    active.contextEpoch === request.contextEpoch &&
    active.requestToken === request.requestToken;
}

export function isSameFeedbackRequest(
  left: FeedbackRequestIdentity | null,
  right: FeedbackRequestIdentity,
): boolean {
  return left !== null &&
    left.ownerKey === right.ownerKey &&
    left.contextEpoch === right.contextEpoch &&
    left.requestToken === right.requestToken;
}

export function isSafePersistedAccountFailureCode(
  value: unknown,
): value is PersistedAccountFailureCode {
  return PERSISTED_ACCOUNT_FAILURE_CODES.includes(
    value as PersistedAccountFailureCode,
  );
}

export function accountFeedbackFailure(
  code: AccountFeedbackFailureCode,
): FeedbackFailure {
  return { ...(ACCOUNT_FAILURES[code] ?? ACCOUNT_FAILURES.unknown) };
}

export function localFeedbackFailure(
  code: LocalFeedbackFailureCode,
): FeedbackFailure {
  return { ...(LOCAL_FAILURES[code] ?? LOCAL_FAILURES.unknown) };
}

export function isStrictFeedbackTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,9}))?(Z|[+-]\d{2}:\d{2})$/.exec(value);
  if (!match) return false;
  const [, yearText, monthText, dayText, hourText, minuteText, secondText, , zone] = match;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const second = Number(secondText);
  if (month < 1 || month > 12 || day < 1 || hour > 23 || minute > 59 || second > 59) {
    return false;
  }
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day > daysInMonth) return false;
  if (zone !== "Z") {
    const zoneHour = Number(zone.slice(1, 3));
    const zoneMinute = Number(zone.slice(4, 6));
    if (zoneHour > 23 || zoneMinute > 59) return false;
  }
  return Number.isFinite(Date.parse(value));
}

function isFeedbackPath(value: unknown): value is string | null {
  if (value === null) return true;
  return typeof value === "string" &&
    value.trim() === value &&
    value.startsWith("/") &&
    !value.startsWith("//") &&
    !value.includes("?") &&
    !value.includes("#") &&
    !/:\/\//.test(value) &&
    !/[\u0000-\u001f\u007f]/.test(value);
}

function isFeedbackType(value: unknown): value is FeedbackType {
  return FEEDBACK_TYPES.includes(value as FeedbackType);
}

function isFeedbackSentiment(value: unknown): value is FeedbackSentiment {
  return FEEDBACK_SENTIMENTS.includes(value as FeedbackSentiment);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function failure<T>(error: FeedbackFailure): RepositoryResult<T> {
  return { ok: false, error };
}
