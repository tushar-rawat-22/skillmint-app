import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";

import { calculateRoleMatches } from "@/intelligence/core/roleMatch";
import { generateProofScore } from "@/intelligence/proof";
import {
  createSupabaseAdminClient,
  SupabaseAdminConfigurationError,
} from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { getServerAuthorization } from "@/lib/supabase/serverAuth";
import { getAccountPersona } from "@/modules/accountPersona";
import {
  deriveProofBriefPayload,
  parseCandidateProofBriefRow,
  parseProofBriefSourceAnalysis,
  PROOF_BRIEF_PUBLIC_COLUMNS,
} from "@/modules/proofBrief/proofBriefContract";

const MAX_BODY_BYTES = 512;
const activeMutationTails = new Map<string, Promise<void>>();

type Mutation =
  | { readonly action: "create_or_refresh"; readonly sourceResumeAnalysisId: string }
  | { readonly action: "publish" | "revoke"; readonly briefId: string };

export async function GET(request: Request) {
  const authorization = await getServerAuthorization();
  if (authorization.status !== "authenticated") {
    return authorizationFailure(authorization.status);
  }

  const url = new URL(request.url);
  if (
    [...url.searchParams.keys()].some((key) => key !== "source") ||
    url.searchParams.getAll("source").length !== 1
  ) return jsonError("invalid_request", 400);
  const sourceResumeAnalysisId = url.searchParams.get("source");
  if (!isUuid(sourceResumeAnalysisId)) return jsonError("invalid_request", 400);

  const personaFailure = await requireCandidatePersona(authorization.userId);
  if (personaFailure) return personaFailure;

  try {
    const admin = createSupabaseAdminClient();
    const response = await admin.from("proof_briefs")
      .select(PROOF_BRIEF_PUBLIC_COLUMNS)
      .eq("user_id", authorization.userId)
      .eq("source_resume_analysis_id", sourceResumeAnalysisId)
      .limit(2);
    if (response.error || !Array.isArray(response.data) || response.data.length > 1) {
      return jsonError("temporarily_unavailable", 503);
    }
    if (response.data.length === 0) return jsonResponse({ brief: null }, 200);
    const brief = parseCandidateProofBriefRow(response.data[0], {
      userId: authorization.userId,
      sourceResumeAnalysisId,
    });
    return brief
      ? jsonResponse({ brief: toProviderRow(brief) }, 200)
      : jsonError("temporarily_unavailable", 503);
  } catch (error) {
    return configurationOrUnavailable(error);
  }
}

export async function POST(request: Request) {
  if (!isAllowedMutationOrigin(request)) return jsonError("invalid_origin", 403);
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
  const contentLength = Number(request.headers.get("content-length"));
  if (contentType !== "application/json") return jsonError("unsupported_media_type", 415);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return jsonError("request_too_large", 413);
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return jsonError("invalid_request", 400);
  }
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    return jsonError("request_too_large", 413);
  }
  const mutation = parseMutation(text);
  if (!mutation) return jsonError("invalid_request", 400);

  const authorization = await getServerAuthorization();
  if (authorization.status !== "authenticated") {
    return authorizationFailure(authorization.status);
  }

  const personaFailure = await requireCandidatePersona(authorization.userId);
  if (personaFailure) return personaFailure;

  const operationKey = `${authorization.userId}:${
    mutation.action === "create_or_refresh"
      ? mutation.sourceResumeAnalysisId
      : mutation.briefId
  }`;
  return runMutationExclusive(operationKey, () => executeMutation(
    authorization.userId,
    mutation,
  ));
}

async function executeMutation(userId: string, mutation: Mutation): Promise<Response> {
  try {
    const admin = createSupabaseAdminClient();
    if (mutation.action === "create_or_refresh") {
      return createOrRefresh(admin, userId, mutation.sourceResumeAnalysisId);
    }
    if (mutation.action === "publish") {
      const shareToken = randomBytes(32).toString("base64url");
      const shareTokenHash = createHash("sha256")
        .update(shareToken, "utf8")
        .digest("hex");
      const sharedAt = new Date().toISOString();
      const response = await admin.from("proof_briefs")
        .update({
          visibility: "LINK_ONLY",
          share_token_hash: shareTokenHash,
          share_created_at: sharedAt,
          revoked_at: null,
        })
        .eq("id", mutation.briefId)
        .eq("user_id", userId)
        .select(PROOF_BRIEF_PUBLIC_COLUMNS);
      const brief = parseExactMutationRow(response, {
        userId,
        briefId: mutation.briefId,
      });
      return brief
        ? jsonResponse({ brief: toProviderRow(brief), shareToken }, 200)
        : jsonError("not_found", 404);
    }

    const response = await admin.from("proof_briefs")
      .update({
        visibility: "PRIVATE",
        share_token_hash: null,
        share_created_at: null,
        revoked_at: new Date().toISOString(),
      })
      .eq("id", mutation.briefId)
      .eq("user_id", userId)
      .select(PROOF_BRIEF_PUBLIC_COLUMNS);
    const brief = parseExactMutationRow(response, {
      userId,
      briefId: mutation.briefId,
    });
    return brief
      ? jsonResponse({ brief: toProviderRow(brief) }, 200)
      : jsonError("not_found", 404);
  } catch (error) {
    return configurationOrUnavailable(error);
  }
}

