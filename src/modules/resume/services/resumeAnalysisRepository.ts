"use client";

import type { Json } from "@/lib/supabase/database.types";
import {
  authenticateResumeOwner,
  confirmResumeOwner,
  hasExactKeys,
  isRecord,
  isUuid,
  parsePersistentResumeAnalysis,
  RESUME_ANALYSIS_COLUMNS,
  type ResumeSupabaseClient,
} from "@/modules/resume/services/resumeRepositorySupport";
import type {
  PersistentResumeAnalysis,
  ResumeAnalysisRepositoryOptions,
  ResumeAnalysisRepositoryResult,
  SaveResumeAnalysisInput,
} from "@/modules/resume/types";

const DEFAULT_LIST_LIMIT = 10;
const MAX_LIST_LIMIT = 25;
const DELETED_RESUME_ROW_KEYS = ["id", "user_id"] as const;
const HISTORY_IDENTITY_MESSAGES = {
  unauthenticated:
    "Sign in to access resume analyses saved to your account.",
  accountChanged:
    "Your account changed while this resume request was running.",
} as const;
const SAVE_IDENTITY_MESSAGES = {
  unauthenticated: "Sign in to save resume analyses to your account.",
  accountChanged:
    "Your account changed while this resume was being analyzed.",
} as const;

type SaveResumeAnalysisOptions = {
  expectedUserId?: string | null;
};

export type SaveResumeAnalysisResult =
  | {
      ok: true;
      data: PersistentResumeAnalysis;
    }
  | {
      ok: false;
      error: string;
      reason: "owner_changed" | "save_failed";
    };

export async function saveCurrentUserResumeAnalysis(
  input: SaveResumeAnalysisInput,
  options: SaveResumeAnalysisOptions = {},
): Promise<SaveResumeAnalysisResult> {
  const authResult = await authenticateResumeOwner(
    options.expectedUserId,
    {
      unauthenticated: "Sign in to save resume analyses to your account.",
      accountChanged:
        "Your account changed while this resume was being analyzed.",
    },
  );

  if (!authResult.ok) {
    return {
      ok: false,
      error: authResult.error,
      reason: authResult.reason === "account_changed"
        ? "owner_changed"
        : "save_failed",
    };
  }

  const { supabase, user } = authResult.data;
  const ownerId = user.id;

  let response: Awaited<ReturnType<typeof executeResumeInsert>>;
  try {
    response = await executeResumeInsert(supabase, ownerId, input);
  } catch {
    return saveFailureAfterIdentityConfirmation(
      supabase,
      ownerId,
      "Resume analyzed in this browser. Account save did not finish.",
    );
  }

  if (response.error) {
    const finalIdentity = await confirmResumeOwner(
      supabase,
      ownerId,
      SAVE_IDENTITY_MESSAGES,
    );
    return {
      ok: false,
      error: finalIdentity.ok
        ? getDatabaseErrorMessage(response.error.message)
        : finalIdentity.error,
      reason: finalIdentity.ok || finalIdentity.reason !== "account_changed"
        ? "save_failed"
        : "owner_changed",
    };
  }

  const mappedAnalysis = parsePersistentResumeAnalysis(response.data);
  if (!mappedAnalysis || mappedAnalysis.userId !== ownerId) {
    return {
      ok: false,
      error:
        "Resume save returned an unexpected account owner.",
      reason: "save_failed",
    };
  }

  const finalIdentity = await confirmResumeOwner(
    supabase,
    ownerId,
    SAVE_IDENTITY_MESSAGES,
  );
  if (!finalIdentity.ok) {
    return {
      ok: false,
      error: finalIdentity.error,
      reason: finalIdentity.reason === "account_changed"
        ? "owner_changed"
        : "save_failed",
    };
  }

  return {
    ok: true,
    data: mappedAnalysis,
  };
}

export async function getLatestCurrentUserResumeAnalysis(
  options: ResumeAnalysisRepositoryOptions = {},
): Promise<
  ResumeAnalysisRepositoryResult<PersistentResumeAnalysis | null>
