export const RECENT_AUTH_MAX_AGE_SECONDS = 10 * 60;
export const RECENT_AUTH_FUTURE_SKEW_SECONDS = 30;

export type RecentAuthenticationFailureCode =
  | "missing"
  | "malformed"
  | "stale"
  | "future"
  | "unsupported_method"
  | "account_mismatch";

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3 || !parts[1] || !/^[A-Za-z0-9_-]+$/.test(parts[1])) {
      return null;
    }
    const payload: unknown = JSON.parse(
      Buffer.from(parts[1], "base64url").toString("utf8"),
    );
    return isRecord(payload) ? payload : null;
  } catch {
    return null;
  }
}

export function validateRecentAuthentication({
  claims,
  validatedUserId,
  provider,
  nowSeconds,
}: {
  claims: unknown;
  validatedUserId: string;
  provider: unknown;
  nowSeconds: number;
}):
  | { ok: true; authenticatedAt: number }
  | { ok: false; code: RecentAuthenticationFailureCode } {
  if (!isRecord(claims) || !Number.isInteger(nowSeconds)) {
    return { ok: false, code: "malformed" };
  }
  if (claims.sub !== validatedUserId) {
    return { ok: false, code: "account_mismatch" };
  }
  if (provider !== "email") {
    return { ok: false, code: "unsupported_method" };
  }
  if (!Array.isArray(claims.amr) || claims.amr.length === 0) {
    return { ok: false, code: "missing" };
  }

  const entries: Array<{ method: string; timestamp: number }> = [];
  for (const entry of claims.amr) {
    if (
      !isRecord(entry) ||
      typeof entry.method !== "string" ||
      !entry.method ||
      !Number.isInteger(entry.timestamp)
    ) return { ok: false, code: "malformed" };
    entries.push({ method: entry.method, timestamp: Number(entry.timestamp) });
  }

  const relevant = entries
    .filter((entry) => entry.method === "password" || entry.method === "email")
    .sort((left, right) => right.timestamp - left.timestamp);
  if (!relevant.length) return { ok: false, code: "unsupported_method" };

  const authenticatedAt = relevant[0].timestamp;
  if (authenticatedAt > nowSeconds + RECENT_AUTH_FUTURE_SKEW_SECONDS) {
    return { ok: false, code: "future" };
  }
  if (nowSeconds - authenticatedAt > RECENT_AUTH_MAX_AGE_SECONDS) {
    return { ok: false, code: "stale" };
  }
  return { ok: true, authenticatedAt };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
