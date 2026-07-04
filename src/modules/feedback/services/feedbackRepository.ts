"use client";

import type { User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import type {
  PersistedBetaFeedback,
  RepositoryResult,
  SubmitFeedbackInput,
} from "@/modules/feedback/types";

type FeedbackRow = Database["public"]["Tables"]["beta_feedback"]["Row"];

const FEEDBACK_SELECT =
  "id, user_id, feedback_type, sentiment, message, page_path, status, created_at";

export async function submitBetaFeedback(
  input: SubmitFeedbackInput,
): Promise<RepositoryResult<PersistedBetaFeedback>> {
  try {
    const authResult = await getCurrentAuthUser();

    if (!authResult.ok) {
      return authResult;
    }

    const { supabase, user } = authResult.data;
    const { data, error } = await supabase
      .from("beta_feedback")
      .insert({
        user_id: user.id,
        feedback_type: input.feedbackType,
        sentiment: input.sentiment,
        message: input.message.trim(),
        page_path: getNullableText(input.pagePath),
      })
      .select(FEEDBACK_SELECT)
      .single();

    if (error) {
      return {
        ok: false,
        error: getDatabaseErrorMessage(error.message),
      };
    }

    return {
      ok: true,
      data: mapFeedbackRow(data),
    };
  } catch {
    return {
      ok: false,
      error: "Feedback saved locally. Account sync did not finish.",
    };
  }
}

async function getCurrentAuthUser(): Promise<
  RepositoryResult<{
    supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>;
    user: User;
  }>
> {
  const configStatus = getSupabaseConfigStatus();

  if (!configStatus.isConfigured) {
    return {
      ok: false,
      error: configStatus.message,
    };
  }

  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return {
      ok: false,
      error: "Supabase auth client is unavailable.",
    };
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      ok: false,
      error: "Sign in to sync beta feedback to your account.",
    };
  }

  return {
    ok: true,
    data: {
      supabase,
      user: data.user,
    },
  };
}

function mapFeedbackRow(row: FeedbackRow): PersistedBetaFeedback {
  return {
    id: row.id,
    userId: row.user_id,
    feedbackType: row.feedback_type,
    sentiment: row.sentiment,
    message: row.message,
    pagePath: row.page_path,
    status: row.status,
    createdAt: row.created_at,
  };
}

function getNullableText(value: string | null): string | null {
  const trimmedValue = value?.trim() ?? "";

  return trimmedValue || null;
}

function getDatabaseErrorMessage(message: string): string {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("beta_feedback") &&
    (
      normalizedMessage.includes("relation") ||
      normalizedMessage.includes("could not find") ||
      normalizedMessage.includes("does not exist") ||
      normalizedMessage.includes("schema cache")
    )
  ) {
    return "Feedback saved locally. Run supabase/schema_v2_feedback.sql to enable account sync.";
  }

  if (
    normalizedMessage.includes("row-level security") ||
    normalizedMessage.includes("permission denied")
  ) {
    return "Feedback saved locally. Supabase blocked feedback sync; check beta_feedback RLS policies.";
  }

  return message || "Feedback saved locally. Account sync did not finish.";
}
