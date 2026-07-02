import { extractTextFromResume } from "@/lib/pdf/extractText";

export type ResumeAnalysisStatus = "completed";

export type ResumeAnalysisResult = {
  fileName: string;
  fileType: string;
  fileSize: number;
  extractedText: string;
  analyzedAt: string;
  status: ResumeAnalysisStatus;
};

export async function analyzeResume(
  file: File,
): Promise<ResumeAnalysisResult> {
  const extractedText = await extractTextFromResume(file);

  return {
    fileName: file.name,
    fileType: getResumeFileType(file),
    fileSize: file.size,
    extractedText,
    analyzedAt: new Date().toISOString(),
    status: "completed",
  };
}

function getResumeFileType(file: File): string {
  if (file.type) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLowerCase();

  return extension ? `.${extension}` : "unknown";
}
