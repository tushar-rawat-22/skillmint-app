import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

import {
  createSupabaseAdminClient,
  SupabaseAdminConfigurationError,
} from "@/lib/supabase/admin";
import {
  getSupabasePublicConfig,
  getTrustedAppOrigin,
} from "@/lib/supabase/config";
import {
  getBearerToken,
  isAllowedAccountDeletionOrigin,
  parseAccountDeleteRequestText,
  validateAccountDeleteRequestMetadata,
} from "@/lib/accountDeletion/contract";
import { deleteAuthUserWithVerifiedConvergence } from "@/lib/accountDeletion/authDeletionConvergence";
import {
  decodeJwtPayload,
  validateRecentAuthentication,
} from "@/lib/accountDeletion/recentAuth";
import {
  hasGoogleIdentity,
  OAUTH_DELETION_REAUTH_PROVIDER,
  OAUTH_DELETION_REAUTH_PURPOSE,
} from "@/lib/oauthReauthentication/contract";
import {
  hashOAuthDeletionReauthNonce,
  oauthCookieBaseOptions,
  OAUTH_DELETION_PROOF_COOKIE,
  parseOAuthDeletionReauthNonce,
} from "@/lib/oauthReauthentication/proof";
import {
  runAccountDeletionOrchestration,
  type AccountDeletionOrchestrationErrorCode,
} from "@/lib/accountDeletion/orchestration";
import type { Database } from "@/lib/supabase/database.types";

type PublicErrorCode =
  | "invalid_origin"
  | "unsupported_media_type"
  | "request_too_large"
  | "invalid_request"
  | "not_authenticated"
  | "recent_authentication_required"
  | "unsupported_authentication_method"
  | "not_configured"
  | AccountDeletionOrchestrationErrorCode
  | "temporarily_unavailable";

type AccountPreparationRow = {
  profiles_deleted: number;
  resume_analyses_deleted: number;
  job_matches_deleted: number;
  career_snapshots_deleted: number;
  beta_feedback_deleted: number;
  active_resume_selections_deleted: number;
  verified_absent: true;
};

const activeDeletions = new Map<string, Promise<
  Awaited<ReturnType<typeof runAccountDeletionOrchestration>>
>>();

export async function POST(request: Request) {
  const trustedAppOrigin = getTrustedAppOrigin();
  if (!isAllowedAccountDeletionOrigin({
    requestUrl: request.url,
    origin: request.headers.get("origin"),
    trustedAppOrigin,
  })) {
    return jsonError("invalid_origin", 403);
  }

  const metadata = validateAccountDeleteRequestMetadata({
    method: request.method,
    contentType: request.headers.get("content-type"),
    contentLength: request.headers.get("content-length"),
  });
  if (!metadata.ok) {
    if (metadata.code === "unsupported_media_type") {
      return jsonError("unsupported_media_type", 415);
    }
    if (metadata.code === "request_too_large") {
      return jsonError("request_too_large", 413);
    }
    return jsonError("invalid_request", 400);
  }

  let requestText: string;
  try {
    requestText = await request.text();
  } catch {
    return jsonError("invalid_request", 400);
  }
  const parsedBody = parseAccountDeleteRequestText(requestText);
  if (!parsedBody.ok) {
    return parsedBody.code === "request_too_large"
      ? jsonError("request_too_large", 413)
      : jsonError("invalid_request", 400);
  }

  const token = getBearerToken(request.headers.get("authorization"));
  if (!token) return jsonError("not_authenticated", 401);

  const publicConfig = getSupabasePublicConfig();
  if (!publicConfig) return jsonError("not_configured", 503);

  let shouldClearOAuthProof = false;
  try {
    const userClient = createClient<Database>(
      publicConfig.url,
      publicConfig.publishableKey,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      },
    );
    const { data: userData, error: userError } =
      await userClient.auth.getUser(token);
    if (userError || !userData.user) {
      return jsonError("not_authenticated", 401);
    }

    const recentPasswordAuthentication = validateRecentAuthentication({
      claims: decodeJwtPayload(token),
      validatedUserId: userData.user.id,
      provider: userData.user.app_metadata?.provider,
      nowSeconds: Math.floor(Date.now() / 1000),
    });

    // Validate the server-only Auth admin boundary before removing any rows so
    // a configuration failure cannot create an avoidable partial deletion.
    const adminClient = createSupabaseAdminClient();

    if (!recentPasswordAuthentication.ok) {
      if (!hasGoogleIdentity(userData.user)) {
        return jsonError(
          recentPasswordAuthentication.code === "unsupported_method"
            ? "unsupported_authentication_method"
            : "recent_authentication_required",
          403,
        );
      }

      const cookieStore = await cookies();
      const proof = parseOAuthDeletionReauthNonce(
        cookieStore.get(OAUTH_DELETION_PROOF_COOKIE)?.value,
      );
      if (!proof) {
        return jsonError("recent_authentication_required", 403);
      }
      shouldClearOAuthProof = true;

      const consumed = await adminClient.rpc(
        "consume_oauth_deletion_reauth_intent",
        {
          requested_nonce_hash: hashOAuthDeletionReauthNonce(proof),
          expected_user_id: userData.user.id,
          expected_provider: OAUTH_DELETION_REAUTH_PROVIDER,
          requested_purpose: OAUTH_DELETION_REAUTH_PURPOSE,
        },
      );
      if (consumed.error || consumed.data !== true) {
        return clearOAuthProofCookie(
          jsonError("recent_authentication_required", 403),
          trustedAppOrigin,
        );
      }
    }

    const result = await runOnceForUser(userData.user.id, async () =>
      runAccountDeletionOrchestration({
        deleteAccountData: async () => {
          const response = await adminClient.rpc(
            "prepare_account_deletion",
            { target_user_id: userData.user.id },
          );
          if (response.error) return { ok: false };
          const row = parseAccountPreparationRow(response.data);
          if (!row) return { ok: false };
          return {
            ok: true,
            verifiedAbsent: row.verified_absent,
            counts: {
              profiles: row.profiles_deleted,
              resumeAnalyses: row.resume_analyses_deleted,
              jobMatches: row.job_matches_deleted,
              careerSnapshots: row.career_snapshots_deleted,
              betaFeedback: row.beta_feedback_deleted,
              activeResumeSelections: row.active_resume_selections_deleted,
            },
          };
        },
        // Repository discovery found no account-owned Supabase Storage usage.
        // This explicit stage must fail closed if Storage becomes applicable.
        deleteAccountStorage: async () => ({
          ok: true,
          applicable: false,
          verified: true,
        }),
        deleteAuthUser: () => deleteAuthUserWithVerifiedConvergence(
          adminClient.auth.admin,
          userData.user.id,
        ),
      })
    );

    const response = result.ok
      ? jsonResponse({ ok: true, deleted: true }, 200)
      : jsonError(result.code, 500);
    return shouldClearOAuthProof
      ? clearOAuthProofCookie(response, trustedAppOrigin)
      : response;
  } catch (error) {
    const response = error instanceof SupabaseAdminConfigurationError
      ? jsonError("not_configured", 503)
      : jsonError("temporarily_unavailable", 503);
    return shouldClearOAuthProof
      ? clearOAuthProofCookie(response, trustedAppOrigin)
      : response;
  }
}

