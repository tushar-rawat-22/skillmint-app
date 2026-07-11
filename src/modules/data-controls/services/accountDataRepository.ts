"use client";

import type { User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import type {
  AccountDataCounts,
  AccountDataExport,
  RepositoryResult,
  SavedReportsDeletionCounts,
} from "@/modules/data-controls/types";

type SupabaseBrowserClient = NonNullable<
  ReturnType<typeof createSupabaseBrowserClient>
>;

type SavedReportsRpcRow = {
  resume_analyses_deleted?: number;
  job_matches_deleted?: number;
  career_snapshots_deleted?: number;
};

export async function getCurrentUserAccountDataCounts(): Promise<
  RepositoryResult<AccountDataCounts>
> {
  const authResult = await getCurrentAuthUser();

  if (!authResult.ok) {
    return authResult;
  }

  const { supabase, user } = authResult.data;

  try {
    const [
      profileCount,
      resumeAnalysesCount,
      jobMatchesCount,
      careerSnapshotsCount,
      betaFeedbackCount,
    ] = await Promise.all([
      getCount(supabase, "profiles", "id", user.id),
      getCount(supabase, "resume_analyses", "user_id", user.id),
      getCount(supabase, "job_matches", "user_id", user.id),
      getCount(supabase, "career_snapshots", "user_id", user.id),
      getCount(supabase, "beta_feedback", "user_id", user.id),
    ]);

    const counts = [
      profileCount,
      resumeAnalysesCount,
      jobMatchesCount,
      careerSnapshotsCount,
      betaFeedbackCount,
    ];
    const failedCount = counts.find((count) => !count.ok);

    if (failedCount && !failedCount.ok) {
      return failedCount;
    }

    return {
      ok: true,
      data: {
        profile: profileCount.ok ? profileCount.data : 0,
        resumeAnalyses: resumeAnalysesCount.ok ? resumeAnalysesCount.data : 0,
        jobMatches: jobMatchesCount.ok ? jobMatchesCount.data : 0,
        careerSnapshots: careerSnapshotsCount.ok ? careerSnapshotsCount.data : 0,
        betaFeedback: betaFeedbackCount.ok ? betaFeedbackCount.data : 0,
      },
    };
  } catch {
    return {
      ok: false,
      error: "Account data counts are unavailable right now.",
    };
  }
}

export async function buildCurrentUserAccountDataExport(
  exportedAt = new Date().toISOString(),
): Promise<RepositoryResult<{
  fileName: string;
  json: string;
}>> {
  const authResult = await getCurrentAuthUser();

  if (!authResult.ok) {
    return authResult;
  }

  const { supabase, user } = authResult.data;

  const [
    profile,
    resumeAnalyses,
    jobMatches,
    careerSnapshots,
    betaFeedback,
  ] = await Promise.all([
    selectRows(supabase, "profiles", "id", user.id, "created_at"),
    selectRows(supabase, "resume_analyses", "user_id", user.id, "created_at"),
    selectRows(supabase, "job_matches", "user_id", user.id, "created_at"),
    selectRows(supabase, "career_snapshots", "user_id", user.id, "created_at"),
    selectRows(supabase, "beta_feedback", "user_id", user.id, "created_at"),
  ]);

  const failedQuery = [
    profile,
    resumeAnalyses,
    jobMatches,
    careerSnapshots,
    betaFeedback,
  ].find((result) => !result.ok);

  if (failedQuery && !failedQuery.ok) {
    return failedQuery;
  }

  const payload: AccountDataExport = {
    exportVersion: "skillmint-account-export-v1",
    source: "account",
    exportedAt,
    data: {
      profile: profile.ok ? profile.data : [],
      resumeAnalyses: resumeAnalyses.ok ? resumeAnalyses.data : [],
      jobMatches: jobMatches.ok ? jobMatches.data : [],
      careerSnapshots: careerSnapshots.ok ? careerSnapshots.data : [],
      betaFeedback: betaFeedback.ok ? betaFeedback.data : [],
    },
  };

  return {
    ok: true,
    data: {
      fileName: `skillmint-account-${exportedAt.slice(0, 10)}.json`,
      json: `${JSON.stringify(payload, null, 2)}\n`,
    },
  };
}

export async function deleteCurrentUserSavedReports(): Promise<
  RepositoryResult<SavedReportsDeletionCounts>
> {
  const authResult = await getCurrentAuthUser();

  if (!authResult.ok) {
    return authResult;
  }

  const { supabase } = authResult.data;
  const { data, error } = await supabase.rpc(
    "delete_current_user_saved_reports",
  );

  if (error) {
    return {
      ok: false,
      error: getDatabaseErrorMessage(error.message),
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const counts = isSavedReportsRpcRow(row) ? row : {};

  return {
    ok: true,
    data: {
      resumeAnalysesDeleted: counts.resume_analyses_deleted ?? 0,
      jobMatchesDeleted: counts.job_matches_deleted ?? 0,
      careerSnapshotsDeleted: counts.career_snapshots_deleted ?? 0,
    },
  };
}

async function getCurrentAuthUser(): Promise<
  RepositoryResult<{
    supabase: SupabaseBrowserClient;
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
      error: "Sign in to manage account-synced data.",
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

async function getCount(
  supabase: SupabaseBrowserClient,
  tableName: keyof Database["public"]["Tables"],
  ownerColumn: string,
  ownerValue: string,
): Promise<RepositoryResult<number>> {
  const { count, error } = await supabase
    .from(tableName)
    .select("id", {
      count: "exact",
      head: true,
    })
    .eq(ownerColumn, ownerValue);

  if (error) {
    return {
      ok: false,
      error: getDatabaseErrorMessage(error.message),
    };
  }

  return {
    ok: true,
    data: count ?? 0,
  };
}

async function selectRows<TTableName extends keyof Database["public"]["Tables"]>(
  supabase: SupabaseBrowserClient,
  tableName: TTableName,
  ownerColumn: string,
  ownerValue: string,
  orderColumn: string,
): Promise<RepositoryResult<Array<Database["public"]["Tables"][TTableName]["Row"]>>> {
  const { data, error } = await supabase
    .from(tableName)
    .select("*")
    .eq(ownerColumn, ownerValue)
    .order(orderColumn, {
      ascending: true,
    });

  if (error) {
    return {
      ok: false,
      error: getDatabaseErrorMessage(error.message),
    };
  }

  return {
    ok: true,
    data: data ?? [],
  };
}

function isSavedReportsRpcRow(value: unknown): value is SavedReportsRpcRow {
  return Boolean(value) && typeof value === "object" &&
    !Array.isArray(value);
}

function getDatabaseErrorMessage(message: string): string {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("relation") ||
    normalizedMessage.includes("could not find") ||
    normalizedMessage.includes("does not exist") ||
    normalizedMessage.includes("schema cache")
  ) {
    return "Account data controls require the latest Supabase schema.";
  }

  if (
    normalizedMessage.includes("row-level security") ||
    normalizedMessage.includes("permission denied")
  ) {
    return "Supabase blocked this data-control request. Check RLS policies.";
  }

  return message || "Account data control failed. Please try again.";
}
