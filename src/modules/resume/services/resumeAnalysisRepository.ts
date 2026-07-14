"use client";

import type { User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import type {
  PersistentResumeAnalysis,
  RepositoryResult,
  SaveResumeAnalysisInput,
} from "@/modules/resume/types";

type ResumeAnalysisRow =
  Database["public"]["Tables"]["resume_analyses"]["Row"];

const DEFAULT_LIST_LIMIT = 10;
const MAX_LIST_LIMIT = 25;

export async function saveCurrentUserResumeAnalysis(
  input: SaveResumeAnalysisInput,
): Promise<RepositoryResult<PersistentResumeAnalysis>> {
  const authResult = await getCurrentAuthUser();

  if (!authResult.ok) {
    return authResult;
  }

  const { supabase, user } = authResult.data;
  const { data, error } = await supabase
    .from("resume_analyses")
    .insert({
      user_id: user.id,
      file_name: input.fileName,
      file_type: input.fileType,
      extracted_text: input.extractedText,
      parsed_profile: toJson(input.parsedProfile),
      user_profile: toJson(input.userProfile),
    })
    .select(
      "id, user_id, file_name, file_type, extracted_text, parsed_profile, user_profile, created_at",
    )
    .single();

  if (error) {
    return {
      ok: false,
      error: getDatabaseErrorMessage(error.message),
    };
  }

  return {
    ok: true,
    data: mapResumeAnalysisRow(data),
  };
}

export async function getLatestCurrentUserResumeAnalysis(): Promise<
  RepositoryResult<PersistentResumeAnalysis | null>
> {
  const authResult = await getCurrentAuthUser();

  if (!authResult.ok) {
    return authResult;
  }

  const { supabase, user } = authResult.data;
  const { data, error } = await supabase
    .from("resume_analyses")
    .select(
      "id, user_id, file_name, file_type, extracted_text, parsed_profile, user_profile, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      error: getDatabaseErrorMessage(error.message),
    };
  }

  return {
    ok: true,
    data: data ? mapResumeAnalysisRow(data) : null,
  };
}

export async function listCurrentUserResumeAnalyses(
  limit = DEFAULT_LIST_LIMIT,
): Promise<RepositoryResult<PersistentResumeAnalysis[]>> {
  const authResult = await getCurrentAuthUser();

  if (!authResult.ok) {
    return authResult;
  }

  const safeLimit = Math.min(
    Math.max(Math.floor(limit), 1),
    MAX_LIST_LIMIT,
  );
  const { supabase, user } = authResult.data;
  const { data, error } = await supabase
    .from("resume_analyses")
    .select(
      "id, user_id, file_name, file_type, extracted_text, parsed_profile, user_profile, created_at",
    )
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(safeLimit);

  if (error) {
    return {
      ok: false,
      error: getDatabaseErrorMessage(error.message),
    };
  }

  return {
    ok: true,
    data: data.map(mapResumeAnalysisRow),
  };
}

export async function deleteCurrentUserResumeAnalysis(
  id: string,
): Promise<RepositoryResult<{ id: string }>> {
  const authResult = await getCurrentAuthUser();

  if (!authResult.ok) {
    return authResult;
  }

  const { supabase, user } = authResult.data;
  const { error } = await supabase
    .from("resume_analyses")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    return {
      ok: false,
      error: getDatabaseErrorMessage(error.message),
    };
  }

  return {
    ok: true,
    data: {
      id,
    },
  };
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
      error: "Sign in to save resume analyses to your account.",
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

function mapResumeAnalysisRow(
  row: ResumeAnalysisRow,
): PersistentResumeAnalysis {
  return {
    id: row.id,
    userId: row.user_id,
    fileName: row.file_name,
    fileType: row.file_type,
    extractedText: row.extracted_text,
    parsedProfile: row.parsed_profile,
    userProfile: row.user_profile,
    createdAt: row.created_at ?? "",
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

  return message || "Resume analyzed in this browser. Account save did not finish.";
}
