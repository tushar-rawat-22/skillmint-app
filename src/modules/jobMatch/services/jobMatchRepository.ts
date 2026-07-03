"use client";

import type { User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import type { Database, Json } from "@/lib/supabase/database.types";
import type {
  PersistentJobMatch,
  RepositoryResult,
  SaveJobMatchInput,
  UpdateJobMatchRoadmapInput,
} from "@/modules/jobMatch/types";

type JobMatchRow = Database["public"]["Tables"]["job_matches"]["Row"];

const DEFAULT_LIST_LIMIT = 10;
const MAX_LIST_LIMIT = 25;
const JOB_MATCH_SELECT =
  "id, user_id, job_title, company_name, job_description, match_result, improvement_plan, rewrite_plan, roadmap, created_at";

export async function saveCurrentUserJobMatch(
  input: SaveJobMatchInput,
): Promise<RepositoryResult<PersistentJobMatch>> {
  const authResult = await getCurrentAuthUser();

  if (!authResult.ok) {
    return authResult;
  }

  const { supabase, user } = authResult.data;
  const { data, error } = await supabase
    .from("job_matches")
    .insert({
      user_id: user.id,
      job_title: input.jobTitle,
      company_name: input.companyName,
      job_description: input.jobDescription,
      match_result: toJson(input.matchResult),
      improvement_plan: toJson(input.improvementPlan),
      rewrite_plan: toJson(input.rewritePlan),
      roadmap: toJson(input.roadmap),
    })
    .select(JOB_MATCH_SELECT)
    .single();

  if (error) {
    return {
      ok: false,
      error: getDatabaseErrorMessage(error.message),
    };
  }

  return {
    ok: true,
    data: mapJobMatchRow(data),
  };
}

export async function updateCurrentUserJobMatchRoadmap(
  input: UpdateJobMatchRoadmapInput,
): Promise<RepositoryResult<PersistentJobMatch>> {
  const authResult = await getCurrentAuthUser();

  if (!authResult.ok) {
    return authResult;
  }

  const { supabase, user } = authResult.data;
  const { data, error } = await supabase
    .from("job_matches")
    .update({
      roadmap: toJson(input.roadmap),
    })
    .eq("id", input.id)
    .eq("user_id", user.id)
    .select(JOB_MATCH_SELECT)
    .single();

  if (error) {
    return {
      ok: false,
      error: getDatabaseErrorMessage(error.message),
    };
  }

  return {
    ok: true,
    data: mapJobMatchRow(data),
  };
}

export async function getLatestCurrentUserJobMatch(): Promise<
  RepositoryResult<PersistentJobMatch | null>
> {
  const authResult = await getCurrentAuthUser();

  if (!authResult.ok) {
    return authResult;
  }

  const { supabase, user } = authResult.data;
  const { data, error } = await supabase
    .from("job_matches")
    .select(JOB_MATCH_SELECT)
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
    data: data ? mapJobMatchRow(data) : null,
  };
}

export async function listCurrentUserJobMatches(
  limit = DEFAULT_LIST_LIMIT,
): Promise<RepositoryResult<PersistentJobMatch[]>> {
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
    .from("job_matches")
    .select(JOB_MATCH_SELECT)
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
    data: data.map(mapJobMatchRow),
  };
}

export async function deleteCurrentUserJobMatch(
  id: string,
): Promise<RepositoryResult<{ id: string }>> {
  const authResult = await getCurrentAuthUser();

  if (!authResult.ok) {
    return authResult;
  }

  const { supabase, user } = authResult.data;
  const { error } = await supabase
    .from("job_matches")
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
      error: "Sign in to save job matches to your account.",
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

function mapJobMatchRow(row: JobMatchRow): PersistentJobMatch {
  return {
    id: row.id,
    userId: row.user_id,
    jobTitle: row.job_title,
    companyName: row.company_name,
    jobDescription: row.job_description,
    matchResult: row.match_result,
    improvementPlan: row.improvement_plan,
    rewritePlan: row.rewrite_plan,
    roadmap: row.roadmap,
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
    normalizedMessage.includes("job_matches") &&
    (
      normalizedMessage.includes("relation") ||
      normalizedMessage.includes("could not find") ||
      normalizedMessage.includes("does not exist") ||
      normalizedMessage.includes("schema cache")
    )
  ) {
    return "Job match saved locally. Database sync will work after Supabase schema is installed.";
  }

  if (
    normalizedMessage.includes("row-level security") ||
    normalizedMessage.includes("permission denied")
  ) {
    return "Job match saved locally. Supabase blocked database sync; check the job_matches RLS policies.";
  }

  return message || "Job match saved locally. Database sync did not finish.";
}
