"use client";

import type { User } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import type {
  PersistentProfile,
  ProfileInput,
  RepositoryResult,
} from "@/modules/profile/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export async function getCurrentUserProfile(): Promise<
  RepositoryResult<PersistentProfile | null>
> {
  const authResult = await getCurrentAuthUser();

  if (!authResult.ok) {
    return authResult;
  }

  const { supabase, user } = authResult.data;
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, email, career_goal, target_role, created_at, updated_at",
    )
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      ok: false,
      error: getDatabaseErrorMessage(error.message),
    };
  }

  return {
    ok: true,
    data: data ? mapProfileRow(data) : null,
  };
}

export async function upsertCurrentUserProfile(
  input: ProfileInput,
): Promise<RepositoryResult<PersistentProfile>> {
  const authResult = await getCurrentAuthUser();

  if (!authResult.ok) {
    return authResult;
  }

  const { supabase, user } = authResult.data;
  const { data, error } = await supabase
    .from("profiles")
    .upsert(
      {
        id: user.id,
        full_name: getNullableText(input.fullName),
        email: user.email ?? null,
        career_goal: getNullableText(input.careerGoal),
        target_role: getNullableText(input.targetRole),
      },
      {
        onConflict: "id",
      },
    )
    .select(
      "id, full_name, email, career_goal, target_role, created_at, updated_at",
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
    data: mapProfileRow(data),
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
      error: "Sign in to save your SkillMint career profile.",
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

function mapProfileRow(row: ProfileRow): PersistentProfile {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    careerGoal: row.career_goal,
    targetRole: row.target_role,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function getNullableText(value: string): string | null {
  const trimmedValue = value.trim();

  return trimmedValue || null;
}

function getDatabaseErrorMessage(message: string): string {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("relation") &&
    normalizedMessage.includes("profiles")
  ) {
    return "The profiles table is not available yet. Run supabase/schema_v1.sql in the Supabase SQL editor.";
  }

  if (
    normalizedMessage.includes("row-level security") ||
    normalizedMessage.includes("permission denied")
  ) {
    return "Supabase blocked this profile request. Check that RLS policies from supabase/schema_v1.sql are installed.";
  }

  return message || "Profile persistence failed. Please try again.";
}
