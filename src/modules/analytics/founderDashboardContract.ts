import {
  ANALYTICS_ENVIRONMENTS,
  ANALYTICS_EVENT_NAMES,
  ANALYTICS_FEEDBACK_PERSISTENCE_PATHS,
  ANALYTICS_OPERATION_ERROR_CODES,
  ANALYTICS_PRODUCT_OPERATIONS,
  type AnalyticsEnvironment,
  type AnalyticsEventName,
  type AnalyticsFeedbackPersistencePath,
  type AnalyticsOperationErrorCode,
  type AnalyticsProductOperation,
} from "@/platform/analytics/eventContract";

export const FOUNDER_ANALYTICS_CONTRACT_VERSION =
  "founder_analytics_summary.v1" as const;
export const FOUNDER_ANALYTICS_WINDOWS = Object.freeze([
  "24h",
  "7d",
  "30d",
] as const);

export type FounderAnalyticsWindow =
  typeof FOUNDER_ANALYTICS_WINDOWS[number];

export type ObservedEventRatio = {
  readonly numerator: number;
  readonly denominator: number;
  readonly ratio: number | null;
};

export type FounderAnalyticsAggregate = {
  readonly contract_version: typeof FOUNDER_ANALYTICS_CONTRACT_VERSION;
  readonly as_of: string;
  readonly window_name: FounderAnalyticsWindow;
  readonly window_start: string;
  readonly window_end: string;
  readonly canonical_environment: AnalyticsEnvironment;
  readonly total_event_count: number;
  readonly last_received_at: string | null;
  readonly event_counts: Readonly<Record<AnalyticsEventName, number>>;
  readonly operation_error_counts: Readonly<Record<
    AnalyticsProductOperation,
    Readonly<Record<AnalyticsOperationErrorCode, number>>
  >>;
  readonly feedback_persistence_counts: Readonly<Record<
    AnalyticsFeedbackPersistencePath,
    number
  >>;
  readonly retention_overdue_count: number;
};

export type FounderAnalyticsSummary = FounderAnalyticsAggregate & {
  readonly observed_event_ratios: {
    readonly resume_analysis_failure: ObservedEventRatio;
    readonly jd_match_completion: ObservedEventRatio;
    readonly feedback_persistence_failure: ObservedEventRatio;
  };
};

export type FounderAnalyticsFailureCode =
  | "invalid_request"
  | "not_authenticated"
  | "not_authorized"
  | "dashboard_disabled"
  | "rate_limited"
  | "not_configured"
  | "schema_unavailable"
  | "temporarily_unavailable";

export type FounderAnalyticsHttpResponse =
  | {
      readonly kind: "success";
      readonly status: 200;
      readonly summary: FounderAnalyticsSummary;
    }
  | {
      readonly kind: "failure";
      readonly status: number;
      readonly code: FounderAnalyticsFailureCode;
    }
  | { readonly kind: "invalid" };

const AGGREGATE_KEYS = [
  "contract_version",
  "as_of",
  "window_name",
  "window_start",
  "window_end",
  "canonical_environment",
  "total_event_count",
  "last_received_at",
  "event_counts",
  "operation_error_counts",
  "feedback_persistence_counts",
  "retention_overdue_count",
] as const;

const SUMMARY_KEYS = [...AGGREGATE_KEYS, "observed_event_ratios"] as const;
const RATIO_KEYS = [
  "resume_analysis_failure",
  "jd_match_completion",
  "feedback_persistence_failure",
] as const;
const RATIO_VALUE_KEYS = ["numerator", "denominator", "ratio"] as const;
const STRICT_UTC_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const FAILURE_STATUS_BY_CODE: Readonly<Record<
  FounderAnalyticsFailureCode,
  number
>> = Object.freeze({
  invalid_request: 400,
  not_authenticated: 401,
  not_authorized: 403,
  dashboard_disabled: 404,
  rate_limited: 429,
  not_configured: 503,
  schema_unavailable: 503,
  temporarily_unavailable: 503,
});
const INVALID_HTTP_RESPONSE = Object.freeze({ kind: "invalid" as const });

