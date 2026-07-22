import {
  type AnalyticsEnvironment,
  type AnalyticsEvent,
} from "@/platform/analytics/eventContract";
import {
  isValidAnalyticsBuildId,
  validateAnalyticsEvent,
} from "@/platform/analytics/eventValidation";

export type ServerAnalyticsContext = {
  readonly environment: AnalyticsEnvironment;
  readonly buildId: string;
};

export function getServerAnalyticsContext(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): ServerAnalyticsContext {
  const canonicalEnvironment = getCanonicalEnvironment(environment);
  const commitSha = (environment.VERCEL_GIT_COMMIT_SHA ?? "").trim();

  return {
    environment: canonicalEnvironment,
    buildId: isValidAnalyticsBuildId(commitSha)
      ? commitSha
      : canonicalEnvironment === "test"
        ? "local-test"
        : canonicalEnvironment === "development"
          ? "local-development"
          : "server-build-unavailable",
  };
}

export function canonicalizeAnalyticsEvent(
  event: AnalyticsEvent,
  context: ServerAnalyticsContext,
): AnalyticsEvent | null {
  const validation = validateAnalyticsEvent({
    ...event,
    environment: context.environment,
    build_id: context.buildId,
  });

  return validation.ok ? validation.event : null;
}

function getCanonicalEnvironment(
  environment: Readonly<Record<string, string | undefined>>,
): AnalyticsEnvironment {
  const vercelEnvironment = environment.VERCEL_ENV;
  if (
    vercelEnvironment === "development" ||
    vercelEnvironment === "preview" ||
    vercelEnvironment === "production"
  ) {
    return vercelEnvironment;
  }

  if (environment.NODE_ENV === "test") return "test";
  if (environment.NODE_ENV === "production") return "production";
  return "development";
}
