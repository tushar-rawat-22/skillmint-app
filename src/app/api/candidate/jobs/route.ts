import "server-only";

import { NextResponse } from "next/server";

import {
  createSupabaseAdminClient,
  SupabaseAdminConfigurationError,
} from "@/lib/supabase/admin";
import { getServerAuthorization } from "@/lib/supabase/serverAuth";
import { getAccountPersona } from "@/modules/accountPersona";
import {
  CANDIDATE_JOB_LIFECYCLE_SELECT,
  parseCandidateJobLifecycleRecord,
  type CandidateJobLifecycleRecord,
} from "@/modules/jobs/candidateJobLifecycle";

const MAX_LIFECYCLE_ROWS = 100;
const STALE_AFTER_MS = 24 * 60 * 60 * 1_000;

export async function GET() {
  const authorization = await getServerAuthorization();
  if (authorization.status !== "authenticated") {
    return authorizationFailure(authorization.status);
  }

  const personaFailure = await requireCandidatePersona(authorization.userId);
  if (personaFailure) return personaFailure;

  try {
    const admin = createSupabaseAdminClient();
    const response = await admin
      .from("candidate_job_lifecycle")
      .select(CANDIDATE_JOB_LIFECYCLE_SELECT)
      .eq("user_id", authorization.userId)
      .order("updated_at", { ascending: false })
      .limit(MAX_LIFECYCLE_ROWS + 1);

    if (
      response.error ||
      !Array.isArray(response.data) ||
      response.data.length > MAX_LIFECYCLE_ROWS
    ) {
      return jsonError("temporarily_unavailable", 503);
    }

    const records = response.data.map((row) =>
      parseCandidateJobLifecycleRecord(row, authorization.userId)
    );
    if (records.some((record) => record === null)) {
      return jsonError("temporarily_unavailable", 503);
    }

    return jsonResponse({
      records: records.map((record) => markStale(record!)),
    }, 200);
  } catch (error) {
    return configurationOrUnavailable(error);
  }
}

function markStale(record: CandidateJobLifecycleRecord) {
  const fetchedAt = new Date(record.sourceFetchedAt).getTime();
  return record.providerAvailability === "live" &&
      Date.now() - fetchedAt > STALE_AFTER_MS
    ? { ...record, providerAvailability: "stale" as const }
    : record;
}

async function requireCandidatePersona(userId: string): Promise<Response | null> {
  const persona = await getAccountPersona(userId);
  if (persona.status === "unavailable") {
    return jsonError("temporarily_unavailable", 503);
  }
  if (persona.status !== "resolved" || persona.persona !== "CANDIDATE") {
    return jsonError("candidate_persona_required", 403);
  }
  return null;
}

function authorizationFailure(
  status: Exclude<
    Awaited<ReturnType<typeof getServerAuthorization>>["status"],
    "authenticated"
  >,
) {
  return status === "not_authenticated"
    ? jsonError("not_authenticated", 401)
    : status === "not_configured"
      ? jsonError("not_configured", 503)
      : jsonError("temporarily_unavailable", 503);
}

function configurationOrUnavailable(error: unknown) {
  return error instanceof SupabaseAdminConfigurationError
    ? jsonError("not_configured", 503)
    : jsonError("temporarily_unavailable", 503);
}

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}

function jsonError(code: string, status: number) {
  return jsonResponse({
    code,
    message: "Candidate job history could not be loaded.",
  }, status);
}