type InspectedRecord = {
  readonly values: ReadonlyMap<string, unknown>;
};

export function parseFounderAnalyticsWindow(
  requestUrl: string,
): FounderAnalyticsWindow | null {
  let url: URL;
  try {
    url = new URL(requestUrl);
  } catch {
    return null;
  }

  const entries = Array.from(url.searchParams.entries());
  if (entries.length !== 1 || entries[0][0] !== "window") return null;
  const value = entries[0][1];
  return FOUNDER_ANALYTICS_WINDOWS.includes(value as FounderAnalyticsWindow)
    ? value as FounderAnalyticsWindow
    : null;
}

export function parseExactBearerToken(header: string | null): string | null {
  if (header === null) return null;
  const match = /^Bearer ([^\s]+)$/.exec(header);
  return match?.[1] ?? null;
}

export function parseFounderAnalyticsRpcResult(
  value: unknown,
): FounderAnalyticsAggregate | null {
  try {
    const rowValue = inspectSingleElementArray(value);
    if (rowValue === null) return null;
    const row = inspectExactRecord(rowValue, ["summary"]);
    if (!row) return null;
    return parseAggregate(row.values.get("summary"));
  } catch {
    return null;
  }
}

export function parseFounderAnalyticsHttpResponse(
  httpStatus: number,
  body: unknown,
): FounderAnalyticsHttpResponse {
  try {
    if (!Number.isInteger(httpStatus)) return INVALID_HTTP_RESPONSE;
    if (httpStatus === 200) {
      const response = inspectExactRecord(body, ["ok", "code", "summary"]);
      if (!response || response.values.get("ok") !== true ||
          response.values.get("code") !== "aggregate_summary") {
        return INVALID_HTTP_RESPONSE;
      }
      const summary = parseSummary(response.values.get("summary"));
      return summary
        ? Object.freeze({ kind: "success", status: 200, summary })
        : INVALID_HTTP_RESPONSE;
    }

    const response = inspectExactRecord(body, ["ok", "code"]);
    if (!response || response.values.get("ok") !== false) {
      return INVALID_HTTP_RESPONSE;
    }
    const code = response.values.get("code");
    if (!isFailureCode(code) || FAILURE_STATUS_BY_CODE[code] !== httpStatus) {
      return INVALID_HTTP_RESPONSE;
    }
    return Object.freeze({ kind: "failure", status: httpStatus, code });
  } catch {
    return INVALID_HTTP_RESPONSE;
  }
}

export function buildFounderAnalyticsSummary(
  aggregate: FounderAnalyticsAggregate,
): FounderAnalyticsSummary {
  const feedbackFailures = sumCounts(
    aggregate.operation_error_counts.feedback_persistence,
  );
  return Object.freeze({
    ...aggregate,
    observed_event_ratios: Object.freeze({
      resume_analysis_failure: observedRatio(
        aggregate.event_counts.resume_analysis_failed,
        aggregate.event_counts.resume_analysis_started,
      ),
      jd_match_completion: observedRatio(
        aggregate.event_counts.jd_match_completed,
        aggregate.event_counts.jd_match_started,
      ),
      feedback_persistence_failure: observedRatio(
        feedbackFailures,
        aggregate.event_counts.feedback_persisted + feedbackFailures,
      ),
    }),
  });
}

function parseSummary(value: unknown): FounderAnalyticsSummary | null {
  const summary = inspectExactRecord(value, SUMMARY_KEYS);
  if (!summary) return null;

  const aggregateCandidate: Record<string, unknown> = {};
  for (const key of AGGREGATE_KEYS) {
    aggregateCandidate[key] = summary.values.get(key);
  }
  const aggregate = parseAggregate(aggregateCandidate);
  if (!aggregate) return null;

  const ratioRecord = inspectExactRecord(
    summary.values.get("observed_event_ratios"),
    RATIO_KEYS,
  );
  if (!ratioRecord) return null;
  const expected = buildFounderAnalyticsSummary(aggregate);

  for (const key of RATIO_KEYS) {
    const parsed = parseObservedRatio(ratioRecord.values.get(key));
    const expectedRatio = expected.observed_event_ratios[key];
    if (!parsed || parsed.numerator !== expectedRatio.numerator ||
        parsed.denominator !== expectedRatio.denominator ||
        parsed.ratio !== expectedRatio.ratio) {
      return null;
    }
  }
  return expected;
}

