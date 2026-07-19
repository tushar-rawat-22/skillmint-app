import type { AnalyticsEvent } from "./eventContract";
import type { AnalyticsSink } from "./sink";

export interface MemoryAnalyticsSinkOptions {
  readonly failOnce?: boolean;
}

export class MemoryAnalyticsSink implements AnalyticsSink {
  readonly #events: AnalyticsEvent[] = [];
  #failNextWrite: boolean;

  constructor(options: MemoryAnalyticsSinkOptions = {}) {
    this.#failNextWrite = options.failOnce === true;
  }

  write(event: AnalyticsEvent): void {
    if (this.#failNextWrite) {
      this.#failNextWrite = false;
      throw new Error("memory_sink_failure");
    }

    this.#events.push(cloneImmutableEvent(event));
  }

  snapshot(): readonly AnalyticsEvent[] {
    return Object.freeze(this.#events.map(cloneImmutableEvent));
  }
}

function cloneImmutableEvent(event: AnalyticsEvent): AnalyticsEvent {
  const properties = Object.freeze({ ...event.properties });
  return Object.freeze({ ...event, properties }) as AnalyticsEvent;
}