async function createOrRefresh(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string,
  sourceResumeAnalysisId: string,
): Promise<Response> {
  const sourceResponse = await admin.from("resume_analyses")
    .select("id,user_id,file_name,file_type,extracted_text,parsed_profile,user_profile,created_at")
    .eq("id", sourceResumeAnalysisId)
    .eq("user_id", userId)
    .limit(2);
  if (
    sourceResponse.error ||
    !Array.isArray(sourceResponse.data) ||
    sourceResponse.data.length !== 1
  ) return jsonError("source_not_found", 404);
  const source = parseProofBriefSourceAnalysis(sourceResponse.data[0], {
    userId,
    sourceResumeAnalysisId,
  });
  if (!source) return jsonError("temporarily_unavailable", 503);
  const proof = generateProofScore({
    profile: source.userProfile,
    resumeText: source.extractedText,
    parsedProfile: source.parsedProfile,
  });
  const direction = calculateRoleMatches(source.userProfile)[0]?.role ?? null;
  const payload = deriveProofBriefPayload({
    profile: source.userProfile,
    proof,
    direction,
  });

  const existingResponse = await admin.from("proof_briefs")
    .select(PROOF_BRIEF_PUBLIC_COLUMNS)
    .eq("user_id", userId)
    .eq("source_resume_analysis_id", sourceResumeAnalysisId)
    .limit(2);
  if (
    existingResponse.error ||
    !Array.isArray(existingResponse.data) ||
    existingResponse.data.length > 1
  ) return jsonError("temporarily_unavailable", 503);

  const response = existingResponse.data.length === 0
    ? await admin.from("proof_briefs")
        .insert({
          user_id: userId,
          source_resume_analysis_id: sourceResumeAnalysisId,
          brief_payload: payload as unknown as Json,
          visibility: "PRIVATE",
        })
        .select(PROOF_BRIEF_PUBLIC_COLUMNS)
    : await admin.from("proof_briefs")
        .update({
          brief_payload: payload as unknown as Json,
          visibility: "PRIVATE",
          share_token_hash: null,
          share_created_at: null,
          revoked_at: new Date().toISOString(),
        })
        .eq("id", existingResponse.data[0].id)
        .eq("user_id", userId)
        .eq("source_resume_analysis_id", sourceResumeAnalysisId)
        .select(PROOF_BRIEF_PUBLIC_COLUMNS);
  const brief = parseExactMutationRow(response, {
    userId,
    sourceResumeAnalysisId,
    ...(existingResponse.data.length === 1
      ? { briefId: existingResponse.data[0].id }
      : {}),
  });
  return brief
    ? jsonResponse({ brief: toProviderRow(brief) }, 200)
    : jsonError("temporarily_unavailable", 503);
}

function parseExactMutationRow(
  response: { readonly data: unknown; readonly error: unknown },
  expected: Parameters<typeof parseCandidateProofBriefRow>[1],
) {
  if (response.error || !Array.isArray(response.data) || response.data.length !== 1) {
    return null;
  }
  return parseCandidateProofBriefRow(response.data[0], expected);
}

function toProviderRow(brief: NonNullable<ReturnType<typeof parseCandidateProofBriefRow>>) {
  return {
    id: brief.id,
    user_id: brief.userId,
    source_resume_analysis_id: brief.sourceResumeAnalysisId,
    brief_payload: brief.payload,
    visibility: brief.visibility,
    share_created_at: brief.sharedAt,
    revoked_at: brief.revokedAt,
    created_at: brief.createdAt,
    updated_at: brief.updatedAt,
  };
}

function parseMutation(text: string): Mutation | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value) || typeof value.action !== "string") return null;
  if (
    value.action === "create_or_refresh" &&
    hasExactKeys(value, ["action", "sourceResumeAnalysisId"]) &&
    isUuid(value.sourceResumeAnalysisId)
  ) return { action: value.action, sourceResumeAnalysisId: value.sourceResumeAnalysisId };
  if (
    (value.action === "publish" || value.action === "revoke") &&
    hasExactKeys(value, ["action", "briefId"]) &&
    isUuid(value.briefId)
  ) return { action: value.action, briefId: value.briefId };
  return null;
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
    const host = request.headers.get("host");
    const requestOrigins = new Set([requestUrl.origin]);
    if (
      host &&
      host.length <= 255 &&
      !/[\u0000-\u0020\u007f@,/\\?#]/u.test(host)
    ) {
      const hostUrl = new URL(`${requestUrl.protocol}//${host}`);
      if (hostUrl.host.toLowerCase() === host.toLowerCase()) {
        requestOrigins.add(hostUrl.origin);
      }
    }
    if (!requestOrigins.has(origin)) return false;
  } catch {
    return false;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === null || fetchSite === "same-origin";
}

async function runMutationExclusive(key: string, start: () => Promise<Response>) {
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

function authorizationFailure(status: Exclude<Awaited<ReturnType<typeof getServerAuthorization>>["status"], "authenticated">) {
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
  return NextResponse.json(body, { status, headers: { "cache-control": "no-store" } });
}

function jsonError(code: string, status: number) {
  return jsonResponse({ code, message: "The Proof Brief request could not be completed." }, status);
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
}
