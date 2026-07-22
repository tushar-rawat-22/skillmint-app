const FIXED_WINDOW_MILLISECONDS = 60_000;
const PRE_AUTH_REQUEST_LIMIT = 60;
const FOUNDER_QUERY_LIMIT = 10;

export type ProcessLocalPreAuthLimiter = {
  tryConsume(nowMilliseconds: number): boolean;
};

export type FounderQueryLease =
  | { readonly ok: false; readonly reason: "rate" | "concurrent" }
  | { readonly ok: true; release(): void };

export type FounderDashboardLimiter = {
  tryAcquire(nowMilliseconds: number): FounderQueryLease;
};

export function createProcessLocalPreAuthLimiter(): ProcessLocalPreAuthLimiter {
  let windowStartedAt: number | null = null;
  let requestCount = 0;

  return Object.freeze({
    tryConsume(nowMilliseconds: number): boolean {
      if (!isValidClockValue(nowMilliseconds)) return false;
      if (windowStartedAt !== null && nowMilliseconds < windowStartedAt) {
        return false;
      }
      if (windowStartedAt === null ||
          nowMilliseconds >= windowStartedAt + FIXED_WINDOW_MILLISECONDS) {
        windowStartedAt = nowMilliseconds;
        requestCount = 0;
      }
      if (requestCount >= PRE_AUTH_REQUEST_LIMIT) return false;
      requestCount += 1;
      return true;
    },
  });
}

export function createProcessLocalFounderDashboardLimiter(): FounderDashboardLimiter {
  let windowStartedAt: number | null = null;
  let requestCount = 0;
  let queryInFlight = false;

  return Object.freeze({
    tryAcquire(nowMilliseconds: number): FounderQueryLease {
      if (!isValidClockValue(nowMilliseconds)) {
        return { ok: false, reason: "rate" };
      }
      if (windowStartedAt !== null && nowMilliseconds < windowStartedAt) {
        return { ok: false, reason: "rate" };
      }
      if (windowStartedAt === null ||
          nowMilliseconds >= windowStartedAt + FIXED_WINDOW_MILLISECONDS) {
        windowStartedAt = nowMilliseconds;
        requestCount = 0;
      }
      if (requestCount >= FOUNDER_QUERY_LIMIT) {
        return { ok: false, reason: "rate" };
      }
      requestCount += 1;
      if (queryInFlight) return { ok: false, reason: "concurrent" };

      queryInFlight = true;
      let released = false;
      return {
        ok: true,
        release() {
          if (released) return;
          released = true;
          queryInFlight = false;
        },
      };
    },
  });
}

function isValidClockValue(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}
