export interface CareerIQResult {
  score: number;
  grade: string;
  summary: string;
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