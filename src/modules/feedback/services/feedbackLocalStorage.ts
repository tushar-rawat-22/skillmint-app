"use client";

import type {
  LocalBetaFeedback,
  RepositoryResult,
  SubmitFeedbackInput,
} from "@/modules/feedback/types";

const BETA_FEEDBACK_STORAGE_KEY = "skillmint:beta-feedback";
const MAX_LOCAL_FEEDBACK_ITEMS = 20;

export function getLocalFeedbackItems(): LocalBetaFeedback[] {
  const storage = getBrowserStorage();

  if (!storage) {
    return [];
  }

  try {
    const storedValue = storage.getItem(BETA_FEEDBACK_STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    const parsedValue = JSON.parse(storedValue);

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter(isLocalBetaFeedback)
      .slice(0, MAX_LOCAL_FEEDBACK_ITEMS);
  } catch {
    return [];
  }
}

export function saveFeedbackLocally(
  input: SubmitFeedbackInput,
  syncError?: string,
): RepositoryResult<LocalBetaFeedback> {
  const storage = getBrowserStorage();

  if (!storage) {
    return {
      ok: false,
      error: "Feedback could not be saved in this browser.",
    };
  }

  const feedbackItem: LocalBetaFeedback = {
    id: createLocalFeedbackId(),
    feedbackType: input.feedbackType,
    sentiment: input.sentiment,
    message: input.message.trim(),
    pagePath: input.pagePath,
    createdAt: new Date().toISOString(),
    syncStatus: "local-only",
    ...(syncError ? { syncError } : {}),
  };

  try {
    const nextItems = [
      feedbackItem,
      ...getLocalFeedbackItems(),
    ].slice(0, MAX_LOCAL_FEEDBACK_ITEMS);

    storage.setItem(
      BETA_FEEDBACK_STORAGE_KEY,
      JSON.stringify(nextItems),
    );

    return {
      ok: true,
      data: feedbackItem,
    };
  } catch {
    return {
      ok: false,
      error: "Feedback could not be saved in this browser.",
    };
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

function createLocalFeedbackId(): string {
  return `feedback-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}

function isLocalBetaFeedback(value: unknown): value is LocalBetaFeedback {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const feedback = value as Record<string, unknown>;

  return (
    typeof feedback.id === "string" &&
    isFeedbackType(feedback.feedbackType) &&
    isFeedbackSentiment(feedback.sentiment) &&
    typeof feedback.message === "string" &&
    (
      feedback.pagePath === null ||
      typeof feedback.pagePath === "string"
    ) &&
    typeof feedback.createdAt === "string" &&
    feedback.syncStatus === "local-only" &&
    (
      feedback.syncError === undefined ||
      typeof feedback.syncError === "string"
    )
  );
}

function isFeedbackType(value: unknown): boolean {
  return value === "bug" ||
    value === "confusion" ||
    value === "ui" ||
    value === "idea" ||
    value === "other";
}

function isFeedbackSentiment(value: unknown): boolean {
  return value === "negative" ||
    value === "neutral" ||
    value === "positive";
}
