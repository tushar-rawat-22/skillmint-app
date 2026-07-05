"use client";

import type { User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import type {
  AccountOverview,
  RepositoryResult,
} from "@/modules/account/types";

export async function getAccountOverview(): Promise<
  RepositoryResult<AccountOverview>
> {
  const authResult = await getCurrentAuthUser();

  if (!authResult.ok) {
    return {
      ok: true,
      data: authResult.data,
    };
  }

  const { supabase, user } = authResult.data;
  const baseOverview = createBaseOverview({
    isConfigured: true,
    isSignedIn: true,
    email: user.email ?? null,
    profileStatus: "missing",
    message:
      "Account sync is active. LocalStorage remains available as a fallback.",
  });

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    return createUnavailableOverview(baseOverview, profileError.message);
  }

  const { count: resumeAnalysisCount, error: resumeCountError } =
    await supabase
      .from("resume_analyses")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("user_id", user.id);

  if (resumeCountError) {
    return createUnavailableOverview(baseOverview, resumeCountError.message);
  }

  const { data: latestResume, error: latestResumeError } = await supabase
    .from("resume_analyses")
    .select("file_name")
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (latestResumeError) {
    return createUnavailableOverview(baseOverview, latestResumeError.message);
  }

  const { count: jobMatchCount, error: jobMatchCountError } =
    await supabase
      .from("job_matches")
      .select("id", {
        count: "exact",
        head: true,
      })
      .eq("user_id", user.id);

  if (jobMatchCountError) {
    return createUnavailableOverview(baseOverview, jobMatchCountError.message);
  }

  const { data: latestJobMatch, error: latestJobMatchError } = await supabase
    .from("job_matches")
    .select("job_title, company_name")
    .eq("user_id", user.id)
    .order("created_at", {
      ascending: false,
    })
    .limit(1)
    .maybeSingle();

  if (latestJobMatchError) {
    return createUnavailableOverview(baseOverview, latestJobMatchError.message);
  }

  return {
    ok: true,
    data: {
      ...baseOverview,
      profileStatus: profile ? "saved" : "missing",
      latestResumeFileName: latestResume?.file_name ?? null,
      resumeAnalysisCount: resumeAnalysisCount ?? 0,
      latestJobTitle: latestJobMatch?.job_title ?? null,
      latestCompanyName: latestJobMatch?.company_name ?? null,
      jobMatchCount: jobMatchCount ?? 0,
    },
  };
}

async function getCurrentAuthUser(): Promise<
  | {
      ok: true;
      data: {
        supabase: NonNullable<ReturnType<typeof createSupabaseBrowserClient>>;
        user: User;
      };
    }
  | {
      ok: false;
      data: AccountOverview;
    }
> {
  const configStatus = getSupabaseConfigStatus();

  if (!configStatus.isConfigured) {
    return {
      ok: false,
      data: createBaseOverview({
        isConfigured: false,
        isSignedIn: false,
        email: null,
        profileStatus: "unavailable",
        message: configStatus.message,
      }),
    };
  }

  const supabase = createSupabaseBrowserClient();

  if (!supabase) {
    return {
      ok: false,
      data: createBaseOverview({
        isConfigured: true,
        isSignedIn: false,
        email: null,
        profileStatus: "unavailable",
        message: "Supabase auth client is unavailable.",
      }),
    };
  }

  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    return {
      ok: false,
      data: createBaseOverview({
        isConfigured: true,
        isSignedIn: false,
        email: null,
        profileStatus: "unavailable",
        message: "Sign in to sync your account.",
      }),
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

function createBaseOverview(input: {
  isConfigured: boolean;
  isSignedIn: boolean;
  email: string | null;
  profileStatus: AccountOverview["profileStatus"];
  message: string;
}): AccountOverview {
  return {
    isConfigured: input.isConfigured,
    isSignedIn: input.isSignedIn,
    email: input.email,
    profileStatus: input.profileStatus,
    latestResumeFileName: null,
    resumeAnalysisCount: 0,
    latestJobTitle: null,
    latestCompanyName: null,
    jobMatchCount: 0,
    message: input.message,
  };
}

function createUnavailableOverview(
  overview: AccountOverview,
  message: string,
): RepositoryResult<AccountOverview> {
  return {
    ok: true,
    data: {
      ...overview,
      profileStatus: "unavailable",
      message: getDatabaseErrorMessage(message),
    },
  };
}

function getDatabaseErrorMessage(message: string): string {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("relation") ||
    normalizedMessage.includes("could not find") ||
    normalizedMessage.includes("does not exist") ||
    normalizedMessage.includes("schema cache")
  ) {
    return "Account data is unavailable until supabase/schema_v1.sql is installed in the Supabase SQL editor.";
  }

  if (
    normalizedMessage.includes("row-level security") ||
    normalizedMessage.includes("permission denied")
  ) {
    return "Supabase blocked the account overview request. Check that the Sprint 6 RLS policies are installed.";
  }

  return message || "Account overview is unavailable right now.";
}
