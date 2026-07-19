import type { AnalyticsEvent } from "./eventContract";

export interface AnalyticsSink {
  write(event: AnalyticsEvent): void | Promise<void>;
}

export const noOpAnalyticsSink: AnalyticsSink = Object.freeze({
  write(): void {},
});
