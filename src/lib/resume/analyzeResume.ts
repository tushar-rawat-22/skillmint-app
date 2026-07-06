import { extractTextFromResume } from "@/lib/pdf/extractText";
import {
  parseResumeText,
  type ParsedResumeProfile,
} from "@/lib/parser/profileBuilder";
import { buildUserProfileFromParsedResume } from "@/lib/resume/buildUserProfileFromParsedResume";
import type { UserProfile } from "@/intelligence/types/profile";
import {
  generateProofScore,
  type ProofScoreResult,
} from "@/intelligence/proof";

export type ResumeAnalysisStatus = "completed";

export type ResumeAnalysisResult = {
  fileName: string;
  fileType: string;
  fileSize: number;
  extractedText: string;
  parsedProfile: ParsedResumeProfile;
  userProfile: UserProfile;
  proofAnalysis?: ProofScoreResult;
  analyzedAt: string;
  status: ResumeAnalysisStatus;
};

export async function analyzeResume(
  file: File,
): Promise<ResumeAnalysisResult> {
  const extractedText = await extractTextFromResume(file);
  const parsedProfile = parseResumeText(extractedText);
  const userProfile = buildUserProfileFromParsedResume(
    parsedProfile,
    extractedText,
  );
  const proofAnalysis = generateProofScore({
    profile: userProfile,
    parsedProfile,
    resumeText: extractedText,
  });

  return {
    fileName: file.name,
    fileType: getResumeFileType(file),
    fileSize: file.size,
    extractedText,
    parsedProfile,
    userProfile,
    proofAnalysis,
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
