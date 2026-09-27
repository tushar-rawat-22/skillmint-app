import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import {
  decodeJwtPayload,
  validateRecentOAuthAuthentication,
} from "@/lib/accountDeletion/recentAuth";
import {
  hasGoogleIdentity,
  OAUTH_DELETION_REAUTH_PROVIDER,
  OAUTH_DELETION_REAUTH_PURPOSE,
} from "@/lib/oauthReauthentication/contract";
import { createOAuthDeletionPkceClient } from "@/lib/oauthReauthentication/pkce";
import {
  hashOAuthDeletionReauthNonce,
  oauthCookieBaseOptions,
  OAUTH_DELETION_INTENT_COOKIE,
  OAUTH_DELETION_PKCE_COOKIE,
  OAUTH_DELETION_PROOF_COOKIE,
  parseOAuthDeletionPkceValue,
  parseOAuthDeletionReauthNonce,
} from "@/lib/oauthReauthentication/proof";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getSupabasePublicConfig,
  getTrustedAppOrigin,
} from "@/lib/supabase/config";

const MAX_CODE_LENGTH = 4_096;

export async function GET(request: Request) {
  const appOrigin = getTrustedAppOrigin();
  const config = getSupabasePublicConfig();
  if (!appOrigin || !config) return new NextResponse(null, { status: 404 });

  const cookieStore = await cookies();
  const nonce = parseOAuthDeletionReauthNonce(
    cookieStore.get(OAUTH_DELETION_INTENT_COOKIE)?.value,
  );
  const verifier = parseOAuthDeletionPkceValue(
    cookieStore.get(OAUTH_DELETION_PKCE_COOKIE)?.value,
  );
  const nonceHash = nonce ? hashOAuthDeletionReauthNonce(nonce) : null;
  let adminClient: ReturnType<typeof createSupabaseAdminClient>;
  try {
    adminClient = createSupabaseAdminClient();
  } catch {
    return finish(appOrigin, "failed");
  }
  const requestUrl = new URL(request.url);
  const codes = requestUrl.searchParams.getAll("code");
  const code = codes.length === 1 ? codes[0]?.trim() : "";

  if (!nonce || !verifier || !code || code.length > MAX_CODE_LENGTH) {
    if (nonceHash) await invalidateIntent(adminClient, nonceHash);
    return finish(appOrigin, "failed");
  }
  const verifiedNonceHash = hashOAuthDeletionReauthNonce(nonce);

  try {
    const pkce = createOAuthDeletionPkceClient({
      supabaseUrl: config.url,
      publishableKey: config.publishableKey,
      initialCodeVerifier: verifier,
    });
    const exchange = await pkce.client.auth.exchangeCodeForSession(code);
    const accessToken = exchange.data.session?.access_token;
    if (exchange.error || !accessToken) {
      await invalidateIntent(adminClient, verifiedNonceHash);
      return finish(appOrigin, "failed");
    }

    const verified = await pkce.client.auth.getUser(accessToken);
    const user = verified.data.user;
    const recent = validateRecentOAuthAuthentication({
      claims: decodeJwtPayload(accessToken),
      validatedUserId: user?.id ?? "",
      provider: OAUTH_DELETION_REAUTH_PROVIDER,
      nowSeconds: Math.floor(Date.now() / 1000),
    });
    if (verified.error || !user || !hasGoogleIdentity(user) || !recent.ok) {
      await invalidateIntent(adminClient, verifiedNonceHash);
      return finish(appOrigin, "failed");
    }

    const marked = await adminClient.rpc(
      "mark_oauth_deletion_reauth_returned",
      {
        requested_nonce_hash: verifiedNonceHash,
        returned_user_id: user.id,
        returned_provider: OAUTH_DELETION_REAUTH_PROVIDER,
        requested_purpose: OAUTH_DELETION_REAUTH_PURPOSE,
      },
    );
    if (marked.error || marked.data !== true) {
      return finish(appOrigin, "failed");
    }

    return finish(appOrigin, "ready", nonce);
  } catch {
    await invalidateIntent(adminClient, verifiedNonceHash);
    return finish(appOrigin, "failed");
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

function finish(
  appOrigin: string,
  result: "ready" | "failed",
  proof?: string,
) {
  const destination = new URL("/settings/data", appOrigin);
  destination.searchParams.set("account_reauth", result);
  const response = NextResponse.redirect(destination, 303);
  const cookieOptions = oauthCookieBaseOptions(appOrigin);
  response.cookies.set(OAUTH_DELETION_INTENT_COOKIE, "", {
    ...cookieOptions,
    maxAge: 0,
    path: "/auth/reauth/callback",
  });
  response.cookies.set(OAUTH_DELETION_PKCE_COOKIE, "", {
    ...cookieOptions,
    maxAge: 0,
    path: "/auth/reauth/callback",
  });
  if (result === "ready" && proof) {
    response.cookies.set(OAUTH_DELETION_PROOF_COOKIE, proof, {
      ...cookieOptions,
      sameSite: "strict",
      path: "/api/account/delete",
    });
  } else {
    response.cookies.set(OAUTH_DELETION_PROOF_COOKIE, "", {
      ...cookieOptions,
      maxAge: 0,
      path: "/api/account/delete",
    });
  }
  return response;
}
