import "server-only";

export const PUBLIC_OAUTH_ENV = "SKILLMINT_PUBLIC_OAUTH_ENABLED";
export const PUBLIC_OAUTH_GOOGLE_ENV = "SKILLMINT_PUBLIC_OAUTH_GOOGLE_ENABLED";
export const PUBLIC_OAUTH_GITHUB_ENV = "SKILLMINT_PUBLIC_OAUTH_GITHUB_ENABLED";

export type PublicOAuthProvider = "google" | "github";

export type PublicOAuthConfiguration = {
  readonly enabled: boolean;
  readonly providers: Readonly<Record<PublicOAuthProvider, boolean>>;
};

function isExplicitlyEnabled(value: string | undefined): boolean {
  return (value ?? "").trim().toLowerCase() === "true";
}

export function getPublicOAuthConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): PublicOAuthConfiguration {
  const enabled = isExplicitlyEnabled(environment[PUBLIC_OAUTH_ENV]);

  return {
    enabled,
    providers: {
      google:
        enabled && isExplicitlyEnabled(environment[PUBLIC_OAUTH_GOOGLE_ENV]),
      github:
        enabled && isExplicitlyEnabled(environment[PUBLIC_OAUTH_GITHUB_ENV]),
    },
  };
}

export function isPublicOAuthProviderEnabled(
  provider: PublicOAuthProvider,
  environment: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return getPublicOAuthConfiguration(environment).providers[provider] === true;
}
