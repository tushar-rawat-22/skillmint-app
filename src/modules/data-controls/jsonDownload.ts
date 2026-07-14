export const JSON_DOWNLOAD_REVOKE_DELAY_MS = 1000;

export type JsonDownloadErrorCode =
  | "invalid_input"
  | "environment_unavailable"
  | "blob_creation_failed"
  | "object_url_creation_failed"
  | "download_trigger_failed";

export type JsonDownloadError = {
  code: JsonDownloadErrorCode;
  message: string;
  retryable: boolean;
};

export type JsonDownloadResult =
  | { ok: true; status: "download_requested" }
  | { ok: false; error: JsonDownloadError };

export type JsonDownloadAnchor = {
  href: string;
  download: string;
  rel: string;
  click: () => void;
  remove: () => void;
};

export type JsonDownloadEnvironment = {
  createBlob: (json: string, mimeType: string) => unknown;
  createObjectURL: (blob: unknown) => unknown;
  revokeObjectURL: (url: string) => void;
  createAnchor: () => JsonDownloadAnchor;
  appendAnchor: (anchor: JsonDownloadAnchor) => void;
  setTimeout: (callback: () => void, delay: number) => unknown;
};

const MIME_TYPE = "application/json;charset=utf-8";

const ERROR_DETAILS: Record<
  JsonDownloadErrorCode,
  { message: string; retryable: boolean }
> = {
  invalid_input: {
    message: "The JSON download request is invalid.",
    retryable: false,
  },
  environment_unavailable: {
    message: "Browser download tools are unavailable. Please try again.",
    retryable: true,
  },
  blob_creation_failed: {
    message: "The JSON file could not be prepared. Please try again.",
    retryable: true,
  },
  object_url_creation_failed: {
    message: "The browser could not prepare the download URL. Please try again.",
    retryable: true,
  },
  download_trigger_failed: {
    message: "The browser could not start the download. Please try again.",
    retryable: true,
  },
};

export function requestJsonDownload(
  fileName: string,
  json: string,
): JsonDownloadResult {
  try {
    if (!isValidInput(fileName, json)) return failure("invalid_input");
    const environment = resolveJsonDownloadEnvironment();
    if (!environment) return failure("environment_unavailable");
    return requestValidatedJsonDownload(fileName, json, environment);
  } catch {
    return failure("environment_unavailable");
  }
}

export function requestJsonDownloadWithEnvironment(
  fileName: string,
  json: string,
  environment: JsonDownloadEnvironment,
): JsonDownloadResult {
  try {
    if (!isValidInput(fileName, json)) return failure("invalid_input");
    if (!isValidEnvironment(environment)) {
      return failure("environment_unavailable");
    }
    return requestValidatedJsonDownload(fileName, json, environment);
  } catch {
    return failure("environment_unavailable");
  }
}

function requestValidatedJsonDownload(
  fileName: string,
  json: string,
  environment: JsonDownloadEnvironment,
): JsonDownloadResult {
  let blob: unknown;
  try {
    blob = environment.createBlob(json, MIME_TYPE);
  } catch {
    return failure("blob_creation_failed");
  }

  let objectUrl: unknown;
  try {
    objectUrl = environment.createObjectURL(blob);
  } catch {
    return failure("object_url_creation_failed");
  }
  if (typeof objectUrl !== "string" || !objectUrl.trim()) {
    return failure("object_url_creation_failed");
  }

  let anchor: JsonDownloadAnchor | null = null;
  let appended = false;
  try {
    anchor = environment.createAnchor();
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.rel = "noopener";
    appended = true;
    environment.appendAnchor(anchor);
    anchor.click();
  } catch {
    if (appended && anchor) bestEffortRemove(anchor);
    bestEffortRevoke(environment, objectUrl);
    return failure("download_trigger_failed");
  }

  if (anchor) bestEffortRemove(anchor);
  try {
    environment.setTimeout(() => {
      bestEffortRevoke(environment, objectUrl);
    }, JSON_DOWNLOAD_REVOKE_DELAY_MS);
  } catch {
    // A completed click remains a requested download. Do not revoke inline.
  }

  return { ok: true, status: "download_requested" };
}

function resolveJsonDownloadEnvironment(): JsonDownloadEnvironment | null {
  try {
    if (
      typeof window === "undefined" ||
      typeof document === "undefined" ||
      typeof Blob === "undefined" ||
      typeof URL === "undefined"
    ) {
      return null;
    }

    const BlobConstructor = Blob;
    const createObjectURL = URL.createObjectURL;
    const revokeObjectURL = URL.revokeObjectURL;
    const body = document.body;
    const createElement = document.createElement;
    const schedule = window.setTimeout;
    if (
      typeof BlobConstructor !== "function" ||
      typeof createObjectURL !== "function" ||
      typeof revokeObjectURL !== "function" ||
      !body ||
      typeof body.appendChild !== "function" ||
      typeof createElement !== "function" ||
      typeof schedule !== "function"
    ) {
      return null;
    }

    return {
      createBlob: (json, mimeType) => new BlobConstructor([json], {
        type: mimeType,
      }),
      createObjectURL: (blob) => createObjectURL.call(URL, blob as Blob),
      revokeObjectURL: (url) => revokeObjectURL.call(URL, url),
      createAnchor: () =>
        createElement.call(document, "a") as HTMLAnchorElement,
      appendAnchor: (anchor) => {
        body.appendChild(anchor as HTMLAnchorElement);
      },
      setTimeout: (callback, delay) => schedule.call(window, callback, delay),
    };
  } catch {
    return null;
  }
}

function isValidInput(fileName: unknown, json: unknown): boolean {
  return typeof fileName === "string" &&
    fileName.length > 0 &&
    fileName.length <= 180 &&
    /^[A-Za-z0-9._-]+\.json$/.test(fileName) &&
    typeof json === "string" &&
    json.length > 0;
}

function isValidEnvironment(
  environment: JsonDownloadEnvironment | unknown,
): environment is JsonDownloadEnvironment {
  if (!environment || typeof environment !== "object") return false;
  try {
    return typeof (environment as JsonDownloadEnvironment).createBlob === "function" &&
      typeof (environment as JsonDownloadEnvironment).createObjectURL === "function" &&
      typeof (environment as JsonDownloadEnvironment).revokeObjectURL === "function" &&
      typeof (environment as JsonDownloadEnvironment).createAnchor === "function" &&
      typeof (environment as JsonDownloadEnvironment).appendAnchor === "function" &&
      typeof (environment as JsonDownloadEnvironment).setTimeout === "function";
  } catch {
    return false;
  }
}

function bestEffortRemove(anchor: JsonDownloadAnchor): void {
  try {
    anchor.remove();
  } catch {
    return;
  }
}

function bestEffortRevoke(
  environment: JsonDownloadEnvironment,
  objectUrl: string,
): void {
  try {
    environment.revokeObjectURL(objectUrl);
  } catch {
    return;
  }
}

function failure(code: JsonDownloadErrorCode): JsonDownloadResult {
  return { ok: false, error: { code, ...ERROR_DETAILS[code] } };
}
