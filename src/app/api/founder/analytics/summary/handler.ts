import {
  buildFounderAnalyticsSummary,
  parseExactBearerToken,
  parseFounderAnalyticsRpcResult,
  parseFounderAnalyticsWindow,
  type FounderAnalyticsWindow,
} from "@/modules/analytics/founderDashboardContract";
import type {
  FounderDashboardLimiter,
  ProcessLocalPreAuthLimiter,
} from "@/modules/analytics/founderDashboardRateLimit";
import type { AnalyticsEnvironment } from "@/platform/analytics/eventContract";

export type FounderAnalyticsPublicCode =
  | "invalid_request"
  | "not_authenticated"
  | "not_authorized"
  | "dashboard_disabled"
  | "rate_limited"
  | "not_configured"
  | "schema_unavailable"
  | "temporarily_unavailable"
  | "aggregate_summary";

type AuthenticationResult =
  | { readonly ok: true; readonly userId: string }
  | {
      readonly ok: false;
      readonly code: "not_authenticated" | "not_configured" | "temporarily_unavailable";
    };

type RepositoryResult =
  | { readonly ok: true; readonly data: unknown }
  | {
      readonly ok: false;
      readonly code: "not_configured" | "schema_unavailable" | "temporarily_unavailable";
    };

export interface FounderAnalyticsHandlerDependencies {
  readonly founderUserId: string | null;
  readonly canonicalEnvironment: AnalyticsEnvironment;
  readonly authenticate: (token: string) => Promise<AuthenticationResult>;
  readonly loadAggregate: (
    window: FounderAnalyticsWindow,
    environment: AnalyticsEnvironment,
  ) => Promise<RepositoryResult>;
  readonly preAuthLimiter: ProcessLocalPreAuthLimiter;
  readonly founderLimiter: FounderDashboardLimiter;
  readonly now?: () => number;
}

export async function handleFounderAnalyticsSummaryGet(
  request: Request,
  dependencies: FounderAnalyticsHandlerDependencies,
): Promise<Response> {
  if (request.method !== "GET") return jsonError("invalid_request", 400);
  const window = parseFounderAnalyticsWindow(request.url);
  if (!window) return jsonError("invalid_request", 400);
  if (!dependencies.founderUserId) {
    return jsonError("dashboard_disabled", 404);
  }

  const token = parseExactBearerToken(request.headers.get("authorization"));
  if (!token) return jsonError("not_authenticated", 401);
  if (!dependencies.preAuthLimiter.tryConsume(readClock(dependencies.now))) {
    return jsonError("rate_limited", 429, 60);
  }

  let authentication: AuthenticationResult;
  try {
    authentication = await dependencies.authenticate(token);
  } catch {
    return jsonError("temporarily_unavailable", 503);
  }
  if (!authentication.ok) {
    return jsonError(authentication.code, statusFor(authentication.code));
  }
  if (authentication.userId !== dependencies.founderUserId) {
    return jsonError("not_authorized", 403);
  }

  const lease = dependencies.founderLimiter.tryAcquire(
    readClock(dependencies.now),
  );
  if (!lease.ok) {
    return jsonError(
      "rate_limited",
      429,
      lease.reason === "concurrent" ? 1 : 60,
    );
  }

  try {
    let repository: RepositoryResult;
    try {
      repository = await dependencies.loadAggregate(
        window,
        dependencies.canonicalEnvironment,
      );
    } catch {
      return jsonError("temporarily_unavailable", 503);
    }
    if (!repository.ok) {
      return jsonError(repository.code, 503);
    }
    const aggregate = parseFounderAnalyticsRpcResult(repository.data);
    if (!aggregate) return jsonError("temporarily_unavailable", 503);
    if (aggregate.window_name !== window ||
        aggregate.canonical_environment !==
          dependencies.canonicalEnvironment) {
      return jsonError("temporarily_unavailable", 503);
    }
    return jsonResponse({
      ok: true,
      code: "aggregate_summary",
      summary: buildFounderAnalyticsSummary(aggregate),
    }, 200);
  } finally {
    lease.release();
  }
}

function statusFor(
  code: "not_authenticated" | "not_configured" | "temporarily_unavailable",
): number {
  return code === "not_authenticated" ? 401 : 503;
}

function readClock(now: (() => number) | undefined): number {
  try {
    return (now ?? Date.now)();
  } catch {
    return Number.NaN;
  }
}

function jsonError(
  code: Exclude<FounderAnalyticsPublicCode, "aggregate_summary">,
  status: number,
  retryAfterSeconds?: 1 | 60,
) {
  return jsonResponse({ ok: false, code }, status, retryAfterSeconds);
}

function jsonResponse(
  body: object,
  status: number,
  retryAfterSeconds?: 1 | 60,
): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "private, no-store, max-age=0, must-revalidate",
      Pragma: "no-cache",
      Vary: "Authorization",
      ...(retryAfterSeconds === undefined
        ? {}
        : { "Retry-After": String(retryAfterSeconds) }),
    },
  });
}