function parseAggregate(value: unknown): FounderAnalyticsAggregate | null {
  try {
    const aggregate = inspectExactRecord(value, AGGREGATE_KEYS);
    if (!aggregate) return null;
    if (aggregate.values.get("contract_version") !==
        FOUNDER_ANALYTICS_CONTRACT_VERSION) return null;

    const asOfValue = aggregate.values.get("as_of");
    const windowStartValue = aggregate.values.get("window_start");
    const windowEndValue = aggregate.values.get("window_end");
    const lastReceivedValue = aggregate.values.get("last_received_at");
    if (!isStrictTimestamp(asOfValue) ||
        !isStrictTimestamp(windowStartValue) ||
        !isStrictTimestamp(windowEndValue) ||
        windowEndValue !== asOfValue) return null;
    if (lastReceivedValue !== null && !isStrictTimestamp(lastReceivedValue)) {
      return null;
    }

    const windowNameValue = aggregate.values.get("window_name");
    const environmentValue = aggregate.values.get("canonical_environment");
    const totalEventCount = aggregate.values.get("total_event_count");
    const retentionOverdueCount = aggregate.values.get("retention_overdue_count");
    if (!FOUNDER_ANALYTICS_WINDOWS.includes(
      windowNameValue as FounderAnalyticsWindow,
    )) return null;
    if (!ANALYTICS_ENVIRONMENTS.includes(
      environmentValue as AnalyticsEnvironment,
    )) return null;
    if (!isSafeCount(totalEventCount) || !isSafeCount(retentionOverdueCount)) {
      return null;
    }

    const eventCounts = parseCountRecord(
      aggregate.values.get("event_counts"),
      ANALYTICS_EVENT_NAMES,
    );
    const feedbackCounts = parseCountRecord(
      aggregate.values.get("feedback_persistence_counts"),
      ANALYTICS_FEEDBACK_PERSISTENCE_PATHS,
    );
    const operationCountsRecord = inspectExactRecord(
      aggregate.values.get("operation_error_counts"),
      ANALYTICS_PRODUCT_OPERATIONS,
    );
    if (!eventCounts || !feedbackCounts || !operationCountsRecord) return null;

    const operationErrorCounts = {} as Record<
      AnalyticsProductOperation,
      Readonly<Record<AnalyticsOperationErrorCode, number>>
    >;
    for (const operation of ANALYTICS_PRODUCT_OPERATIONS) {
      const parsed = parseCountRecord(
        operationCountsRecord.values.get(operation),
        ANALYTICS_OPERATION_ERROR_CODES,
      );
      if (!parsed) return null;
      operationErrorCounts[operation] = parsed;
    }

    if (sumCounts(eventCounts) !== totalEventCount) return null;
    if (sumCounts(feedbackCounts) !== eventCounts.feedback_persisted) return null;
    if (Object.values(operationErrorCounts).reduce(
      (total, counts) => total + sumCounts(counts),
      0,
    ) !== eventCounts.product_operation_failed) return null;

    const asOf = Date.parse(asOfValue);
    const windowStart = Date.parse(windowStartValue);
    const durations: Record<FounderAnalyticsWindow, number> = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 168 * 60 * 60 * 1000,
      "30d": 720 * 60 * 60 * 1000,
    };
    const windowName = windowNameValue as FounderAnalyticsWindow;
    if (asOf - windowStart !== durations[windowName]) return null;
    if ((totalEventCount === 0) !== (lastReceivedValue === null)) return null;
    if (lastReceivedValue !== null) {
      const lastReceived = Date.parse(lastReceivedValue);
      if (lastReceived < windowStart || lastReceived >= asOf) return null;
    }

    return Object.freeze({
      contract_version: FOUNDER_ANALYTICS_CONTRACT_VERSION,
      as_of: asOfValue,
      window_name: windowName,
      window_start: windowStartValue,
      window_end: windowEndValue,
      canonical_environment: environmentValue as AnalyticsEnvironment,
      total_event_count: totalEventCount,
      last_received_at: lastReceivedValue,
      event_counts: eventCounts,
      operation_error_counts: Object.freeze(operationErrorCounts),
      feedback_persistence_counts: feedbackCounts,
      retention_overdue_count: retentionOverdueCount,
    });
  } catch {
    return null;
  }
}

