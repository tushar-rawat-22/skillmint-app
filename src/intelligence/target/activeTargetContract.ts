export type ActiveTargetSource =
  | "latest_jd"
  | "profile_fit"
  | "ultimate_goal"
  | "manual";

export type ActiveTargetStatus =
  | "none"
  | "active"
  | "needs_resume_analysis";

export type ActiveTargetRecommendedPathSource =
  | "latest_jd"
  | "profile_fit"
  | "ultimate_goal";

export type ActiveTargetJdMatch = {
  score: number;
  verdict?: string;
  brutalReality?: string;
  matchedSkills: string[];
  missingSkills: string[];
  missingKeywords: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
};

export type ActiveTarget = {
  id: string;
  source: ActiveTargetSource;
  status: ActiveTargetStatus;
  title: string;
  companyName?: string;
  roleTitle?: string;
  location?: string;
  jdText?: string;
  jdHash?: string;
  jdMatch?: ActiveTargetJdMatch;
  targetRole?: string;
  careerField?: string;
  mainGap: string;
  nextBestMove: string;
  createdAt: string;
  updatedAt: string;
};

export type ActiveTargetSuggestion = {
  id: string;
  source: ActiveTargetSource;
  title: string;
  reason: string;
  targetRole?: string;
  companyName?: string;
  disabled?: boolean;
  disabledReason?: string;
};

export type ActiveTargetEngineResult = {
  activeTarget: ActiveTarget | null;
  status: ActiveTargetStatus;
  suggestions: ActiveTargetSuggestion[];
  primarySuggestion?: ActiveTargetSuggestion;
  targetSummary: string;
  mainGap: string;
  nextBestMove: string;
  recommendedPathSource?: ActiveTargetRecommendedPathSource;
};
