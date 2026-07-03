import mammoth from "mammoth";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_RESUME_FILE_BYTES = 5 * 1024 * 1024;
const SCANNED_PDF_MESSAGE =
  "This PDF appears to be image-based or scanned. OCR support will be added later.";

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

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return errorResponse("Upload a resume file to analyze.", 400);
    }

    const fileType = validateResumeFile(file);
    const buffer = Buffer.from(await file.arrayBuffer());
    const extractedText = await extractTextFromBuffer(buffer, fileType);

    return NextResponse.json({
      extractedText,
    });
  } catch (error) {
    return errorResponse(
      error instanceof Error
        ? error.message
        : "Resume text extraction failed. Please try another file.",
      400,
    );
  }
}

async function extractTextFromBuffer(
  buffer: Buffer,
  fileType: SupportedResumeFileType,
): Promise<string> {
  if (fileType === "txt") {
    return normalizeExtractedText(buffer.toString("utf8"));
  }

  if (fileType === "pdf") {
    return extractPdfText(buffer);
  }

  return extractDocxText(buffer);
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const result = await pdfParse(buffer);
    const text = normalizeExtractedText(result.text ?? "");

    return text.length >= 80 ? text : SCANNED_PDF_MESSAGE;
  } catch {
    throw new Error(
      "Could not extract text from this PDF. Please upload a readable PDF resume.",
    );
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    const result = await mammoth.extractRawText({
      buffer,
    });
    const text = normalizeExtractedText(result.value ?? "");

    if (!text) {
      throw new Error("empty-docx");
    }

    return text;
  } catch {
    throw new Error(
      "Could not extract text from this DOCX. Please upload a valid DOCX resume.",
    );
  }
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

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      error: message,
    },
    {
      status,
    },
  );
}
