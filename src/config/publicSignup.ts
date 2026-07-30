import "server-only";

export const PUBLIC_SIGNUP_ENV = "SKILLMINT_PUBLIC_SIGNUP_ENABLED";

export type PublicSignupConfiguration = {
  readonly enabled: boolean;
};

export function getPublicSignupConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): PublicSignupConfiguration {
  return {
    enabled:
      (environment[PUBLIC_SIGNUP_ENV] ?? "").trim().toLowerCase() === "true",
  };
}
