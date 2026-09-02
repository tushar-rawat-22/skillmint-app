"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import type { Json } from "@/lib/supabase/database.types";

export const CANDIDATE_ACCOUNT_STATE_KEY = "skillmintCandidateState";
export const CANDIDATE_ACCOUNT_STATE_VERSION = 1;

export type CandidateAccountState = {
  version: 1;
  activeTarget: unknown | null;
  missionStatuses: Record<string, string>;
  selectedPathId: string | null;
  updatedAt: string;
};

type RepositoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export async function readLatestCurrentUserCandidateState(
  expectedUserId: string,
): Promise<RepositoryResult<CandidateAccountState | null>> {
  const auth = await getExpectedCurrentUser(expectedUserId);
  if (!auth.ok) return auth;

  const { data, error } = await auth.data.supabase
    .from("job_matches")
    .select("roadmap")
    .eq("user_id", expectedUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: true, data: null };

  return { ok: true, data: parseCandidateAccountState(data.roadmap) };
}

export async function syncLatestCurrentUserCandidateState(
  expectedUserId: string,
  state: Omit<CandidateAccountState, "version" | "updatedAt">,
): Promise<RepositoryResult<null>> {
  const auth = await getExpectedCurrentUser(expectedUserId);
  if (!auth.ok) return auth;

  const { data, error } = await auth.data.supabase
    .from("job_matches")
    .select("id, roadmap")
    .eq("user_id", expectedUserId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "No saved job match is available for account activation sync." };
  if (!isRecord(data.roadmap)) {
    return { ok: false, error: "Latest saved job match roadmap is not ready for activation sync." };
  }

  const nextState: CandidateAccountState = {
    version: CANDIDATE_ACCOUNT_STATE_VERSION,
    activeTarget: state.activeTarget,
    missionStatuses: { ...state.missionStatuses },
    selectedPathId: state.selectedPathId,
    updatedAt: new Date().toISOString(),
  };

  const nextRoadmap = {
    ...data.roadmap,
    [CANDIDATE_ACCOUNT_STATE_KEY]: nextState,
  } as Json;

  const { error: updateError } = await auth.data.supabase
    .from("job_matches")
    .update({ roadmap: nextRoadmap })
    .eq("id", data.id)
    .eq("user_id", expectedUserId);

  if (updateError) return { ok: false, error: updateError.message };
  return { ok: true, data: null };
}

function parseCandidateAccountState(value: unknown): CandidateAccountState | null {
  if (!isRecord(value)) return null;
  const raw = value[CANDIDATE_ACCOUNT_STATE_KEY];
  if (!isRecord(raw) || raw.version !== CANDIDATE_ACCOUNT_STATE_VERSION) return null;
  if (!isRecord(raw.missionStatuses)) return null;
  if (raw.selectedPathId !== null && typeof raw.selectedPathId !== "string") return null;
  if (typeof raw.updatedAt !== "string") return null;

  const missionStatuses = Object.fromEntries(
    Object.entries(raw.missionStatuses).filter(
      ([key, status]) => key.trim().length > 0 && typeof status === "string",
    ),
  );

  return {
    version: CANDIDATE_ACCOUNT_STATE_VERSION,
    activeTarget: raw.activeTarget ?? null,
    missionStatuses,
    selectedPathId: raw.selectedPathId,
    updatedAt: raw.updatedAt,
  };
}

async function getExpectedCurrentUser(expectedUserId: string) {
  const config = getSupabaseConfigStatus();
  if (!config.isConfigured) return { ok: false as const, error: config.message };

  const supabase = createSupabaseBrowserClient();
  if (!supabase) return { ok: false as const, error: "Supabase auth client is unavailable." };

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.id !== expectedUserId) {
    return { ok: false as const, error: "Candidate activation sync rejected for a stale or mismatched session." };
  }

  return { ok: true as const, data: { supabase } };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
