"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import {
  accountFeedbackFailure,
  getFeedbackOwnerKey,
  isStrictFeedbackTimestamp,
  normalizeFeedbackInput,
} from "@/modules/feedback/feedbackReliability";
import type {
  AccountFeedbackFailureCode,
  PersistedBetaFeedback,
  RepositoryResult,
  SubmitFeedbackInput,
} from "@/modules/feedback/types";

const FEEDBACK_SELECT =
  "id, user_id, feedback_type, sentiment, message, page_path, status, created_at";

export type FeedbackRepositoryAdapter = {
  getCurrentUser: () => Promise<{ userId: string | null; error?: unknown }>;
  insertFeedback: (input: {
    userId: string;
    feedbackType: SubmitFeedbackInput["feedbackType"];
    sentiment: SubmitFeedbackInput["sentiment"];
    message: string;
    pagePath: string | null;
  }) => Promise<{ data: unknown; error?: unknown }>;
};

export async function submitBetaFeedback(
  input: SubmitFeedbackInput,
  expectedUserId: string,
): Promise<RepositoryResult<PersistedBetaFeedback>> {
  try {
    if (!getSupabaseConfigStatus().isConfigured) {
      return failure("not_configured");
    }
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return failure("not_configured");

    return await submitBetaFeedbackWithAdapter(input, expectedUserId, {
      async getCurrentUser() {
        const result = await supabase.auth.getUser();
        return {
          userId: result.data.user?.id ?? null,
          ...(result.error ? { error: result.error } : {}),
        };
      },
      async insertFeedback(value) {
        const result = await supabase
          .from("beta_feedback")
          .insert({
            user_id: value.userId,
            feedback_type: value.feedbackType,
            sentiment: value.sentiment,
            message: value.message,
            page_path: value.pagePath,
          })
          .select(FEEDBACK_SELECT)
          .single();
        return { data: result.data, ...(result.error ? { error: result.error } : {}) };
      },
    });
  } catch (error) {
    return failure(classifyProviderFailure(error));
  }
}

export async function submitBetaFeedbackWithAdapter(
  input: unknown,
  expectedUserId: unknown,
  adapter: FeedbackRepositoryAdapter | null,
): Promise<RepositoryResult<PersistedBetaFeedback>> {
  try {
    const normalized = normalizeFeedbackInput(input);
    if (!normalized.ok) return normalized;

    const expectedOwnerKey = getFeedbackOwnerKey(
      typeof expectedUserId === "string" ? expectedUserId : undefined,
    );
    if (!expectedOwnerKey || !expectedOwnerKey.startsWith("account:")) {
      return failure("not_authenticated");
    }
    if (!adapter) return failure("not_configured");

    const expectedId = expectedOwnerKey.slice("account:".length);
    const auth = await adapter.getCurrentUser();
    if (auth.error) return failure(classifyProviderFailure(auth.error));
    if (!auth.userId) return failure("not_authenticated");

    const currentOwnerKey = getFeedbackOwnerKey(auth.userId);
    if (currentOwnerKey !== expectedOwnerKey) return failure("account_changed");

    const inserted = await adapter.insertFeedback({
      userId: expectedId,
      ...normalized.data,
    });
    if (inserted.error) return failure(classifyProviderFailure(inserted.error));

    const reconstructed = reconstructFeedbackRow(
      inserted.data,
      normalized.data,
      expectedId,
    );
    return reconstructed
      ? { ok: true, data: reconstructed }
      : failure("invalid_response");
  } catch (error) {
    return failure(classifyProviderFailure(error));
  }
}

function reconstructFeedbackRow(
  value: unknown,
  input: SubmitFeedbackInput,
  expectedUserId: string,
): PersistedBetaFeedback | null {
  try {
    if (!isRecord(value)) return null;
    if (typeof value.id !== "string" || !value.id.trim()) return null;
    if (value.user_id !== expectedUserId) return null;
    if (value.feedback_type !== input.feedbackType) return null;
    if (value.sentiment !== input.sentiment) return null;
    if (value.message !== input.message) return null;
    if (value.page_path !== input.pagePath) return null;
    if (typeof value.status !== "string" || !value.status.trim()) return null;
    if (!isStrictFeedbackTimestamp(value.created_at)) return null;

    return {
      id: value.id,
      userId: expectedUserId,
      feedbackType: input.feedbackType,
      sentiment: input.sentiment,
      message: input.message,
      pagePath: input.pagePath,
      status: value.status,
      createdAt: value.created_at,
    };
  } catch {
    return null;
  }
}

function classifyProviderFailure(error: unknown): AccountFeedbackFailureCode {
  try {
    const record = isRecord(error) ? error : {};
    const text = [
      typeof error === "string" ? error : "",
      typeof record.message === "string" ? record.message : "",
      typeof record.code === "string" ? record.code : "",
      typeof record.name === "string" ? record.name : "",
    ].join(" ").toLowerCase();
    const status = typeof record.status === "number" ? record.status : null;

    if (
      status === 401 || status === 403 ||
      /row-level security|permission denied|not authorized|forbidden|42501/.test(text)
    ) return "permission_denied";
    if (
      /relation|column|schema cache|does not exist|could not find|42p01|42703|pgrst2/.test(text)
    ) return "schema_unavailable";
    if (
      status === 408 || status === 429 || (status !== null && status >= 500) ||
      /network|fetch|timeout|timed out|connection|offline|abort/.test(text)
    ) return "network_failure";
    return "unknown";
  } catch {
    return "unknown";
  }
}

function failure<T>(
  code: AccountFeedbackFailureCode,
): RepositoryResult<T> {
  return { ok: false, error: accountFeedbackFailure(code) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
