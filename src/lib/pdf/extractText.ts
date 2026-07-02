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
    return file.text();
  }

  if (fileType === "pdf") {
    return buildPlaceholderText("PDF", file.name);
  }

  return buildPlaceholderText("DOCX", file.name);
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

function buildPlaceholderText(
  label: "PDF" | "DOCX",
  fileName: string,
): string {
  return [
    `Temporary ${label} extraction placeholder for ${fileName}.`,
    "SkillMint received this resume safely. Full browser-side text extraction for this format will be connected in a future sprint.",
  ].join("\n\n");
}
