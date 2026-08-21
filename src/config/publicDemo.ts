import "server-only";

export const PUBLIC_DEMO_ENV = "SKILLMINT_PUBLIC_DEMO_ENABLED";

export type PublicDemoConfiguration = {
  readonly enabled: boolean;
};

export function getPublicDemoConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): PublicDemoConfiguration {
  return {
    enabled:
      (environment[PUBLIC_DEMO_ENV] ?? "").toLowerCase() === "true",
  };
}
