const MAX_RESUME_FILE_BYTES = 5 * 1024 * 1024;

const RESUME_FILE_TYPES = {
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

type SupportedResumeFileType = keyof typeof RESUME_FILE_TYPES;

const GENERIC_BROWSER_MIME_TYPES = new Set([
  "",
  "application/octet-stream",
]);

export async function extractTextFromResume(
  file: File,
): Promise<string> {
  const fileType = validateResumeFile(file);

  if (fileType === "txt") {
    return normalizeExtractedText(await file.text());
  }

  return extractTextOnServer(file);
}

async function extractTextOnServer(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/resume/extract", {
    method: "POST",
    body: formData,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(payload) ??
        "Resume text extraction failed. Please try another file.",
    );
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    typeof payload.extractedText !== "string"
  ) {
    throw new Error(
      "Resume text extraction returned an invalid response.",
    );
  }

  return payload.extractedText;
}

function validateResumeFile(file: File): SupportedResumeFileType {
  const fileType = getSupportedFileType(file.name);

  if (!fileType) {
    throw new Error(
      "Unsupported resume type. Upload a PDF, DOCX, or TXT file.",
    );
  }

  if (file.size > MAX_RESUME_FILE_BYTES) {
    throw new Error("Resume files must be 5MB or smaller.");
  }

  const browserMimeType = file.type.trim().toLowerCase();
  const expectedMimeTypes: readonly string[] =
    RESUME_FILE_TYPES[fileType].mimeTypes;

  if (
    !GENERIC_BROWSER_MIME_TYPES.has(browserMimeType) &&
    !expectedMimeTypes.includes(browserMimeType)
  ) {
    throw new Error(
      `The selected file does not look like a ${RESUME_FILE_TYPES[fileType].label} resume. Upload a PDF, DOCX, or TXT file.`,
    );
  }

  return fileType;
}

function getSupportedFileType(
  fileName: string,
): SupportedResumeFileType | null {
  const extension = fileName.split(".").pop()?.toLowerCase();

  if (extension && extension in RESUME_FILE_TYPES) {
    return extension as SupportedResumeFileType;
  }

  return null;
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u00A0]{2,}/g, " ")
    .replace(/\n[ \u00A0]+/g, "\n")
    .replace(/[ \u00A0]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function getErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const error = (payload as Record<string, unknown>).error;

  return typeof error === "string" ? error : null;
}
