import {
  getKnownExtractionError,
  isResumeExtractionSuccessPayload,
  normalizeAndValidateExtractedText,
  ResumeExtractionError,
  validateResumeFileMetadata,
} from "@/lib/resume/resumeUploadContract";

export async function extractTextFromResume(
  file: File,
): Promise<string> {
  validateResumeFileMetadata({
    name: file.name,
    size: file.size,
    mimeType: file.type,
  });
  return extractTextOnServer(file);
}

async function extractTextOnServer(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/resume/extract", {
    method: "POST",
    body: formData,
  });
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw getKnownExtractionError(payload) ??
      new ResumeExtractionError("extraction_failed");
  }

  if (!isResumeExtractionSuccessPayload(payload)) {
    throw new ResumeExtractionError("extraction_failed");
  }

  return normalizeAndValidateExtractedText(payload.extractedText);
}
