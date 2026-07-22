import { NextResponse } from "next/server";

import { MAX_ANALYTICS_EVENT_BYTES } from "@/platform/analytics/eventContract";
import { validateAnalyticsEvent } from "@/platform/analytics/eventValidation";
import {
  canonicalizeAnalyticsEvent,
  getServerAnalyticsContext,
  type ServerAnalyticsContext,
} from "./normalization";
import type {
  AnalyticsPersistenceResult,
} from "@/modules/analytics/services/analyticsEventRepository";

export type AnalyticsIngestionCode =
  | "accepted"
  | "invalid_method"
  | "invalid_origin"
  | "unsupported_media_type"
  | "request_too_large"
  | "invalid_event"
  | "not_configured"
  | "schema_unavailable"
  | "network_failure"
  | "temporarily_unavailable";

export interface AnalyticsIngestionDependencies {
  readonly enabled: boolean;
  readonly persist: (
    event: Parameters<typeof canonicalizeAnalyticsEvent>[0],
  ) => Promise<AnalyticsPersistenceResult>;
  readonly serverContext?: ServerAnalyticsContext;
}

export async function handleAnalyticsPost(
  request: Request,
  dependencies: AnalyticsIngestionDependencies,
): Promise<NextResponse> {
  if (request.method !== "POST") return response(false, "invalid_method", 405);
  if (!isSameOriginRequest(request)) return response(false, "invalid_origin", 403);
  if (!isJsonContentType(request.headers.get("content-type"))) {
    return response(false, "unsupported_media_type", 415);
  }
  if (!dependencies.enabled) {
    return response(false, "not_configured", 503);
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^[0-9]+$/.test(contentLength)) {
      return response(false, "invalid_event", 400);
    }
    const length = Number(contentLength);
    if (!Number.isSafeInteger(length) || length < 0) {
      return response(false, "invalid_event", 400);
    }
    if (length > MAX_ANALYTICS_EVENT_BYTES) {
      return response(false, "request_too_large", 413);
    }
  }

  const body = await readBoundedBody(request);
  if (!body.ok) {
    return body.code === "request_too_large"
      ? response(false, body.code, 413)
      : response(false, body.code, 400);
  }

  let candidate: unknown;
  try {
    candidate = JSON.parse(body.text);
  } catch {
    return response(false, "invalid_event", 400);
  }

  const clientValidation = validateAnalyticsEvent(candidate);
  if (!clientValidation.ok) return response(false, "invalid_event", 400);

  const canonicalEvent = canonicalizeAnalyticsEvent(
    clientValidation.event,
    dependencies.serverContext ?? getServerAnalyticsContext(),
  );
  if (!canonicalEvent) return response(false, "invalid_event", 400);

  let persistence: AnalyticsPersistenceResult;
  try {
    persistence = await dependencies.persist(canonicalEvent);
  } catch {
    return response(false, "temporarily_unavailable", 503);
  }

  if (persistence.ok) return response(true, "accepted", 202);
  if (persistence.code === "invalid_event") {
    return response(false, "invalid_event", 400);
  }
  return response(false, persistence.code, 503);
}

type BoundedBodyResult =
  | { readonly ok: true; readonly text: string }
  | {
      readonly ok: false;
      readonly code: "invalid_event" | "request_too_large";
    };

async function readBoundedBody(request: Request): Promise<BoundedBodyResult> {
  if (!request.body) return { ok: false, code: "invalid_event" };

  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = request.body.getReader();
  } catch {
    return { ok: false, code: "invalid_event" };
  }

  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      let result: ReadableStreamReadResult<Uint8Array>;
      try {
        result = await reader.read();
      } catch {
        return { ok: false, code: "invalid_event" };
      }

      if (result.done) break;
      if (!(result.value instanceof Uint8Array)) {
        return { ok: false, code: "invalid_event" };
      }

      totalBytes += result.value.byteLength;
      if (totalBytes > MAX_ANALYTICS_EVENT_BYTES) {
        try {
          await reader.cancel();
        } catch {
          // Cancellation is best effort; the fixed oversized response wins.
        }
        return { ok: false, code: "request_too_large" };
      }

      chunks.push(result.value);
    }
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // A disturbed or implementation-specific stream must not leak details.
    }
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return {
      ok: true,
      text: new TextDecoder("utf-8", { fatal: true }).decode(bytes),
    };
  } catch {
    return { ok: false, code: "invalid_event" };
  }
}

function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  try {
    if (new URL(origin).origin !== origin) return false;
    if (origin !== new URL(request.url).origin) return false;
  } catch {
    return false;
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite === null || fetchSite === "same-origin";
}

function isJsonContentType(contentType: string | null): boolean {
  return contentType?.split(";", 1)[0].trim().toLowerCase() === "application/json";
}

function response(
  ok: boolean,
  code: AnalyticsIngestionCode,
  status: number,
): NextResponse {
  return NextResponse.json({ ok, code }, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
}
