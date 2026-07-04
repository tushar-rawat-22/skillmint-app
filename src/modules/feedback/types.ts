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
  syncError?: string;
}

export type RepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
