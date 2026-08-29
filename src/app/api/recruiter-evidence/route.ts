import "server-only";

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import { deriveRoleEvidenceMap } from "@/intelligence/core/roleEvidenceMap";
import {
  createSupabaseAdminClient,
  SupabaseAdminConfigurationError,
} from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import { getServerAuthorization } from "@/lib/supabase/serverAuth";
import {
  buildEvidenceQuestion,
  FEEDBACK_CATEGORIES,
  normalizeReviewNote,
  parseCandidateEvidenceReviewRow,
  parsePersonaRow,
  parseRecruiterRoleMapRow,
  QUESTION_CATEGORIES,
  REVIEW_EASE_OPTIONS,
  REVIEW_TIME_OPTIONS,
} from "@/modules/recruiterEvidence";
import { isValidProofBriefShareToken, parseCandidateProofBriefRow, PROOF_BRIEF_PUBLIC_COLUMNS } from "@/modules/proofBrief/proofBriefContract";

const MAX_BODY_BYTES = 16_384;
const MAX_ROLE_MAPS = 10;
const ROLE_MAP_COLUMNS = "id,user_id,role_title,job_description,evidence_map,created_at,updated_at";
const REVIEW_COLUMNS = "id,role_title,question_category,question_text,feedback_category,review_ease,review_time_signal,note,created_at";

type Mutation =
  | { readonly action: "create_role_map"; readonly expectedUserId: string; readonly roleTitle: string; readonly jobDescription: string }
  | {
    readonly action: "submit_review";
    readonly expectedUserId: string;
    readonly shareToken: string;
    readonly roleMapId: string;
    readonly questionCategory: typeof QUESTION_CATEGORIES[number];
    readonly evidenceLabel: string | null;
    readonly feedbackCategory: typeof FEEDBACK_CATEGORIES[number];
    readonly reviewEase: typeof REVIEW_EASE_OPTIONS[number];
    readonly reviewTimeSignal: typeof REVIEW_TIME_OPTIONS[number];
    readonly note: string | null;
  };