> {
  const authResult = await authenticateResumeOwner(
    options.expectedUserId,
    HISTORY_IDENTITY_MESSAGES,
  );
  if (!authResult.ok) {
    return authResult;
  }

  const { supabase, user } = authResult.data;

  let response: Awaited<ReturnType<typeof executeLatestResumeQuery>>;
  try {
    response = await executeLatestResumeQuery(supabase, user.id);
  } catch {
    return failureAfterIdentityConfirmation(
      supabase,
      user.id,
      "Could not load the latest saved resume analysis.",
    );
  }

  const finalIdentity = await confirmResumeOwner(
    supabase,
    user.id,
    HISTORY_IDENTITY_MESSAGES,
  );
  if (!finalIdentity.ok) {
    return finalIdentity;
  }

  if (response.error) {
    return repositoryFailure(
      "provider_error",
      "Could not load the latest saved resume analysis.",
    );
  }

  if (!Array.isArray(response.data) || response.data.length > 1) {
    return repositoryFailure(
      "invalid_response",
      "Saved resume history returned an invalid response.",
    );
  }

  if (response.data.length === 0) {
    return {
      ok: true,
      data: null,
    };
  }

  const analysis = parsePersistentResumeAnalysis(response.data[0]);
  if (!analysis || analysis.userId !== user.id) {
    return repositoryFailure(
      "invalid_response",
      "Saved resume history returned an unexpected account owner.",
    );
  }

  return {
    ok: true,
    data: analysis,
  };
}

export async function listCurrentUserResumeAnalyses(
  limit = DEFAULT_LIST_LIMIT,
  options: ResumeAnalysisRepositoryOptions = {},
): Promise<ResumeAnalysisRepositoryResult<PersistentResumeAnalysis[]>> {
  const authResult = await authenticateResumeOwner(
    options.expectedUserId,
    HISTORY_IDENTITY_MESSAGES,
  );
  if (!authResult.ok) {
    return authResult;
  }

  const safeLimit = Math.min(
    Math.max(Math.floor(limit), 1),
    MAX_LIST_LIMIT,
  );
  const { supabase, user } = authResult.data;

  let response: Awaited<ReturnType<typeof executeResumeListQuery>>;
  try {
    response = await executeResumeListQuery(supabase, user.id, safeLimit);
  } catch {
    return failureAfterIdentityConfirmation(
      supabase,
      user.id,
      "Could not load saved resume analyses.",
    );
  }

  const finalIdentity = await confirmResumeOwner(
    supabase,
    user.id,
    HISTORY_IDENTITY_MESSAGES,
  );
  if (!finalIdentity.ok) {
    return finalIdentity;
  }

  if (response.error) {
    return repositoryFailure(
      "provider_error",
      "Could not load saved resume analyses.",
    );
  }

  if (!Array.isArray(response.data) || response.data.length > safeLimit) {
    return repositoryFailure(
      "invalid_response",
      "Saved resume history returned an invalid response.",
    );
  }

  const analyses: PersistentResumeAnalysis[] = [];
  const analysisIds = new Set<string>();

  for (const row of response.data) {
    const analysis = parsePersistentResumeAnalysis(row);
    if (
      !analysis ||
      analysis.userId !== user.id ||
      analysisIds.has(analysis.id)
    ) {
      return repositoryFailure(
        "invalid_response",
        "Saved resume history returned invalid account-owned analyses.",
      );
    }

    analysisIds.add(analysis.id);
    analyses.push(analysis);
  }

  return {
    ok: true,
    data: analyses,
  };
}

export async function deleteCurrentUserResumeAnalysis(
  id: string,
  options: ResumeAnalysisRepositoryOptions = {},
): Promise<ResumeAnalysisRepositoryResult<{ id: string }>> {
  if (!isUuid(id)) {
    return repositoryFailure(
      "invalid_input",
      "The saved resume analysis identifier is invalid.",
    );
  }

  const authResult = await authenticateResumeOwner(
    options.expectedUserId,
    HISTORY_IDENTITY_MESSAGES,
  );
  if (!authResult.ok) {
    return authResult;
  }

  const { supabase, user } = authResult.data;

  let response: Awaited<ReturnType<typeof executeResumeDelete>>;
  try {
    response = await executeResumeDelete(supabase, user.id, id);
  } catch {
    return failureAfterIdentityConfirmation(
      supabase,
      user.id,
      "Could not delete the saved resume analysis.",
    );
  }

  const finalIdentity = await confirmResumeOwner(
    supabase,
    user.id,
    HISTORY_IDENTITY_MESSAGES,
  );
  if (!finalIdentity.ok) {
    return finalIdentity;
  }

  if (response.error) {
    return repositoryFailure(
      "provider_error",
      "Could not delete the saved resume analysis.",
    );
  }

  if (!Array.isArray(response.data) || response.data.length > 1) {
    return repositoryFailure(
      "invalid_response",
      "Saved resume deletion returned an invalid response.",
    );
  }

  if (response.data.length === 0) {
    return repositoryFailure(
      "not_found",
      "This saved resume analysis no longer exists in your account.",
    );
  }

  const deletedRow = response.data[0];
  if (
    !isRecord(deletedRow) ||
    !hasExactKeys(deletedRow, DELETED_RESUME_ROW_KEYS) ||
    deletedRow.id !== id ||
    deletedRow.user_id !== user.id
  ) {
    return repositoryFailure(
      "invalid_response",
      "Saved resume deletion returned an unexpected account owner.",
    );
  }

  return {
    ok: true,
    data: {
      id,
    },
  };
}

