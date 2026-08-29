export const RESUME_UPLOAD_LIMITS = {
  maxFileBytes: 4 * 1024 * 1024,
  maxMultipartBytes: 4 * 1024 * 1024 + 128 * 1024,
  maxFilenameCharacters: 120,
  maxFilenameUtf8Bytes: 480,
  maxExtractedTextCharacters: 250_000,
} as const;

export const RESUME_FILE_TYPES = {
  txt: {
    label: "TXT",
    mimeTypes: ["text/plain"],
  },
  pdf: {
    label: "PDF",
    mimeTypes: ["application/pdf"],
  },
  docx: {
    label: "DOCX",
    mimeTypes: [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  },
} as const;

export type SupportedResumeFileType = keyof typeof RESUME_FILE_TYPES;

export const RESUME_EXTRACTION_ERROR_CODES = [
  "authentication_required",
  "authentication_unavailable",
  "candidate_persona_required",
  "missing_file",
  "unsupported_type",
  "file_too_large",
  "unsafe_filename",
  "mime_signature_mismatch",
  "malformed_pdf",
  "scanned_pdf_unsupported",
  "malformed_or_unsafe_docx",
  "empty_document",
  "excessive_extracted_text",
  "cross_origin_request",
  "malformed_request",
  "extraction_failed",
] as const;

export type ResumeExtractionErrorCode =
  (typeof RESUME_EXTRACTION_ERROR_CODES)[number];

export type ResumeExtractionErrorPayload = {
  code: ResumeExtractionErrorCode;
  message: string;
};

export type ResumeExtractionSuccessPayload = {
  extractedText: string;
};

export const RESUME_EXTRACTION_ERRORS: Readonly<
  Record<
    ResumeExtractionErrorCode,
    Readonly<{ message: string; status: number }>
  >
> = {
  authentication_required: {
    message: "Log in to analyze a real resume.",
    status: 401,
  },
  authentication_unavailable: {
    message: "Resume analysis is temporarily unavailable.",
    status: 503,
  },
  candidate_persona_required: {
    message: "Resume analysis is available to candidate accounts.",
    status: 403,
  },
  missing_file: {
    message: "Choose a resume file to analyze.",
    status: 400,
  },
  unsupported_type: {
    message: "Upload a PDF, DOCX, or TXT resume.",
    status: 415,
  },
  file_too_large: {
    message: "Resume files must be 4 MiB or smaller.",
    status: 413,
  },
  unsafe_filename: {
    message: "Rename this file and try again.",
    status: 400,
  },
  mime_signature_mismatch: {
    message: "The file content does not match its declared resume type.",
    status: 415,
  },
  malformed_pdf: {
    message: "This PDF is malformed or unsupported.",
    status: 422,
  },
  scanned_pdf_unsupported: {
    message: "Scanned or image-only PDFs are not supported.",
    status: 422,
  },
  malformed_or_unsafe_docx: {
    message: "This DOCX is malformed, unsafe, or unsupported.",
    status: 422,
  },
  empty_document: {
    message: "This resume does not contain readable text.",
    status: 422,
  },
  excessive_extracted_text: {
    message: "This resume contains too much extracted text.",
    status: 413,
  },
  cross_origin_request: {
    message: "This resume request is not allowed.",
    status: 403,
  },
  malformed_request: {
    message: "The resume request could not be read.",
    status: 400,
  },
  extraction_failed: {
    message: "Resume text extraction failed. Try another file.",
    status: 500,
  },
};

const GENERIC_BROWSER_MIME_TYPES = new Set([
  "",
  "application/octet-stream",
]);

const ERROR_CODE_SET = new Set<string>(
  RESUME_EXTRACTION_ERROR_CODES,
);

export class ResumeExtractionError extends Error {
  readonly code: ResumeExtractionErrorCode;
  readonly status: number;

  constructor(code: ResumeExtractionErrorCode) {
    const contract = RESUME_EXTRACTION_ERRORS[code];
    super(contract.message);
    this.name = "ResumeExtractionError";
    this.code = code;
    this.status = contract.status;
  }
}

export function validateResumeFileMetadata(input: {
  name: string;
  size: number;
  mimeType: string;
}): SupportedResumeFileType {
  validateResumeFilename(input.name);

  const fileType = getSupportedResumeFileType(input.name);
  if (!fileType) {
    throw new ResumeExtractionError("unsupported_type");
  }

  if (
    !Number.isSafeInteger(input.size) ||
    input.size < 0 ||
    input.size > RESUME_UPLOAD_LIMITS.maxFileBytes
  ) {
    throw new ResumeExtractionError("file_too_large");
  }

  const mimeType = input.mimeType.trim().toLowerCase();
  const expectedMimeTypes: readonly string[] =
    RESUME_FILE_TYPES[fileType].mimeTypes;

  if (
    !GENERIC_BROWSER_MIME_TYPES.has(mimeType) &&
    !expectedMimeTypes.includes(mimeType)
  ) {
    throw new ResumeExtractionError("mime_signature_mismatch");
  }

  return fileType;
}

export function validateResumeFilename(name: string): void {
  const characterLength = Array.from(name).length;
  const utf8Length = new TextEncoder().encode(name).byteLength;

  if (
    characterLength === 0 ||
    characterLength > RESUME_UPLOAD_LIMITS.maxFilenameCharacters ||
    utf8Length > RESUME_UPLOAD_LIMITS.maxFilenameUtf8Bytes ||
    /[\u0000-\u001f\u007f]/u.test(name) ||
    /[\\/]/u.test(name) ||
    name === "." ||
    name === ".." ||
    /^\s+$/u.test(name)
  ) {
    throw new ResumeExtractionError("unsafe_filename");
  }
}

export function getSupportedResumeFileType(
  fileName: string,
): SupportedResumeFileType | null {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension && extension in RESUME_FILE_TYPES) {
    return extension as SupportedResumeFileType;
  }

  return null;
}

export function normalizeAndValidateExtractedText(
  text: string,
): string {
  if (
    text.length >
    RESUME_UPLOAD_LIMITS.maxExtractedTextCharacters
  ) {
    throw new ResumeExtractionError("excessive_extracted_text");
  }

  const normalized = text
    .replace(/\r\n?/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00a0]{2,}/g, " ")
    .replace(/\n[ \u00a0]+/g, "\n")
    .replace(/[ \u00a0]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (!normalized) {
    throw new ResumeExtractionError("empty_document");
  }

  if (
    normalized.length >
    RESUME_UPLOAD_LIMITS.maxExtractedTextCharacters
  ) {
    throw new ResumeExtractionError("excessive_extracted_text");
  }

  return normalized;
}

export function getKnownExtractionError(
  payload: unknown,
): ResumeExtractionError | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const code = (payload as Record<string, unknown>).code;
  if (typeof code !== "string" || !ERROR_CODE_SET.has(code)) {
    return null;
  }

  return new ResumeExtractionError(
    code as ResumeExtractionErrorCode,
  );
}

export function isResumeExtractionSuccessPayload(
  payload: unknown,
): payload is ResumeExtractionSuccessPayload {
  return Boolean(payload) &&
    typeof payload === "object" &&
    typeof (payload as Record<string, unknown>).extractedText ===
      "string";
}
