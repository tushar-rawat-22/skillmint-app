import "server-only";

import {
  createClient,
  isAuthApiError,
  isAuthError,
  isAuthRetryableFetchError,
} from "@supabase/supabase-js";

import {
  createSupabaseAdminClient,
  SupabaseAdminConfigurationError,
} from "@/lib/supabase/admin";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import type { FounderAnalyticsWindow } from "@/modules/analytics/founderDashboardContract";
import type { AnalyticsEnvironment } from "@/platform/analytics/eventContract";

export function classifyFounderAnalyticsAuthError(
  error: unknown,
): "not_authenticated" | "temporarily_unavailable" {
  if (isAuthRetryableFetchError(error)) {
    return "temporarily_unavailable";
  }

  if (isAuthApiError(error) && error.code === "bad_jwt") {
    return "not_authenticated";
  }

  if (
    isAuthError(error) &&
    (error.code === "invalid_jwt" || error.name === "AuthInvalidJwtError")
  ) {
    return "not_authenticated";
  }

  return "temporarily_unavailable";
}

export async function authenticateFounderAnalyticsToken(token: string) {
  const config = getSupabasePublicConfig();
  if (!config) return { ok: false as const, code: "not_configured" as const };

  try {
    const client = createClient<Database>(config.url, config.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error) {
      return {
        ok: false as const,
        code: classifyFounderAnalyticsAuthError(error),
      };
    }
    if (!data.user) {
      return { ok: false as const, code: "not_authenticated" as const };
    }
    return { ok: true as const, userId: data.user.id };
  } catch (error) {
    return {
      ok: false as const,
      code: classifyFounderAnalyticsAuthError(error),
    };
  }
}

export async function loadFounderAnalyticsAggregate(
  window: FounderAnalyticsWindow,
  environment: AnalyticsEnvironment,
) {
  try {
    const client = createSupabaseAdminClient();
    const result = await client.rpc("get_founder_analytics_summary", {
      requested_window: window,
      canonical_environment: environment,
    });
    if (!result.error) return { ok: true as const, data: result.data };
    if (result.error.code === "42883" || result.error.code === "PGRST202") {
      return { ok: false as const, code: "schema_unavailable" as const };
    }
    return { ok: false as const, code: "temporarily_unavailable" as const };
  } catch (error) {
    return error instanceof SupabaseAdminConfigurationError
      ? { ok: false as const, code: "not_configured" as const }
      : { ok: false as const, code: "temporarily_unavailable" as const };
  }
}
