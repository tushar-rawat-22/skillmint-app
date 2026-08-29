import { NextResponse } from "next/server";

import { extractResumeTextFromBuffer } from "@/lib/pdf/extractResumeBuffer";
import {
  RESUME_EXTRACTION_ERRORS,
  RESUME_UPLOAD_LIMITS,
  ResumeExtractionError,
  type ResumeExtractionErrorCode,
  validateResumeFileMetadata,
} from "@/lib/resume/resumeUploadContract";
import {
  verifyBearerAuthorization,
  type ServerAuthorizationResult,
} from "@/lib/supabase/serverAuth";
import { getAccountPersona } from "@/modules/accountPersona";

export const runtime = "nodejs";

const EXTRACTION_RESPONSE_HEADERS = {
  "Cache-Control":
    "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
} as const;

type ResumeRequestVerifier = (
  authorization: string | null,
) => Promise<ServerAuthorizationResult>;

type AuthenticatedServerAuthorization = Extract<
  ServerAuthorizationResult,
  { readonly status: "authenticated" }
>;

export async function POST(request: Request) {
  const authorization = await authorizeResumeRequest(
    request,
    verifyBearerAuthorization,
  );
  if (authorization instanceof Response) {
    return authorization;
  }

  const persona = await getAccountPersona(authorization.userId);
  if (persona.status === "unavailable") {
    return errorResponse("authentication_unavailable");
  }
  if (persona.status !== "resolved" || persona.persona !== "CANDIDATE") {
    return errorResponse("candidate_persona_required");
  }

  return handleAuthenticatedResumeExtraction(request);
}

// Deterministic route-contract seam used by the launch-hardening fixtures.
// Next.js serves POST above; production requests cannot bypass persona authority.
export async function handleResumeExtraction(
  request: Request,
  verifyRequest: ResumeRequestVerifier,
) {
  const authorization = await authorizeResumeRequest(request, verifyRequest);
  if (authorization instanceof Response) {
    return authorization;
  }
  return handleAuthenticatedResumeExtraction(request);
}

async function authorizeResumeRequest(
  request: Request,
  verifyRequest: ResumeRequestVerifier,
): Promise<AuthenticatedServerAuthorization | Response> {
  const originError = getOriginError(request);
  if (originError) {
    return errorResponse(originError);
  }

  const authorization = await verifyRequest(
    request.headers.get("authorization"),
  );
  if (authorization.status !== "authenticated") {
    return errorResponse(
      authorization.status === "not_configured" ||
          authorization.status === "temporarily_unavailable"
        ? "authentication_unavailable"
        : "authentication_required",
    );
  }
  return authorization;
}

async function handleAuthenticatedResumeExtraction(request: Request) {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    const parsedLength = Number(contentLength);
    if (
      !Number.isSafeInteger(parsedLength) ||
      parsedLength < 0
    ) {
      return errorResponse("malformed_request");
    }
    if (parsedLength > RESUME_UPLOAD_LIMITS.maxMultipartBytes) {
      return errorResponse("file_too_large");
    }
  }

  let formData: FormData;
  try {
    const body = await readBoundedBody(request);
    const boundedRequest = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body,
    });
    formData = await boundedRequest.formData();
  } catch (error) {
    if (error instanceof ResumeExtractionError) {
      return errorResponse(error.code);
    }
    return errorResponse("malformed_request");
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return errorResponse("missing_file");
  }

  try {
    const fileType = validateResumeFileMetadata({
      name: file.name,
      size: file.size,
      mimeType: file.type,
    });
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.byteLength !== file.size) {
      throw new ResumeExtractionError("malformed_request");
    }
    const extractedText = await extractResumeTextFromBuffer(
      buffer,
      fileType,
    );

    return jsonResponse({ extractedText });
  } catch (error) {
    return error instanceof ResumeExtractionError
      ? errorResponse(error.code)
      : errorResponse("extraction_failed");
  }
}

async function readBoundedBody(request: Request): Promise<ArrayBuffer> {
  if (!request.body) {
    throw new ResumeExtractionError("malformed_request");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      totalBytes += value.byteLength;
      if (totalBytes > RESUME_UPLOAD_LIMITS.maxMultipartBytes) {
        throw new ResumeExtractionError("file_too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (totalBytes === 0) {
    throw new ResumeExtractionError("malformed_request");
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body.buffer as ArrayBuffer;
}

function getOriginError(
  request: Request,
): ResumeExtractionErrorCode | null {
  const fetchSite = request.headers.get("sec-fetch-site")
    ?.trim()
    .toLowerCase();
  if (fetchSite === "cross-site") {
    return "cross_origin_request";
  }

  const origin = request.headers.get("origin");
  if (origin !== null) {
    try {
      const parsedOrigin = new URL(origin);
      const suppliedOrigin = parsedOrigin.origin;
      if (
        !["http:", "https:"].includes(parsedOrigin.protocol) ||
        parsedOrigin.username ||
        parsedOrigin.password ||
        parsedOrigin.pathname !== "/" ||
        parsedOrigin.search ||
        parsedOrigin.hash ||
        suppliedOrigin !== origin
      ) {
        return "cross_origin_request";
      }
      if (!getRequestOrigins(request).has(suppliedOrigin)) {
        return "cross_origin_request";
      }
    } catch {
      return "cross_origin_request";
    }
  }

  return null;
}

function getRequestOrigins(request: Request): Set<string> {
  const requestUrl = new URL(request.url);
  const origins = new Set([requestUrl.origin]);
  const hostOrigin = getStrictHostOrigin(
    request.headers.get("host"),
    requestUrl.protocol,
  );
  if (hostOrigin) {
    origins.add(hostOrigin);
  }

  return origins;
}

function getStrictHostOrigin(
  host: string | null,
  protocol: string,
): string | null {
  if (
    !host ||
    !["http:", "https:"].includes(protocol) ||
    host.length > 255 ||
    /[\u0000-\u0020\u007f@,\/\\?#]/u.test(host)
  ) {
    return null;
  }

  try {
    const parsed = new URL(`${protocol}//${host}`);
    if (
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash ||
      parsed.host.toLowerCase() !== host.toLowerCase()
    ) {
      return null;
    }
    return parsed.origin;
  } catch {
    return null;
  }
}

function errorResponse(code: ResumeExtractionErrorCode) {
  const contract = RESUME_EXTRACTION_ERRORS[code];
  return jsonResponse(
    {
      code,
      message: contract.message,
    },
    contract.status,
  );
}

function jsonResponse(
  body: object,
  status = 200,
) {
  return NextResponse.json(body, {
    status,
    headers: EXTRACTION_RESPONSE_HEADERS,
  });
}