function parseObservedRatio(value: unknown): ObservedEventRatio | null {
  const ratio = inspectExactRecord(value, RATIO_VALUE_KEYS);
  if (!ratio) return null;
  const numerator = ratio.values.get("numerator");
  const denominator = ratio.values.get("denominator");
  const ratioValue = ratio.values.get("ratio");
  if (!isSafeCount(numerator) || !isSafeCount(denominator)) return null;
  if (denominator === 0) {
    return ratioValue === null
      ? Object.freeze({ numerator, denominator, ratio: null })
      : null;
  }
  if (typeof ratioValue !== "number" || !Number.isFinite(ratioValue) ||
      ratioValue < 0 || ratioValue !== numerator / denominator) return null;
  return Object.freeze({ numerator, denominator, ratio: ratioValue });
}

function observedRatio(
  numerator: number,
  denominator: number,
): ObservedEventRatio {
  return Object.freeze({
    numerator,
    denominator,
    ratio: denominator === 0 ? null : numerator / denominator,
  });
}

function inspectExactRecord(
  value: unknown,
  keys: readonly string[],
): InspectedRecord | null {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const prototype = Reflect.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return null;
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== "string")) return null;
    const stringKeys = ownKeys as string[];
    if (stringKeys.length !== keys.length ||
        keys.some((key) => !stringKeys.includes(key))) return null;

    const values = new Map<string, unknown>();
    for (const key of stringKeys) {
      const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
      if (!descriptor || !("value" in descriptor) || !descriptor.enumerable) {
        return null;
      }
      values.set(key, descriptor.value);
    }
    for (const key in value) {
      if (!values.has(key)) return null;
    }
    return { values };
  } catch {
    return null;
  }
}

function inspectSingleElementArray(value: unknown): unknown | null {
  try {
    if (!Array.isArray(value) || Reflect.getPrototypeOf(value) !== Array.prototype) {
      return null;
    }
    const keys = Reflect.ownKeys(value);
    if (keys.length !== 2 || !keys.includes("0") || !keys.includes("length")) {
      return null;
    }
    const length = Reflect.getOwnPropertyDescriptor(value, "length");
    const element = Reflect.getOwnPropertyDescriptor(value, "0");
    if (!length || !("value" in length) || length.value !== 1 ||
        !element || !("value" in element) || !element.enumerable) return null;
    return element.value;
  } catch {
    return null;
  }
}

function parseCountRecord<const Keys extends readonly string[]>(
  value: unknown,
  keys: Keys,
): Readonly<Record<Keys[number], number>> | null {
  const record = inspectExactRecord(value, keys);
  if (!record) return null;
  const normalized = {} as Record<Keys[number], number>;
  for (const key of keys) {
    const count = record.values.get(key);
    if (!isSafeCount(count)) return null;
    normalized[key as Keys[number]] = count;
  }
  return Object.freeze(normalized);
}

function isFailureCode(value: unknown): value is FounderAnalyticsFailureCode {
  return typeof value === "string" &&
    Object.prototype.hasOwnProperty.call(FAILURE_STATUS_BY_CODE, value);
}

function isSafeCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isStrictTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || !STRICT_UTC_TIMESTAMP.test(value)) {
    return false;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function sumCounts(value: Readonly<Record<string, number>>): number {
  let total = 0;
  for (const count of Object.values(value)) {
    total += count;
    if (!Number.isSafeInteger(total)) return Number.MAX_SAFE_INTEGER + 1;
  }
  return total;
}
