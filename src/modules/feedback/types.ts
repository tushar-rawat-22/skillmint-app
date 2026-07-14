export type FeedbackType =
  | "bug"
  | "confusion"
  | "ui"
  | "idea"
  | "other";

export type FeedbackSentiment = "negative" | "neutral" | "positive";

export interface SubmitFeedbackInput {
  feedbackType: FeedbackType;
  sentiment: FeedbackSentiment;
  message: string;
  pagePath: string | null;
}

export interface PersistedBetaFeedback {
  id: string;
  userId: string | null;
  feedbackType: FeedbackType;
  sentiment: FeedbackSentiment;
  message: string;
  pagePath: string | null;
  status: string;
  createdAt: string;
}

export interface LocalBetaFeedback extends SubmitFeedbackInput {
  id: string;
  createdAt: string;
  syncStatus: "local-only";
  syncError?: PersistedAccountFailureCode;
}

export type AccountFeedbackFailureCode =
  | "invalid_input"
  | "not_configured"
  | "not_authenticated"
  | "account_changed"
  | "network_failure"
  | "permission_denied"
  | "schema_unavailable"
  | "invalid_response"
  | "unknown";

export type LocalFeedbackFailureCode =
  | "invalid_input"
  | "owner_unresolved"
  | "storage_unavailable"
  | "storage_read_failed"
  | "storage_corrupted"
  | "storage_write_failed"
  | "id_generation_failed"
  | "unknown";

export type FeedbackFailureCode =
  | AccountFeedbackFailureCode
  | LocalFeedbackFailureCode;

export type PersistedAccountFailureCode = Exclude<
  AccountFeedbackFailureCode,
  "invalid_input"
>;

export type FeedbackFailure = {
  code: FeedbackFailureCode;
  message: string;
  retryable: boolean;
};

export type RepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: FeedbackFailure };