export async function GET(request: Request) {
  const authorization = await getServerAuthorization();
  if (authorization.status !== "authenticated") return authorizationFailure(authorization.status);
  const url = new URL(request.url);
  const source = url.searchParams.get("candidateSource");
  const expectedUserId = url.searchParams.get("expectedUserId");
  if ([...url.searchParams.keys()].some((key) => key !== "candidateSource" && key !== "expectedUserId") || url.searchParams.getAll("candidateSource").length > 1 || url.searchParams.getAll("expectedUserId").length !== 1 || !isUuid(expectedUserId)) return error("invalid_request", 400);
  if (authorization.userId !== expectedUserId) return error("owner_changed", 409);

  try {
    const admin = createSupabaseAdminClient();
    if (source !== null) {
      if (!isUuid(source)) return error("invalid_request", 400);
      const persona = await getPersona(admin, authorization.userId);
      if (persona.status === "error") return error("temporarily_unavailable", 503);
      if (persona.value !== "CANDIDATE") return error("candidate_persona_required", 403);
      const briefResponse = await admin.from("proof_briefs")
        .select("id,user_id,source_resume_analysis_id")
        .eq("user_id", authorization.userId)
        .eq("source_resume_analysis_id", source)
        .limit(2);
      if (briefResponse.error || !Array.isArray(briefResponse.data) || briefResponse.data.length > 1) return error("temporarily_unavailable", 503);
      if (briefResponse.data.length === 0) return json({ ownerId: authorization.userId, reviews: [] }, 200);
      const brief = briefResponse.data[0];
      if (!isUuid(brief.id) || brief.user_id !== authorization.userId || brief.source_resume_analysis_id !== source) return error("temporarily_unavailable", 503);
      const reviewResponse = await admin.from("candidate_evidence_reviews")
        .select(REVIEW_COLUMNS)
        .eq("user_id", authorization.userId)
        .eq("proof_brief_id", brief.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (reviewResponse.error || !Array.isArray(reviewResponse.data)) return error("temporarily_unavailable", 503);
      const reviews = reviewResponse.data.map(parseCandidateEvidenceReviewRow);
      return reviews.every(Boolean) ? json({ ownerId: authorization.userId, reviews }, 200) : error("temporarily_unavailable", 503);
    }

    const persona = await getPersona(admin, authorization.userId);
    if (persona.status === "error") return error("temporarily_unavailable", 503);
    if (persona.value !== "RECRUITER") return json({ ownerId: authorization.userId, persona: persona.value, roleMaps: [] }, 200);
    const response = await admin.from("recruiter_role_evidence_maps")
      .select(ROLE_MAP_COLUMNS)
      .eq("user_id", authorization.userId)
      .order("created_at", { ascending: false })
      .limit(MAX_ROLE_MAPS + 1);
    if (response.error || !Array.isArray(response.data) || response.data.length > MAX_ROLE_MAPS) return error("temporarily_unavailable", 503);
    const roleMaps = response.data.map((row) => parseRecruiterRoleMapRow(row, authorization.userId));
    return roleMaps.every(Boolean) ? json({ ownerId: authorization.userId, persona: persona.value, roleMaps }, 200) : error("temporarily_unavailable", 503);
  } catch (caught) {
    return unavailable(caught);
  }
}

export async function POST(request: Request) {
  if (!isAllowedMutationOrigin(request)) return error("invalid_origin", 403);
  if (request.headers.get("content-type")?.split(";", 1)[0]?.trim() !== "application/json") return error("unsupported_media_type", 415);
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return error("request_too_large", 413);
  let raw: string;
  try { raw = await request.text(); } catch { return error("invalid_request", 400); }
  if (new TextEncoder().encode(raw).byteLength > MAX_BODY_BYTES) return error("request_too_large", 413);
  const mutation = parseMutation(raw);
  if (!mutation) return error("invalid_request", 400);

  const authorization = await getServerAuthorization();
  if (authorization.status !== "authenticated") return authorizationFailure(authorization.status);
  if (authorization.userId !== mutation.expectedUserId) return error("owner_changed", 409);
  try {
    const admin = createSupabaseAdminClient();
    const persona = await getPersona(admin, authorization.userId);
    if (persona.status === "error") return error("temporarily_unavailable", 503);
    if (persona.value !== "RECRUITER") return error("recruiter_persona_required", 403);

    if (mutation.action === "create_role_map") {
      const derived = deriveRoleEvidenceMap(mutation);
      if (!derived.ok) return error(derived.code, 400);
      const response = await admin.rpc("create_recruiter_role_evidence_map", {
        expected_recruiter_user_id: authorization.userId,
        requested_role_title: derived.map.roleTitle,
        requested_job_description: derived.jobDescription,
        requested_evidence_map: derived.map as unknown as Json,
      });
      if (response.error) return error("temporarily_unavailable", 503);
      if (isExactRecord(response.data, ["status"]) && response.data.status === "LIMIT_REACHED") return error("role_map_limit_reached", 409);
      if (!isExactRecord(response.data, ["status", "roleMap"]) || response.data.status !== "CREATED") return error("temporarily_unavailable", 503);
      const roleMap = parseRecruiterRoleMapRow(response.data.roleMap, authorization.userId);
      return roleMap ? json({ roleMap }, 201) : error("temporarily_unavailable", 503);
    }

    const roleResponse = await admin.from("recruiter_role_evidence_maps")
      .select(ROLE_MAP_COLUMNS)
      .eq("id", mutation.roleMapId)
      .eq("user_id", authorization.userId)
      .limit(2);
    if (roleResponse.error || !Array.isArray(roleResponse.data) || roleResponse.data.length !== 1) return error("role_map_not_found", 404);
    const roleMap = parseRecruiterRoleMapRow(roleResponse.data[0], authorization.userId);
    if (!roleMap) return error("temporarily_unavailable", 503);
    const tokenHash = createHash("sha256").update(mutation.shareToken, "utf8").digest("hex");
    const briefResponse = await admin.from("proof_briefs")
      .select(PROOF_BRIEF_PUBLIC_COLUMNS)
      .eq("share_token_hash", tokenHash)
      .eq("visibility", "LINK_ONLY")
      .is("revoked_at", null)
      .limit(2);
    if (briefResponse.error || !Array.isArray(briefResponse.data) || briefResponse.data.length !== 1) return error("brief_not_available", 404);
    const rawBrief = briefResponse.data[0];
    if (!isUuid(rawBrief.user_id)) return error("temporarily_unavailable", 503);
    const brief = parseCandidateProofBriefRow(rawBrief, { userId: rawBrief.user_id });
    if (!brief || brief.visibility !== "LINK_ONLY") return error("brief_not_available", 404);
    const allowedLabels = new Set(brief.payload.evidenceSignals.map((signal) => signal.label));
    if (mutation.evidenceLabel !== null && !allowedLabels.has(mutation.evidenceLabel)) return error("invalid_request", 400);
    const questionText = buildEvidenceQuestion(mutation.questionCategory, mutation.evidenceLabel);
    if (!questionText) return error("invalid_request", 400);
    const response = await admin.rpc("submit_candidate_evidence_review", {
      expected_recruiter_user_id: authorization.userId,
      requested_token_hash: tokenHash,
      requested_role_map_id: roleMap.id,
      requested_question_category: mutation.questionCategory,
      requested_question_text: questionText,
      requested_feedback_category: mutation.feedbackCategory,
      requested_review_ease: mutation.reviewEase,
      requested_review_time_signal: mutation.reviewTimeSignal,
      requested_note: mutation.note,
    });
    if (response.error) return String(response.error.code) === "23505" ? error("review_already_submitted", 409) : error("temporarily_unavailable", 503);
    if (response.data === null) return error("brief_not_available", 404);
    const review = parseCandidateEvidenceReviewRow(response.data);
    return review ? json({ review }, 201) : error("temporarily_unavailable", 503);
  } catch (caught) {
    return unavailable(caught);
  }
}

function parseMutation(raw: string): Mutation | null {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { return null; }
  if (!isRecord(value) || typeof value.action !== "string") return null;
  if (!isUuid(value.expectedUserId)) return null;
  if (value.action === "create_role_map" && exact(value, ["action", "expectedUserId", "roleTitle", "jobDescription"]) && typeof value.roleTitle === "string" && typeof value.jobDescription === "string") return { action: value.action, expectedUserId: value.expectedUserId, roleTitle: value.roleTitle, jobDescription: value.jobDescription };
  if (value.action === "submit_review" && exact(value, ["action", "expectedUserId", "shareToken", "roleMapId", "questionCategory", "evidenceLabel", "feedbackCategory", "reviewEase", "reviewTimeSignal", "note"]) && typeof value.shareToken === "string" && isValidProofBriefShareToken(value.shareToken) && isUuid(value.roleMapId) && includes(QUESTION_CATEGORIES, value.questionCategory) && (value.evidenceLabel === null || (typeof value.evidenceLabel === "string" && value.evidenceLabel.length <= 80)) && includes(FEEDBACK_CATEGORIES, value.feedbackCategory) && includes(REVIEW_EASE_OPTIONS, value.reviewEase) && includes(REVIEW_TIME_OPTIONS, value.reviewTimeSignal)) {
    const note = normalizeReviewNote(value.note);
    if (note === undefined) return null;
    return { action: value.action, expectedUserId: value.expectedUserId, shareToken: value.shareToken, roleMapId: value.roleMapId, questionCategory: value.questionCategory, evidenceLabel: value.evidenceLabel, feedbackCategory: value.feedbackCategory, reviewEase: value.reviewEase, reviewTimeSignal: value.reviewTimeSignal, note };
  }
  return null;
}

async function getPersona(admin: ReturnType<typeof createSupabaseAdminClient>, userId: string): Promise<{ status: "ok"; value: "CANDIDATE" | "RECRUITER" | null } | { status: "error" }> {
  const response = await admin.from("account_personas").select("user_id,persona").eq("user_id", userId).limit(2);
  if (response.error || !Array.isArray(response.data) || response.data.length > 1) return { status: "error" };
  if (response.data.length === 0) return { status: "ok", value: null };
  const persona = parsePersonaRow(response.data[0], userId);
  return persona ? { status: "ok", value: persona } : { status: "error" };
}

function isAllowedMutationOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    if (new URL(origin).origin !== origin) return false;
    const url = new URL(request.url);
    const allowed = new Set([url.origin]);
    const host = request.headers.get("host");
    if (host && host.length <= 255 && !/[\u0000-\u0020\u007f@,/\\?#]/u.test(host)) allowed.add(new URL(`${url.protocol}//${host}`).origin);
    if (!allowed.has(origin)) return false;
  } catch { return false; }
  const site = request.headers.get("sec-fetch-site");
  return site === null || site === "same-origin";
}

function authorizationFailure(status: Exclude<Awaited<ReturnType<typeof getServerAuthorization>>["status"], "authenticated">) { return status === "not_authenticated" ? error("not_authenticated", 401) : status === "not_configured" ? error("not_configured", 503) : error("temporarily_unavailable", 503); }
function unavailable(caught: unknown) { return caught instanceof SupabaseAdminConfigurationError ? error("not_configured", 503) : error("temporarily_unavailable", 503); }
function json(body: unknown, status: number) { return NextResponse.json(body, { status, headers: { "cache-control": "no-store" } }); }
function error(code: string, status: number) { return json({ code, message: "The evidence review request could not be completed." }, status); }
function isUuid(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value); }
function includes<const T extends readonly string[]>(values: T, value: unknown): value is T[number] { return typeof value === "string" && values.includes(value); }
function isRecord(value: unknown): value is Record<string, unknown> { return value !== null && typeof value === "object" && !Array.isArray(value); }
function isExactRecord(value: unknown, keys: readonly string[]): value is Record<string, unknown> { return isRecord(value) && exact(value, keys); }
function exact(value: Record<string, unknown>, keys: readonly string[]) { return Object.keys(value).sort().join("\0") === [...keys].sort().join("\0"); }
