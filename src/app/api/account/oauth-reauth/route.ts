import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

import { getBearerToken } from "@/lib/accountDeletion/contract";
import {
  hasGoogleIdentity,
  OAUTH_DELETION_REAUTH_MAX_BODY_BYTES,
  OAUTH_DELETION_REAUTH_PROVIDER,
  OAUTH_DELETION_REAUTH_PURPOSE,
  parseOAuthDeletionReauthRequestText,
} from "@/lib/oauthReauthentication/contract";
import { createOAuthDeletionPkceClient } from "@/lib/oauthReauthentication/pkce";
import {
  createOAuthDeletionReauthNonce,
  hashOAuthDeletionReauthNonce,
  oauthCookieBaseOptions,
  OAUTH_DELETION_INTENT_COOKIE,
  OAUTH_DELETION_PKCE_COOKIE,
  OAUTH_DELETION_PROOF_COOKIE,
} from "@/lib/oauthReauthentication/proof";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getSupabasePublicConfig,
  getTrustedAppOrigin,
} from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";

export async function POST(request: Request) {
  const appOrigin = getTrustedAppOrigin();
  if (!appOrigin || request.headers.get("origin") !== appOrigin) {
    return jsonError("invalid_request", 403);
  }
  if (!(request.headers.get("content-type") ?? "").startsWith("application/json")) {
    return jsonError("invalid_request", 415);
  }
  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) &&
    declaredLength > OAUTH_DELETION_REAUTH_MAX_BODY_BYTES) {
    return jsonError("invalid_request", 413);
  }

  let body: string;
  try {
    body = await request.text();
  } catch {
    return jsonError("invalid_request", 400);
  }
  if (!parseOAuthDeletionReauthRequestText(body)) {
    return jsonError("invalid_request", 400);
  }

  const token = getBearerToken(request.headers.get("authorization"));
  const config = getSupabasePublicConfig();
  if (!token || !config) return jsonError("not_authenticated", 401);

  try {
    const userClient = createClient<Database>(
      config.url,
      config.publishableKey,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      },
    );
    const { data, error } = await userClient.auth.getUser(token);
    if (error || !data.user || !hasGoogleIdentity(data.user)) {
      return jsonError("not_authenticated", 401);
    }

    const nonce = createOAuthDeletionReauthNonce();
    const nonceHash = hashOAuthDeletionReauthNonce(nonce);
    const adminClient = createSupabaseAdminClient();
    const intent = await adminClient.rpc(
      "create_oauth_deletion_reauth_intent",
      {
        expected_user_id: data.user.id,
        requested_nonce_hash: nonceHash,
        requested_provider: OAUTH_DELETION_REAUTH_PROVIDER,
        requested_purpose: OAUTH_DELETION_REAUTH_PURPOSE,
      },
    );
    if (intent.error || intent.data !== true) {
      return jsonError("temporarily_unavailable", 503);
    }

    const pkce = createOAuthDeletionPkceClient({
      supabaseUrl: config.url,
      publishableKey: config.publishableKey,
    });
    const callbackUrl = `${appOrigin}/auth/reauth/callback`;
    const oauth = await pkce.client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl,
        scopes: "openid email profile",
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    });
    const verifier = pkce.getCodeVerifier();
    if (oauth.error || !oauth.data.url || !verifier) {
      await invalidateIntent(adminClient, nonceHash);
      return jsonError("temporarily_unavailable", 503);
    }

    const destination = new URL(oauth.data.url);
    const supabaseOrigin = new URL(config.url).origin;
    if (
      destination.origin !== supabaseOrigin ||
      destination.pathname !== "/auth/v1/authorize" ||
      destination.searchParams.get("provider") !== "google" ||
      destination.searchParams.get("redirect_to") !== callbackUrl
    ) {
      await invalidateIntent(adminClient, nonceHash);
      return jsonError("temporarily_unavailable", 503);
    }

    const response = jsonResponse({ ok: true, redirectTo: destination.toString() }, 200);
    const cookieOptions = oauthCookieBaseOptions(appOrigin);
    response.cookies.set(OAUTH_DELETION_INTENT_COOKIE, nonce, {
      ...cookieOptions,
      path: "/auth/reauth/callback",
    });
    response.cookies.set(OAUTH_DELETION_PKCE_COOKIE, verifier, {
      ...cookieOptions,
      path: "/auth/reauth/callback",
    });
    response.cookies.set(OAUTH_DELETION_PROOF_COOKIE, "", {
      ...cookieOptions,
      maxAge: 0,
      path: "/api/account/delete",
    });
    return response;
  } catch {
    return jsonError("temporarily_unavailable", 503);
  }
}

async function invalidateIntent(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  nonceHash: string,
) {
  await adminClient.rpc("invalidate_oauth_deletion_reauth_intent", {
    requested_nonce_hash: nonceHash,
  });
}

function jsonError(code: string, status: number) {
  return jsonResponse({
    ok: false,
    code,
    error: "Account reauthentication is unavailable. Please try again.",
  }, status);
}

function jsonResponse(body: object, status: number) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}
