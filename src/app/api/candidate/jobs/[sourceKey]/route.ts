import "server-only";

import { NextResponse } from "next/server";

import {
  createSupabaseAdminClient,
  SupabaseAdminConfigurationError,
} from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/database.types";
import { getServerAuthorization } from "@/lib/supabase/serverAuth";
import { getAccountPersona } from "@/modules/accountPersona";
import {
  CANDIDATE_JOB_LIFECYCLE_SELECT,
  parseCandidateJobLifecycleMutation,
  parseCandidateJobLifecycleRecord,
  parseGreenhouseSourceKey,
  type CandidateJobLifecycleMutation,
  type CandidateJobLifecycleRecord,
} from "@/modules/jobs/candidateJobLifecycle";
import {
  GreenhousePostingResolutionError,
  resolveTrustedGreenhousePosting,
  type TrustedGreenhousePosting,
} from "@/modules/jobs/greenhousePostingResolver";

const MAX_BODY_BYTES = 256;
const activeMutationTails = new Map<string, Promise<void>>();

export async function PUT(
  request: Request,
  context: { params: Promise<{ sourceKey: string }> },
) {
  if (!isAllowedMutationOrigin(request)) return jsonError("invalid_origin", 403);
  if (
    request.headers.get("content-type")?.split(";", 1)[0]?.trim() !==
      "application/json"
  ) return jsonError("unsupported_media_type", 415);
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return jsonError("request_too_large", 413);
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return jsonError("invalid_request", 400);
  }
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return jsonError("request_too_large", 413);
  }

  let rawMutation: unknown;
  try {
    rawMutation = JSON.parse(rawBody);
  } catch {
    return jsonError("invalid_request", 400);
  }
  const mutation = parseCandidateJobLifecycleMutation(rawMutation);
  if (!mutation) return jsonError("invalid_request", 400);

  const { sourceKey } = await context.params;
  const sourceIdentity = parseGreenhouseSourceKey(sourceKey);
  if (!sourceIdentity) return jsonError("invalid_source", 400);

  const authorization = await getServerAuthorization();
  if (authorization.status !== "authenticated") {
    return authorizationFailure(authorization.status);
  }
  const personaFailure = await requireCandidatePersona(authorization.userId);
  if (personaFailure) return personaFailure;

  return runMutationExclusive(
    `${authorization.userId}:${sourceIdentity.sourceKey}`,
    () => executeMutation(
      authorization.userId,
      sourceIdentity,
      mutation,
    ),
  );
}

async function executeMutation(
  userId: string,
  sourceIdentity: NonNullable<ReturnType<typeof parseGreenhouseSourceKey>>,
  mutation: CandidateJobLifecycleMutation,
): Promise<Response> {
  try {
    const admin = createSupabaseAdminClient();
    const existing = await readOwnedRecord(admin, userId, sourceIdentity);
    if (existing.status === "error") {
      return jsonError("temporarily_unavailable", 503);
    }

    if (mutation.action === "save") {
      let resolution;
      try {
        resolution = await resolveTrustedGreenhousePosting(sourceIdentity.sourceKey);
      } catch (error) {
        return providerResolutionFailure(error);
      }
      if (resolution.status === "closed") return jsonError("job_not_live", 404);

      const inserted = await admin.from("candidate_job_lifecycle").upsert({
        user_id: userId,
        provider: resolution.posting.provider,
        provider_account_id: resolution.posting.providerAccountId,
        source_native_id: resolution.posting.sourceNativeId,
        source_key: resolution.posting.sourceKey,
        original_apply_url: resolution.posting.originalApplyUrl,
        role_title: resolution.posting.roleTitle,
        company_name: resolution.posting.companyName,
        location: resolution.posting.location,
        source_updated_at: resolution.posting.sourceUpdatedAt,
        source_fetched_at: resolution.posting.sourceFetchedAt,
        provider_availability: "live",
        workflow_state: "saved",
      }, {
        onConflict: "user_id,provider,provider_account_id,source_native_id",
        ignoreDuplicates: true,
      });
      if (inserted.error) return jsonError("temporarily_unavailable", 503);

      return updateProviderSnapshot(
        admin,
        userId,
        sourceIdentity,
        resolution.posting,
      );
    }

    if (existing.status === "missing") return jsonError("not_found", 404);
    const record = existing.record;

    if (mutation.action === "refresh_provider") {
      try {
        const resolution = await resolveTrustedGreenhousePosting(
          sourceIdentity.sourceKey,
        );
        if (resolution.status === "closed") {
          return updateOwnedRecord(admin, userId, sourceIdentity, {
            provider_availability: "closed",
          });
        }
        return updateProviderSnapshot(
          admin,
          userId,
          sourceIdentity,
          resolution.posting,
        );
      } catch (error) {
        if (
          error instanceof GreenhousePostingResolutionError &&
          error.code === "upstream_unavailable"
        ) {
          return updateOwnedRecord(admin, userId, sourceIdentity, {
            provider_availability: "unavailable",
          });
        }
        return providerResolutionFailure(error);
      }
    }

    if (mutation.action === "mark_applied") {
      if (record.workflowState !== "saved" && record.workflowState !== "applied") {
        return jsonError("invalid_transition", 409);
      }
      return updateOwnedRecord(admin, userId, sourceIdentity, {
        workflow_state: "applied",
        applied_at: record.appliedAt ?? new Date().toISOString(),
      });
    }

    if (mutation.action === "set_follow_up") {
      if (record.workflowState !== "applied") {
        return jsonError("invalid_transition", 409);
      }
      const followUpTime = new Date(mutation.followUpAt).getTime();
      const now = Date.now();
      if (
        followUpTime < now - 5 * 60 * 1_000 ||
        followUpTime > now + 366 * 24 * 60 * 60 * 1_000
      ) return jsonError("invalid_follow_up", 400);
      return updateOwnedRecord(admin, userId, sourceIdentity, {
        follow_up_at: mutation.followUpAt,
        follow_up_completed_at: null,
      });
    }

    if (mutation.action === "complete_follow_up") {
      if (record.workflowState !== "applied" || !record.followUpAt) {
        return jsonError("invalid_transition", 409);
      }
      return updateOwnedRecord(admin, userId, sourceIdentity, {
        follow_up_completed_at: record.followUpCompletedAt ??
          new Date().toISOString(),
      });
    }

    if (mutation.action === "withdraw") {
      if (record.workflowState !== "applied") {
        return jsonError("invalid_transition", 409);
      }
      return updateOwnedRecord(admin, userId, sourceIdentity, {
        workflow_state: "withdrawn",
      });
    }

    return updateOwnedRecord(admin, userId, sourceIdentity, {
      workflow_state: "archived",
    });
  } catch (error) {
    return configurationOrUnavailable(error);
  }
}

