import type { AnalyticsEvent } from "./eventContract";
import type { AnalyticsSink } from "./sink";

export const ANALYTICS_INGESTION_PATH = "/api/analytics/events";
export const ANALYTICS_HTTP_TIMEOUT_MS = 2_500;

type AnalyticsFetch = (
  input: string,
  init: RequestInit,
) => Promise<Pick<Response, "ok">>;

export interface HttpAnalyticsSinkOptions {
  readonly fetchImpl?: AnalyticsFetch;
  readonly timeoutMs?: number;
  readonly scheduleTimeout?: (callback: () => void, delayMs: number) => unknown;
  readonly cancelTimeout?: (handle: unknown) => void;
}

export function createHttpAnalyticsSink(
  options: HttpAnalyticsSinkOptions = {},
): AnalyticsSink {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const timeoutMs = options.timeoutMs ?? ANALYTICS_HTTP_TIMEOUT_MS;
  const scheduleTimeout = options.scheduleTimeout ??
    ((callback, delayMs) => globalThis.setTimeout(callback, delayMs));
  const cancelTimeout = options.cancelTimeout ??
    ((handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>));

  return Object.freeze({
    async write(event: AnalyticsEvent): Promise<void> {
      const controller = new AbortController();
      const timeoutHandle = scheduleTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetchImpl(ANALYTICS_INGESTION_PATH, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(event),
          signal: controller.signal,
          credentials: "same-origin",
          cache: "no-store",
          redirect: "error",
          referrerPolicy: "no-referrer",
        });

        if (!response.ok) {
          throw new Error("analytics_sink_rejected");
        }
      } finally {
        cancelTimeout(timeoutHandle);
      }
    },
  });
}
