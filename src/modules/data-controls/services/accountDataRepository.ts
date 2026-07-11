"use client";

import type { User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import type {
  AccountDataCounts,
  AccountDataExport,
  AccountExportRecord,
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

const ACCOUNT_EXPORT_FIELDS = {
  profiles: [
    "full_name",
    "email",
    "career_goal",
    "target_role",
    "created_at",
    "updated_at",
  ],
  resume_analyses: [
    "id",
    "file_name",
    "file_type",
    "extracted_text",
    "parsed_profile",
    "user_profile",
    "created_at",
  ],
  job_matches: [
    "id",
    "job_title",
    "company_name",
    "job_description",
    "match_result",
    "improvement_plan",
    "rewrite_plan",
    "roadmap",
    "created_at",
  ],
  career_snapshots: [
    "id",
    "career_iq",
    "recruiter_confidence",
    "salary_projection",
    "role_matches",
    "created_at",
  ],
  beta_feedback: [
    "id",
    "feedback_type",
    "sentiment",
    "message",
    "page_path",
    "created_at",
  ],
} as const satisfies Record<
  keyof Database["public"]["Tables"],
  readonly string[]
>;

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
    selectProfileExportRows(supabase, user.id),
    selectResumeAnalysisExportRows(supabase, user.id),
    selectJobMatchExportRows(supabase, user.id),
    selectCareerSnapshotExportRows(supabase, user.id),
    selectBetaFeedbackExportRows(supabase, user.id),
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
      error: getDatabaseErrorMessage(error.message ?? ""),
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const counts: SavedReportsRpcRow = isSavedReportsRpcRow(row) ? row : {};

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
      error: getDatabaseErrorMessage(error.message ?? ""),
    };
  }

  return {
    ok: true,
    data: count ?? 0,
  };
}

async function selectProfileExportRows(
  supabase: SupabaseBrowserClient,
  userId: string,
): Promise<RepositoryResult<AccountExportRecord[]>> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name,email,career_goal,target_role,created_at,updated_at")
    .eq("id", userId)
    .order("created_at", {
      ascending: true,
    });

  return mapAccountExportRows("profiles", data, error);
}

async function selectResumeAnalysisExportRows(
  supabase: SupabaseBrowserClient,
  userId: string,
): Promise<RepositoryResult<AccountExportRecord[]>> {
  const { data, error } = await supabase
    .from("resume_analyses")
    .select("id,file_name,file_type,extracted_text,parsed_profile,user_profile,created_at")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: true,
    })
    .order("id", {
      ascending: true,
    });

  return mapAccountExportRows("resume_analyses", data, error);
}

async function selectJobMatchExportRows(
  supabase: SupabaseBrowserClient,
  userId: string,
): Promise<RepositoryResult<AccountExportRecord[]>> {
  const { data, error } = await supabase
    .from("job_matches")
    .select("id,job_title,company_name,job_description,match_result,improvement_plan,rewrite_plan,roadmap,created_at")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: true,
    })
    .order("id", {
      ascending: true,
    });

  return mapAccountExportRows("job_matches", data, error);
}

async function selectCareerSnapshotExportRows(
  supabase: SupabaseBrowserClient,
  userId: string,
): Promise<RepositoryResult<AccountExportRecord[]>> {
  const { data, error } = await supabase
    .from("career_snapshots")
    .select("id,career_iq,recruiter_confidence,salary_projection,role_matches,created_at")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: true,
    })
    .order("id", {
      ascending: true,
    });

  return mapAccountExportRows("career_snapshots", data, error);
}

async function selectBetaFeedbackExportRows(
  supabase: SupabaseBrowserClient,
  userId: string,
): Promise<RepositoryResult<AccountExportRecord[]>> {
  const { data, error } = await supabase
    .from("beta_feedback")
    .select("id,feedback_type,sentiment,message,page_path,created_at")
    .eq("user_id", userId)
    .order("created_at", {
      ascending: true,
    })
    .order("id", {
      ascending: true,
    });

  return mapAccountExportRows("beta_feedback", data, error);
}

function mapAccountExportRows(
  tableName: keyof typeof ACCOUNT_EXPORT_FIELDS,
  data: unknown,
  error: {
    message?: string;
  } | null,
): RepositoryResult<AccountExportRecord[]> {
  if (error) {
    const message = error.message ?? "";

    return {
      ok: false,
      error: getDatabaseErrorMessage(message),
    };
  }

  return {
    ok: true,
    data: sanitizeAccountExportRows(tableName, Array.isArray(data) ? data : []),
  };
}

function sanitizeAccountExportRows(
  tableName: keyof typeof ACCOUNT_EXPORT_FIELDS,
  rows: unknown[],
): AccountExportRecord[] {
  const allowedFields = ACCOUNT_EXPORT_FIELDS[tableName];

  return rows.map((row) => {
    const source: Record<string, unknown> = isRecord(row) ? row : {};
    const sanitizedRow: AccountExportRecord = {};

    for (const field of allowedFields) {
      if (field in source) {
        sanitizedRow[field] = source[field];
      }
    }

    return sanitizedRow;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isSavedReportsRpcRow(value: unknown): value is SavedReportsRpcRow {
  return isRecord(value);
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