async function readOwnedRecord(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  identity: NonNullable<ReturnType<typeof parseGreenhouseSourceKey>>,
): Promise<
  | { readonly status: "found"; readonly record: CandidateJobLifecycleRecord }
  | { readonly status: "missing" }
  | { readonly status: "error" }
> {
  const response = await admin.from("candidate_job_lifecycle")
    .select(CANDIDATE_JOB_LIFECYCLE_SELECT)
    .eq("user_id", userId)
    .eq("provider", "greenhouse")
    .eq("provider_account_id", identity.providerAccountId)
    .eq("source_native_id", identity.sourceNativeId)
    .limit(2);
  if (
    response.error ||
    !Array.isArray(response.data) ||
    response.data.length > 1
  ) return { status: "error" };
  if (response.data.length === 0) return { status: "missing" };
  const record = parseCandidateJobLifecycleRecord(response.data[0], userId);
  return record ? { status: "found", record } : { status: "error" };
}

async function updateProviderSnapshot(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  identity: NonNullable<ReturnType<typeof parseGreenhouseSourceKey>>,
  posting: TrustedGreenhousePosting,
) {
  return updateOwnedRecord(admin, userId, identity, {
    original_apply_url: posting.originalApplyUrl,
    role_title: posting.roleTitle,
    company_name: posting.companyName,
    location: posting.location,
    source_updated_at: posting.sourceUpdatedAt,
    source_fetched_at: posting.sourceFetchedAt,
    provider_availability: "live",
  });
}

async function updateOwnedRecord(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  identity: NonNullable<ReturnType<typeof parseGreenhouseSourceKey>>,
  patch: Database["public"]["Tables"]["candidate_job_lifecycle"]["Update"],
) {
  const response = await admin.from("candidate_job_lifecycle")
    .update(patch)
    .eq("user_id", userId)
    .eq("provider", "greenhouse")
    .eq("provider_account_id", identity.providerAccountId)
    .eq("source_native_id", identity.sourceNativeId)
    .select(CANDIDATE_JOB_LIFECYCLE_SELECT);
  if (
    response.error ||
    !Array.isArray(response.data) ||
    response.data.length !== 1
  ) return jsonError("temporarily_unavailable", 503);
  const record = parseCandidateJobLifecycleRecord(response.data[0], userId);
  return record
    ? jsonResponse({ record }, 200)
    : jsonError("temporarily_unavailable", 503);
}

function providerResolutionFailure(error: unknown) {
  if (error instanceof GreenhousePostingResolutionError) {
    if (error.code === "invalid_source" || error.code === "untrusted_source") {
      return jsonError("invalid_source", 400);
    }
    return jsonError("provider_unavailable", 503);
  }
  return jsonError("provider_unavailable", 503);
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

function isAllowedMutationOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    if (new URL(origin).origin !== origin) return false;
    const requestUrl = new URL(request.url);
    const allowedOrigins = new Set([requestUrl.origin]);
    const host = request.headers.get("host");
    if (host && host.length <= 255 && !/[\u0000-\u0020\u007f@,/\\?#]/u.test(host)) {
      allowedOrigins.add(new URL(`${requestUrl.protocol}//${host}`).origin);
    }
    if (!allowedOrigins.has(origin)) return false;
  } catch {
    return false;
  }
  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === null || fetchSite === "same-origin";
}

async function runMutationExclusive(
  key: string,
  start: () => Promise<Response>,
) {
  const previous = activeMutationTails.get(key) ?? Promise.resolve();
  let release = () => {};
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.catch(() => {}).then(() => current);
  activeMutationTails.set(key, tail);
  await previous.catch(() => {});
  try {
    return await start();
  } finally {
    release();
    if (activeMutationTails.get(key) === tail) activeMutationTails.delete(key);
  }
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
    message: "The candidate job update could not be completed.",
  }, status);
}
