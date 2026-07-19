import {
  ANALYTICS_EVENT_VERSION,
  type AnalyticsEmitInput,
  type AnalyticsEnvironment,
} from "./eventContract";
import {
  validateAnalyticsEvent,
  type AnalyticsValidationCode,
} from "./eventValidation";
import type { AnalyticsSink } from "./sink";

export const ANALYTICS_SUCCESSFUL_ID_CAPACITY = 256;
export const ANALYTICS_IN_FLIGHT_ID_CAPACITY = 256;

export type AnalyticsClock = () => Date;

export interface AnalyticsEmitterConfiguration {
  readonly environment: AnalyticsEnvironment;
  readonly buildId: string;
  readonly clock: AnalyticsClock;
  readonly sink: AnalyticsSink;
}

export type AnalyticsEmitResult =
  | { readonly ok: true; readonly code: "emitted" | "duplicate" }
  | {
      readonly ok: false;
      readonly code: "invalid_event";
      readonly validationCode: AnalyticsValidationCode;
    }
  | { readonly ok: false; readonly code: "sink_failure" | "emitter_capacity" };

export interface AnalyticsEmitter {
  emit(input: AnalyticsEmitInput): Promise<AnalyticsEmitResult>;
}

export function createAnalyticsEmitter(
  configuration: AnalyticsEmitterConfiguration,
): AnalyticsEmitter {
  const environment = configuration.environment;
  const buildId = configuration.buildId;
  const clock = configuration.clock;
  const sink = configuration.sink;
  const writeToSink = sink.write.bind(sink);
  const successfulEventIds = new Set<string>();
  const inFlightDeliveries = new Map<string, Promise<AnalyticsEmitResult>>();

  return Object.freeze({
    async emit(input: AnalyticsEmitInput): Promise<AnalyticsEmitResult> {
      try {
        const candidate = {
          event_id: input.eventId,
          event_name: input.eventName,
          event_version: ANALYTICS_EVENT_VERSION,
          occurred_at: clock().toISOString(),
          environment,
          build_id: buildId,
          source_screen: input.sourceScreen,
          owner_mode: input.ownerMode,
          properties: input.properties,
        };
        const validation = validateAnalyticsEvent(candidate);
        if (!validation.ok) {
          return {
            ok: false,
            code: "invalid_event",
            validationCode: validation.code,
          };
        }

        const eventId = validation.event.event_id;
        const existingDelivery = inFlightDeliveries.get(eventId);
        if (existingDelivery) {
          return await existingDelivery;
        }

        if (successfulEventIds.has(eventId)) {
          return { ok: true, code: "duplicate" };
        }

        if (inFlightDeliveries.size >= ANALYTICS_IN_FLIGHT_ID_CAPACITY) {
          return { ok: false, code: "emitter_capacity" };
        }

        const delivery = Promise.resolve().then(() =>
          deliverEvent(
            validation.event,
            writeToSink,
            successfulEventIds,
          )
        );
        inFlightDeliveries.set(eventId, delivery);

        try {
          return await delivery;
        } finally {
          if (inFlightDeliveries.get(eventId) === delivery) {
            inFlightDeliveries.delete(eventId);
          }
        }
      } catch {
        return {
          ok: false,
          code: "invalid_event",
          validationCode: "hostile_object",
        };
      }
    },
  });
}

async function deliverEvent(
  event: Parameters<AnalyticsSink["write"]>[0],
  writeToSink: AnalyticsSink["write"],
  successfulEventIds: Set<string>,
): Promise<AnalyticsEmitResult> {
  try {
    await writeToSink(event);
  } catch {
    return { ok: false, code: "sink_failure" };
  }

  rememberSuccessfulId(successfulEventIds, event.event_id);
  return { ok: true, code: "emitted" };
}

function rememberSuccessfulId(ids: Set<string>, eventId: string): void {
  if (ids.size >= ANALYTICS_SUCCESSFUL_ID_CAPACITY) {
    const oldest = ids.values().next();
    if (!oldest.done) ids.delete(oldest.value);
  }
  ids.add(eventId);
}