async function executeResumeInsert(
  supabase: ResumeSupabaseClient,
  ownerId: string,
  input: SaveResumeAnalysisInput,
) {
  return supabase
    .from("resume_analyses")
    .insert({
      user_id: ownerId,
      file_name: input.fileName,
      file_type: input.fileType,
      extracted_text: input.extractedText,
      parsed_profile: toJson(input.parsedProfile),
      user_profile: toJson(input.userProfile),
    })
    .select(RESUME_ANALYSIS_COLUMNS)
    .single();
}

async function executeLatestResumeQuery(
  supabase: ResumeSupabaseClient,
  ownerId: string,
) {
  return supabase
    .from("resume_analyses")
    .select(RESUME_ANALYSIS_COLUMNS)
    .eq("user_id", ownerId)
    .order("created_at", {
      ascending: false,
    })
    .limit(1);
}

async function executeResumeListQuery(
  supabase: ResumeSupabaseClient,
  ownerId: string,
  limit: number,
) {
  return supabase
    .from("resume_analyses")
    .select(RESUME_ANALYSIS_COLUMNS)
    .eq("user_id", ownerId)
    .order("created_at", {
      ascending: false,
    })
    .limit(limit);
}

async function executeResumeDelete(
  supabase: ResumeSupabaseClient,
  ownerId: string,
  id: string,
) {
  return supabase
    .from("resume_analyses")
    .delete()
    .eq("id", id)
    .eq("user_id", ownerId)
    .select("id, user_id")
    .limit(2);
}

async function failureAfterIdentityConfirmation<T>(
  supabase: ResumeSupabaseClient,
  ownerId: string,
  message: string,
): Promise<ResumeAnalysisRepositoryResult<T>> {
  const identity = await confirmResumeOwner(
    supabase,
    ownerId,
    HISTORY_IDENTITY_MESSAGES,
  );
  return identity.ok
    ? repositoryFailure("provider_error", message)
    : identity;
}

async function saveFailureAfterIdentityConfirmation(
  supabase: ResumeSupabaseClient,
  ownerId: string,
  message: string,
): Promise<SaveResumeAnalysisResult> {
  const identity = await confirmResumeOwner(
    supabase,
    ownerId,
    SAVE_IDENTITY_MESSAGES,
  );
  return {
    ok: false,
    error: identity.ok ? message : identity.error,
    reason: identity.ok || identity.reason !== "account_changed"
      ? "save_failed"
      : "owner_changed",
  };
}

function toJson(value: unknown): Json | null {
  if (value === undefined) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(value)) as Json;
  } catch {
    return null;
  }
}

function repositoryFailure<T>(
  reason: Exclude<
    ResumeAnalysisRepositoryResult<T>,
    { ok: true }
  >["reason"],
  error: string,
): ResumeAnalysisRepositoryResult<T> {
  return {
    ok: false,
    error,
    reason,
  };
}

function getDatabaseErrorMessage(message: string): string {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("resume_analyses") &&
    (
      normalizedMessage.includes("relation") ||
      normalizedMessage.includes("could not find") ||
      normalizedMessage.includes("does not exist") ||
      normalizedMessage.includes("schema cache")
    )
  ) {
    return "Resume analyzed in this browser. Account save will work after Supabase schema is installed.";
  }

  if (
    normalizedMessage.includes("row-level security") ||
    normalizedMessage.includes("permission denied")
  ) {
    return "Resume analyzed in this browser. Supabase blocked database sync; check the resume_analyses RLS policies.";
  }

  return "Resume analyzed in this browser. Account save did not finish.";
}
