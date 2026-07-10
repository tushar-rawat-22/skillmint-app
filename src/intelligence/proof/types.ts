import type { UserProfile } from "@/intelligence/types/profile";
import type {
  ScoreCapReason,
  ScoreSignal,
  SkillImportance,
  SkillSupportLevel,
} from "@/intelligence/scoring";

export type ProofLinkType =
  | "github_profile"
  | "github_repo"
  | "leetcode"
  | "linkedin"
  | "portfolio"
  | "live_project"
  | "kaggle"
  | "behance"
  | "figma"
  | "dribbble"
  | "medium"
  | "hashnode"
  | "devto"
  | "certification"
  | "dashboard"
  | "app_store"
  | "huggingface"
  | "google_drive"
  | "other";

export type ProofLinkSource = "resume_text" | "parsed_profile";

export type ProofCoverageLabel = "Strong" | "Moderate" | "Weak" | "Missing";

export type SkillProofStatus =
  | "Evidence-backed"
  | "Weakly supported"
  | "Claimed but unverified";

export type ParsedProofProfile = {
  skills?: string[];
  projects?: string[];
  experience?: string[];
  certifications?: string[];
  links?: Record<string, string | undefined>;
  rawSections?: Record<string, string | undefined>;
};

export interface ProofLinkCandidate {
  url: string;
  normalizedUrl: string;
  type: ProofLinkType;
  source: ProofLinkSource;
  label: string;
}

export interface SkillProofClassification {
  skill: string;
  status: SkillProofStatus;
  reason: string;
  supportLevel?: SkillSupportLevel;
  importance?: SkillImportance;
  evidence?: string;
}

export interface ProofScoreResult {
  proofConfidenceScore: number;
  proofCoverageLabel: ProofCoverageLabel;
  scoringVersion?: string;
  label?: string;
  drivers?: string[];
  blockers?: string[];
  signals?: ScoreSignal[];
  capsApplied?: ScoreCapReason[];
  proofSummary: string;
  extractedProofLinks: ProofLinkCandidate[];
  linkTypeCounts: Record<ProofLinkType, number>;
  evidenceBackedSkills: string[];
  weaklySupportedSkills: string[];
  unverifiedSkills: string[];
  skillClassifications: SkillProofClassification[];
  strongestEvidence: string;
  weakestEvidence: string;
  nextProofMove: string;
  scoringReasons: string[];
}

export interface ProofScoringInput {
  profile: UserProfile;
  resumeText?: string;
  parsedProfile?: ParsedProofProfile | null;
  careerField?: string | null;
}
