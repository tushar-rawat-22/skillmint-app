import {
  ANALYTICS_DURATION_BUCKETS,
  ANALYTICS_ENVIRONMENTS,
  ANALYTICS_EVENT_NAMES,
  ANALYTICS_EVENT_VERSION,
  ANALYTICS_FEEDBACK_PERSISTENCE_PATHS,
  ANALYTICS_FEEDBACK_TYPES,
  ANALYTICS_FILE_TYPES,
  ANALYTICS_MISSION_CATEGORIES,
  ANALYTICS_OPERATION_ERROR_CODES,
  ANALYTICS_OWNER_MODES,
  ANALYTICS_PATH_SOURCES,
  ANALYTICS_PRODUCT_OPERATIONS,
  ANALYTICS_RESUME_ERROR_CODES,
  ANALYTICS_SOURCE_SCREENS,
  ANALYTICS_TARGET_SOURCES,
  MAX_ANALYTICS_EVENT_BYTES,
  type AnalyticsEvent,
  type AnalyticsEventName,
} from "./eventContract";

export type AnalyticsValidationCode =
  | "invalid_event_object"
  | "non_plain_object"
  | "symbol_key"
  | "accessor_property"
  | "inherited_property"
  | "missing_property"
  | "unknown_property"
  | "invalid_event_id"
  | "invalid_event_name"
  | "invalid_event_version"
  | "invalid_timestamp"
  | "invalid_environment"
  | "invalid_build_id"
  | "invalid_source_screen"
  | "invalid_owner_mode"
  | "invalid_property_value"
  | "event_too_large"
  | "hostile_object";

export type AnalyticsValidationResult =
  | { readonly ok: true; readonly event: AnalyticsEvent }
  | { readonly ok: false; readonly code: AnalyticsValidationCode };

const EVENT_KEYS = [
  "event_id",
  "event_name",
  "event_version",
  "occurred_at",
  "environment",
  "build_id",
  "source_screen",
  "owner_mode",
  "properties",
] as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const BUILD_ID_PATTERN = /^[A-Za-z0-9._-]{1,64}$/;
const UTC_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

type InspectedObject = {
  readonly keys: readonly string[];
  readonly values: ReadonlyMap<string, unknown>;
};

class ValidationFailure {
  constructor(readonly code: AnalyticsValidationCode) {}
}

export function isAnalyticsEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" &&
    ANALYTICS_EVENT_NAMES.includes(value as AnalyticsEventName);
}

export function isCanonicalAnalyticsEventId(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function isStrictUtcAnalyticsTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !UTC_TIMESTAMP_PATTERN.test(value)) {
    return false;
  }

  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp)) return false;

  try {
    return new Date(timestamp).toISOString() === value;
  } catch {
    return false;
  }
}

export function isValidAnalyticsBuildId(value: unknown): value is string {
  return typeof value === "string" && BUILD_ID_PATTERN.test(value);
}

