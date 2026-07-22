import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { AnalyticsEvent } from "@/platform/analytics/eventContract";
import { validateAnalyticsEvent } from "@/platform/analytics/eventValidation";

export type AnalyticsPersistenceFailureCode =
  | "invalid_event"
  | "not_configured"
  | "schema_unavailable"
  | "network_failure"
  | "temporarily_unavailable";

export type AnalyticsPersistenceResult =
  | { readonly ok: true; readonly code: "stored" | "duplicate" }
  | { readonly ok: false; readonly code: AnalyticsPersistenceFailureCode };

type AnalyticsInsertResult = {
  readonly error: null | {
    readonly code?: string;
    readonly status?: number;
  };
};

export interface AnalyticsEventWriter {
  insert(event: AnalyticsEvent): Promise<AnalyticsInsertResult>;
}

export function createAnalyticsEventRepository(writer: AnalyticsEventWriter) {
  return Object.freeze({
    async persist(input: unknown): Promise<AnalyticsPersistenceResult> {
      const validation = validateAnalyticsEvent(input);
      if (!validation.ok) return { ok: false, code: "invalid_event" };

      try {
        const result = await writer.insert(validation.event);
        if (!result.error) return { ok: true, code: "stored" };
        if (result.error.code === "23505") return { ok: true, code: "duplicate" };
        if (
          result.error.code === "42P01" ||
          result.error.code === "PGRST205"
        ) {
          return { ok: false, code: "schema_unavailable" };
        }
        if (result.error.status === 0) return { ok: false, code: "network_failure" };
        return { ok: false, code: "temporarily_unavailable" };
      } catch {
        return { ok: false, code: "network_failure" };
      }
    },
  });
}

export function isServerAnalyticsCollectionEnabled(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): boolean {
  return environment.ANALYTICS_COLLECTION_ENABLED === "true";
}

export async function persistAnalyticsEvent(
  input: unknown,
): Promise<AnalyticsPersistenceResult> {
  if (!isServerAnalyticsCollectionEnabled()) {
    return { ok: false, code: "not_configured" };
  }

  const validation = validateAnalyticsEvent(input);
  if (!validation.ok) {
    return { ok: false, code: "invalid_event" };
  }
  const event = validation.event;

  let client: ReturnType<typeof createSupabaseAdminClient>;
  try {
    client = createSupabaseAdminClient();
  } catch {
    return { ok: false, code: "not_configured" };
  }

  const repository = createAnalyticsEventRepository({
    async insert(canonicalEvent) {
      const result = await client.from("analytics_events").insert({
        event_id: canonicalEvent.event_id,
        event_name: canonicalEvent.event_name,
        event_version: canonicalEvent.event_version,
        occurred_at: canonicalEvent.occurred_at,
        environment: canonicalEvent.environment,
        build_id: canonicalEvent.build_id,
        source_screen: canonicalEvent.source_screen,
        owner_mode: canonicalEvent.owner_mode,
        properties: canonicalEvent.properties as unknown as Json,
      });
      return {
        error: result.error
          ? {
              code: result.error.code,
              status: result.status === 0 ? 0 : undefined,
            }
          : null,
      };
    },
  });

  return repository.persist(event);
}
