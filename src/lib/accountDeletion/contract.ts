export const ACCOUNT_DELETE_CONFIRMATION = "DELETE MY ACCOUNT";
export const ACCOUNT_DELETE_MAX_BODY_BYTES = 256;
export const ACCOUNT_DELETE_MAX_BEARER_BYTES = 8_192;

const CLIENT_IDENTITY_FIELDS = [
  "userId",
  "user_id",
  "email",
  "ownerId",
  "accountId",
] as const;

export type AccountDeleteRequestBody = {
  confirmation?: unknown;
};

export type AccountDeleteRequestErrorCode =
  | "method_not_allowed"
  | "unsupported_media_type"
  | "request_too_large"
  | "invalid_request";

export function validateAccountDeleteRequestMetadata({
  method,
  contentType,
  contentLength,
}: {
  method: string;
  contentType: string | null;
  contentLength: string | null;
}): { ok: true } | { ok: false; code: AccountDeleteRequestErrorCode } {
  if (method !== "POST") return { ok: false, code: "method_not_allowed" };
  if (getMediaType(contentType ?? "") !== "application/json") {
    return { ok: false, code: "unsupported_media_type" };
  }
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) return { ok: false, code: "invalid_request" };
    if (Number(contentLength) > ACCOUNT_DELETE_MAX_BODY_BYTES) {
      return { ok: false, code: "request_too_large" };
    }
  }
  return { ok: true };
}

export function parseAccountDeleteRequestText(
  text: string,
):
  | { ok: true; data: { confirmation: string } }
  | { ok: false; code: "request_too_large" | "invalid_request" } {
  if (new TextEncoder().encode(text).byteLength > ACCOUNT_DELETE_MAX_BODY_BYTES) {
    return { ok: false, code: "request_too_large" };
  }

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return { ok: false, code: "invalid_request" };
  }

  const result = validateAccountDeleteRequestBody(body);
  return result.ok
    ? result
    : { ok: false, code: "invalid_request" };
}

export function validateAccountDeleteRequestBody(
  body: unknown,
): { ok: true; data: { confirmation: string } } | { ok: false; error: string } {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { ok: false, error: "Invalid request body." };
  }

  const data = body as AccountDeleteRequestBody;

  if (CLIENT_IDENTITY_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(data, field)
  )) {
    return {
      ok: false,
      error: "Client-supplied user identity is not accepted.",
    };
  }

  if (Object.keys(data).some((key) => key !== "confirmation")) {
    return { ok: false, error: "Invalid request body." };
  }

  if (data.confirmation !== ACCOUNT_DELETE_CONFIRMATION) {
    return { ok: false, error: "Type DELETE MY ACCOUNT to confirm." };
  }

  return {
    ok: true,
    data: { confirmation: data.confirmation },
  };
}

export function getBearerToken(authorizationHeader: string | null): string | null {
  if (
    !authorizationHeader ||
    new TextEncoder().encode(authorizationHeader).byteLength >
      ACCOUNT_DELETE_MAX_BEARER_BYTES
  ) return null;
  const match = /^Bearer ([^\s]+)$/.exec(authorizationHeader ?? "");

  return match ? match[1] : null;
}

function getMediaType(contentType: string): string {
  return contentType.split(";", 1)[0].trim().toLowerCase();
}

export function isAllowedAccountDeletionOrigin({
  requestUrl,
  origin,
  trustedAppOrigin,
}: {
  requestUrl: string;
  origin: string | null;
  trustedAppOrigin: string | null;
}): boolean {
  if (!origin) {
    return true;
  }

  try {
    const requestOrigin = new URL(requestUrl).origin;
    const allowedOrigins = trustedAppOrigin
      ? [requestOrigin, trustedAppOrigin]
      : [requestOrigin];

    return allowedOrigins.includes(origin);
  } catch {
    return false;
  }
}