export function validateAnalyticsEvent(value: unknown): AnalyticsValidationResult {
  try {
    const envelope = inspectPlainDataObject(value);
    expectExactKeys(envelope, EVENT_KEYS);

    const eventId = envelope.values.get("event_id");
    if (!isCanonicalAnalyticsEventId(eventId)) {
      throw new ValidationFailure("invalid_event_id");
    }

    const eventName = envelope.values.get("event_name");
    if (!isAnalyticsEventName(eventName)) {
      throw new ValidationFailure("invalid_event_name");
    }

    if (envelope.values.get("event_version") !== ANALYTICS_EVENT_VERSION) {
      throw new ValidationFailure("invalid_event_version");
    }

    const occurredAt = envelope.values.get("occurred_at");
    if (!isStrictUtcAnalyticsTimestamp(occurredAt)) {
      throw new ValidationFailure("invalid_timestamp");
    }

    const environment = enumValue(
      envelope.values.get("environment"),
      ANALYTICS_ENVIRONMENTS,
      "invalid_environment",
    );
    const buildId = envelope.values.get("build_id");
    if (!isValidAnalyticsBuildId(buildId)) {
      throw new ValidationFailure("invalid_build_id");
    }
    const sourceScreen = enumValue(
      envelope.values.get("source_screen"),
      ANALYTICS_SOURCE_SCREENS,
      "invalid_source_screen",
    );
    const ownerMode = enumValue(
      envelope.values.get("owner_mode"),
      ANALYTICS_OWNER_MODES,
      "invalid_owner_mode",
    );
    const properties = validateEventProperties(
      eventName,
      envelope.values.get("properties"),
    );

    const event = Object.freeze({
      event_id: eventId,
      event_name: eventName,
      event_version: ANALYTICS_EVENT_VERSION,
      occurred_at: occurredAt,
      environment,
      build_id: buildId,
      source_screen: sourceScreen,
      owner_mode: ownerMode,
      properties,
    }) as AnalyticsEvent;

    if (JSON.stringify(event).length > MAX_ANALYTICS_EVENT_BYTES) {
      throw new ValidationFailure("event_too_large");
    }

    return { ok: true, event };
  } catch (error) {
    return {
      ok: false,
      code: classifyValidationFailure(error),
    };
  }
}

function validateEventProperties(
  eventName: AnalyticsEventName,
  value: unknown,
): Readonly<object> {
  const properties = inspectPlainDataObject(value);

  switch (eventName) {
    case "career_setup_started":
      expectExactKeys(properties, ["setup_mode"]);
      return immutableProperties({
        setup_mode: enumValue(
          properties.values.get("setup_mode"),
          ["create", "edit"] as const,
        ),
      });

    case "resume_analysis_started":
      expectExactKeys(properties, ["file_type"]);
      return immutableProperties({
        file_type: enumValue(
          properties.values.get("file_type"),
          ANALYTICS_FILE_TYPES,
        ),
      });

    case "resume_analysis_failed": {
      expectExactKeys(
        properties,
        ["file_type", "error_code"],
        ["duration_bucket"],
      );
      const durationBucket = optionalEnumValue(
        properties,
        "duration_bucket",
        ANALYTICS_DURATION_BUCKETS,
      );
      return immutableProperties({
        file_type: enumValue(
          properties.values.get("file_type"),
          ANALYTICS_FILE_TYPES,
        ),
        error_code: enumValue(
          properties.values.get("error_code"),
          ANALYTICS_RESUME_ERROR_CODES,
        ),
        ...(durationBucket === undefined
          ? {}
          : { duration_bucket: durationBucket }),
      });
    }

    case "active_target_selected":
      expectExactKeys(properties, ["target_source", "selection_kind"]);
      return immutableProperties({
        target_source: enumValue(
          properties.values.get("target_source"),
          ANALYTICS_TARGET_SOURCES,
        ),
        selection_kind: enumValue(
          properties.values.get("selection_kind"),
          ["created", "replaced"] as const,
        ),
      });

    case "active_target_cleared":
      expectExactKeys(properties, ["prior_target_source"]);
      return immutableProperties({
        prior_target_source: enumValue(
          properties.values.get("prior_target_source"),
          ANALYTICS_TARGET_SOURCES,
        ),
      });

    case "jd_match_started":
      expectExactKeys(properties, []);
      return immutableProperties({});

    case "jd_match_completed": {
      expectExactKeys(properties, [], ["duration_bucket"]);
      const durationBucket = optionalEnumValue(
        properties,
        "duration_bucket",
        ANALYTICS_DURATION_BUCKETS,
      );
      return immutableProperties(
        durationBucket === undefined
          ? {}
          : { duration_bucket: durationBucket },
      );
    }

    case "roadmap_reached":
      expectExactKeys(properties, ["path_source"]);
      return immutableProperties({
        path_source: enumValue(
          properties.values.get("path_source"),
          ANALYTICS_PATH_SOURCES,
        ),
      });

    case "mission_started":
    case "mission_marked_done":
      expectExactKeys(properties, ["mission_category", "path_source"]);
      return immutableProperties({
        mission_category: enumValue(
          properties.values.get("mission_category"),
          ANALYTICS_MISSION_CATEGORIES,
        ),
        path_source: enumValue(
          properties.values.get("path_source"),
          ANALYTICS_PATH_SOURCES,
        ),
      });

    case "analysis_restored":
      expectExactKeys(properties, ["restore_kind"]);
      return immutableProperties({
        restore_kind: enumValue(
          properties.values.get("restore_kind"),
          ["latest", "selected"] as const,
        ),
      });

    case "feedback_persisted":
      expectExactKeys(properties, ["persistence_path", "feedback_type"]);
      return immutableProperties({
        persistence_path: enumValue(
          properties.values.get("persistence_path"),
          ANALYTICS_FEEDBACK_PERSISTENCE_PATHS,
        ),
        feedback_type: enumValue(
          properties.values.get("feedback_type"),
          ANALYTICS_FEEDBACK_TYPES,
        ),
      });

    case "product_operation_failed": {
      expectExactKeys(
        properties,
        ["operation", "error_code"],
        ["duration_bucket"],
      );
      const durationBucket = optionalEnumValue(
        properties,
        "duration_bucket",
        ANALYTICS_DURATION_BUCKETS,
      );
      return immutableProperties({
        operation: enumValue(
          properties.values.get("operation"),
          ANALYTICS_PRODUCT_OPERATIONS,
        ),
        error_code: enumValue(
          properties.values.get("error_code"),
          ANALYTICS_OPERATION_ERROR_CODES,
        ),
        ...(durationBucket === undefined
          ? {}
          : { duration_bucket: durationBucket }),
      });
    }

    default:
      throw new ValidationFailure("invalid_event_name");
  }
}

