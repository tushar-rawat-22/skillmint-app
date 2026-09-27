export const OAUTH_DELETION_REAUTH_PROVIDER = "google" as const;
export const OAUTH_DELETION_REAUTH_PURPOSE = "account_deletion" as const;
export const OAUTH_DELETION_REAUTH_MAX_BODY_BYTES = 64;

export function parseOAuthDeletionReauthRequestText(text: string): boolean {
  if (Buffer.byteLength(text, "utf8") > OAUTH_DELETION_REAUTH_MAX_BODY_BYTES) {
    return false;
  }

  try {
    const body: unknown = JSON.parse(text);
    return isRecord(body) && Object.keys(body).length === 0;
  } catch {
    return false;
  }
}

export function hasGoogleIdentity(user: {
  app_metadata?: Record<string, unknown>;
  identities?: Array<{ provider?: string }> | null;
}): boolean {
  const configuredProviders = user.app_metadata?.providers;
  return user.app_metadata?.provider === OAUTH_DELETION_REAUTH_PROVIDER ||
    (Array.isArray(configuredProviders) &&
      configuredProviders.includes(OAUTH_DELETION_REAUTH_PROVIDER)) ||
    Boolean(user.identities?.some(
      (identity) => identity.provider === OAUTH_DELETION_REAUTH_PROVIDER,
    ));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
