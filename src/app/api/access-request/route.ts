import "server-only";

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

import {
  createSupabaseAdminClient,
  SupabaseAdminConfigurationError,
} from "@/lib/supabase/admin";
import { getTrustedAppOrigin } from "@/lib/supabase/config";

const MAX_BODY_BYTES = 768;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1_000;
const RATE_LIMIT_MAX_REQUESTS = 5;
const rateLimits = new Map<string, { count: number; resetAt: number }>();

type AccessIntent = "CANDIDATE" | "RECRUITER";
type AccessRequest = {
  readonly email: string;
  readonly intent: AccessIntent;
  readonly website: string;
};

export async function POST(request: Request) {
  if (!isAllowedOrigin(request)) return jsonError("invalid_origin", 403);

  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim();
  const contentLength = Number(request.headers.get("content-length"));
  if (contentType !== "application/json") return jsonError("unsupported_media_type", 415);
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return jsonError("request_too_large", 413);
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return jsonError("invalid_request", 400);
  }
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    return jsonError("request_too_large", 413);
  }

  const payload = parseAccessRequest(text);
  if (!payload) return jsonError("invalid_request", 400);

  // A filled honeypot is acknowledged without persistence so simple bots cannot
  // use response differences to tune around the trap.
  if (payload.website.length > 0) {
    return acceptedResponse();
  }

  const limiter = consumeRateLimit(clientKey(request));
  if (!limiter.allowed) {
    return jsonError("rate_limited", 429, {
      "retry-after": String(Math.max(1, Math.ceil((limiter.resetAt - Date.now()) / 1_000))),
    });
  }

  const requestKey = createHash("sha256")
    .update(`${payload.intent}\0${payload.email}`, "utf8")
    .digest("hex");

  try {
    const admin = createSupabaseAdminClient();
    const table = admin.from("access_requests" as never);
    const existing = await table
      .select("id,status")
      .eq("request_key", requestKey)
      .limit(1);

    if (existing.error) return jsonError("temporarily_unavailable", 503);
    if (Array.isArray(existing.data) && existing.data.length === 1) {
      // Duplicate state is intentionally indistinguishable from a newly accepted
      // request so the public endpoint cannot be used to enumerate email intent.
      return acceptedResponse();
    }

    const created = await table
      .insert({
        email: payload.email,
        intent: payload.intent,
        request_key: requestKey,
      } as never)
      .select("id,status")
      .limit(1);

    if (created.error) {
      if (created.error.code === "23505") {
        return acceptedResponse();
      }
      return jsonError("temporarily_unavailable", 503);
    }
    if (!Array.isArray(created.data) || created.data.length !== 1) {
      return jsonError("temporarily_unavailable", 503);
    }

    return acceptedResponse();
  } catch (error) {
    return error instanceof SupabaseAdminConfigurationError
      ? jsonError("not_configured", 503)
      : jsonError("temporarily_unavailable", 503);
  }
}

function acceptedResponse() {
  return jsonResponse({ status: "received" }, 202);
}

function parseAccessRequest(text: string): AccessRequest | null {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(value) || !hasExactKeys(value, ["email", "intent", "website"])) {
    return null;
  }
  if (value.intent !== "CANDIDATE" && value.intent !== "RECRUITER") return null;
  if (typeof value.email !== "string" || typeof value.website !== "string") return null;

  const email = value.email.trim().toLowerCase();
  const website = value.website.trim();
  if (!isValidEmail(email) || website.length > 200) return null;

  return { email, intent: value.intent, website };
}

function isValidEmail(value: string) {
  return value.length >= 3 &&
    value.length <= 254 &&
    !/[\u0000-\u0020\u007f]/u.test(value) &&
    /^[^@]+@[^@]+\.[^@]+$/u.test(value);
}

function isAllowedOrigin(request: Request) {
  const appOrigin = getTrustedAppOrigin();
  const origin = request.headers.get("origin");
  if (!appOrigin || !origin || origin !== appOrigin) return false;
  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === null || fetchSite === "same-origin";
}

function clientKey(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim();
  const candidate = forwarded && forwarded.length <= 64 ? forwarded : "unknown";
  return createHash("sha256").update(candidate, "utf8").digest("hex");
}

function consumeRateLimit(key: string) {
  const now = Date.now();
  if (rateLimits.size > 2_000) {
    for (const [entryKey, entry] of rateLimits) {
      if (entry.resetAt <= now) rateLimits.delete(entryKey);
    }
  }

  const current = rateLimits.get(key);
  if (!current || current.resetAt <= now) {
    const resetAt = now + RATE_LIMIT_WINDOW_MS;
    rateLimits.set(key, { count: 1, resetAt });
    return { allowed: true, resetAt } as const;
  }
  if (current.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { allowed: false, resetAt: current.resetAt } as const;
  }
  current.count += 1;
  return { allowed: true, resetAt: current.resetAt } as const;
}

function jsonResponse(body: unknown, status: number, extraHeaders: HeadersInit = {}) {
  return NextResponse.json(body, {
    status,
    headers: {
      "cache-control": "no-store",
      ...Object.fromEntries(new Headers(extraHeaders).entries()),
    },
  });
}

function jsonError(code: string, status: number, extraHeaders: HeadersInit = {}) {
  return jsonResponse(
    { code, message: "The access request could not be completed." },
    status,
    extraHeaders,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]) {
  return Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
}
