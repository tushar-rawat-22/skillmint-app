import "server-only";

const FOUNDER_USER_ID_ENV = "ANALYTICS_FOUNDER_USER_ID";
const AUTH_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export type FounderAnalyticsConfiguration =
  | { readonly enabled: false }
  | { readonly enabled: true; readonly founderUserId: string };

export function getFounderAnalyticsConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): FounderAnalyticsConfiguration {
  const candidate = (environment[FOUNDER_USER_ID_ENV] ?? "")
    .trim()
    .toLowerCase();
  return AUTH_UUID_PATTERN.test(candidate)
    ? { enabled: true, founderUserId: candidate }
    : { enabled: false };
}