function classifyValidationFailure(error: unknown): AnalyticsValidationCode {
  try {
    return error instanceof ValidationFailure
      ? error.code
      : "hostile_object";
  } catch {
    return "hostile_object";
  }
}

function inspectPlainDataObject(value: unknown): InspectedObject {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new ValidationFailure("invalid_event_object");
  }

  const prototype = Reflect.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new ValidationFailure("non_plain_object");
  }

  const ownKeys = Reflect.ownKeys(value);
  if (ownKeys.some((key) => typeof key === "symbol")) {
    throw new ValidationFailure("symbol_key");
  }

  const keys = ownKeys as string[];
  const values = new Map<string, unknown>();
  for (const key of keys) {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    if (!descriptor) throw new ValidationFailure("hostile_object");
    if (!("value" in descriptor)) {
      throw new ValidationFailure("accessor_property");
    }
    if (!descriptor.enumerable) {
      throw new ValidationFailure("invalid_event_object");
    }
    values.set(key, descriptor.value);
  }

  for (const key in value) {
    if (!values.has(key)) {
      throw new ValidationFailure("inherited_property");
    }
  }

  return { keys, values };
}

function expectExactKeys(
  value: InspectedObject,
  required: readonly string[],
  optional: readonly string[] = [],
): void {
  for (const key of required) {
    if (!value.values.has(key)) {
      throw new ValidationFailure("missing_property");
    }
  }

  const allowed = new Set([...required, ...optional]);
  for (const key of value.keys) {
    if (!allowed.has(key)) {
      throw new ValidationFailure("unknown_property");
    }
  }
}

function enumValue<const Values extends readonly string[]>(
  value: unknown,
  allowed: Values,
  code: AnalyticsValidationCode = "invalid_property_value",
): Values[number] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new ValidationFailure(code);
  }
  return value as Values[number];
}

function optionalEnumValue<const Values extends readonly string[]>(
  properties: InspectedObject,
  key: string,
  allowed: Values,
): Values[number] | undefined {
  return properties.values.has(key)
    ? enumValue(properties.values.get(key), allowed)
    : undefined;
}

function immutableProperties<Properties extends object>(
  properties: Properties,
): Readonly<Properties> {
  return Object.freeze(properties);
}