async function runOnceForUser(
  userId: string,
  start: () => Promise<Awaited<ReturnType<typeof runAccountDeletionOrchestration>>>,
) {
  const existing = activeDeletions.get(userId);
  if (existing) return existing;

  const operation = start();
  activeDeletions.set(userId, operation);
  try {
    return await operation;
  } finally {
    if (activeDeletions.get(userId) === operation) {
      activeDeletions.delete(userId);
    }
  }
}

function parseAccountPreparationRow(data: unknown): AccountPreparationRow | null {
  const row = Array.isArray(data)
    ? data.length === 1 ? data[0] : null
    : data;
  if (!isRecord(row) || row.verified_absent !== true) return null;

  const countKeys = [
    "profiles_deleted",
    "resume_analyses_deleted",
    "job_matches_deleted",
    "career_snapshots_deleted",
    "beta_feedback_deleted",
    "active_resume_selections_deleted",
  ] as const;
  const exactKeys = [...countKeys, "verified_absent"].sort();
  if (
    Object.keys(row).sort().join("\0") !== exactKeys.join("\0") ||
    !countKeys.every((key) => isSafeCount(row[key])) ||
    Number(row.active_resume_selections_deleted) > 1
  ) {
    return null;
  }

  return {
    profiles_deleted: Number(row.profiles_deleted),
    resume_analyses_deleted: Number(row.resume_analyses_deleted),
    job_matches_deleted: Number(row.job_matches_deleted),
    career_snapshots_deleted: Number(row.career_snapshots_deleted),
    beta_feedback_deleted: Number(row.beta_feedback_deleted),
    active_resume_selections_deleted: Number(
      row.active_resume_selections_deleted,
    ),
    verified_absent: true,
  };
}

function isSafeCount(value: unknown): boolean {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function jsonError(code: PublicErrorCode, status: number): NextResponse {
  const messages: Record<PublicErrorCode, string> = {
    invalid_origin: "Request origin is not allowed.",
    unsupported_media_type: "Expected an application/json request.",
    request_too_large: "The deletion request is too large.",
    invalid_request: "The deletion request was not accepted.",
    not_authenticated: "Sign in again before deleting your account.",
    recent_authentication_required: "Reauthenticate before deleting your account.",
    unsupported_authentication_method: "Account deletion is not available for this sign-in method yet.",
    not_configured: "Account deletion is not configured on this server.",
    account_data_cleanup_failed: "Account deletion did not finish. Please try again.",
    storage_deletion_failed: "Account deletion did not finish. Please try again.",
    auth_deletion_failed: "Account deletion did not finish. Please try again.",
    temporarily_unavailable: "Account deletion is temporarily unavailable. Please try again.",
  };
  return jsonResponse({ ok: false, code, error: messages[code] }, status);
}

function jsonResponse(body: object, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}

function clearOAuthProofCookie(
  response: NextResponse,
  appOrigin: string | null,
): NextResponse {
  if (!appOrigin) return response;
  response.cookies.set(OAUTH_DELETION_PROOF_COOKIE, "", {
    ...oauthCookieBaseOptions(appOrigin),
    maxAge: 0,
    path: "/api/account/delete",
  });
  return response;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
