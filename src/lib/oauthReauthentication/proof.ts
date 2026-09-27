import "server-only";

import { createHash, randomBytes } from "node:crypto";

export const OAUTH_DELETION_INTENT_COOKIE =
  "skillmint_oauth_deletion_reauth_intent";
export const OAUTH_DELETION_PKCE_COOKIE =
  "skillmint_oauth_deletion_reauth_pkce";
export const OAUTH_DELETION_PROOF_COOKIE =
  "skillmint_oauth_deletion_reauth_proof";
export const OAUTH_DELETION_REAUTH_MAX_AGE_SECONDS = 10 * 60;

const OPAQUE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32,256}$/;
const PKCE_VALUE_PATTERN = /^[A-Za-z0-9._~\/-]{32,512}$/;

export function createOAuthDeletionReauthNonce(): string {
  return randomBytes(32).toString("base64url");
}

export function hashOAuthDeletionReauthNonce(nonce: string): string {
  return createHash("sha256").update(nonce, "utf8").digest("hex");
}

export function parseOAuthDeletionReauthNonce(value: unknown): string | null {
  return typeof value === "string" && OPAQUE_TOKEN_PATTERN.test(value)
    ? value
    : null;
}

export function parseOAuthDeletionPkceValue(value: unknown): string | null {
  return typeof value === "string" && PKCE_VALUE_PATTERN.test(value)
    ? value
    : null;
}

export function oauthCookieBaseOptions(appOrigin: string) {
  return {
    httpOnly: true,
    secure: new URL(appOrigin).protocol === "https:",
    sameSite: "lax" as const,
    maxAge: OAUTH_DELETION_REAUTH_MAX_AGE_SECONDS,
  };
}
