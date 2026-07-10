import type {
  ScoreBreakdown,
  ScoreCapReason,
  ScoreSignal,
  SkillTruthClassification,
} from "@/intelligence/scoring";

export interface CareerIQResult {
  score: number;
  grade: string;
  summary: string;
  scoringVersion?: string;
  label?: string;
  explanation?: string;
  drivers?: string[];
  blockers?: string[];
  signals?: ScoreSignal[];
  capsApplied?: ScoreCapReason[];
  categoryScores?: Record<string, ScoreBreakdown>;
  skillTruth?: {
    classifications: SkillTruthClassification[];
    backedSkills: string[];
    claimedOnlySkills: string[];
    unsupportedSkillRatio: number;
    coreTargetSkillCoverage: number;
  };
  weightedScoreBeforeCaps?: number;
}

export interface ATSResult {
  score: number;
  verdict: string;
}

export interface RecruiterResult {
  score: number;
  confidence: string;
}

export interface SalaryResult {
  salary: number;
  currency: string;
}

export interface RoleMatchResult {
  role: string;
  matchScore: number;
  category: string;
  salaryRange: string;
  why: string[];
  gaps: string[];
  difficulty: "Easy" | "Medium" | "Hard";
}
