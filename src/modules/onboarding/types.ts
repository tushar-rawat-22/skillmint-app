export interface OnboardingProgress {
  hasTargetRoleSetup: boolean;
  hasResumeAnalysis: boolean;
  hasJobMatch: boolean;
  hasRoadmap: boolean;
  isSignedIn: boolean;
  isSupabaseConfigured: boolean;
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  href: string;
  status: "complete" | "active" | "locked";
  cta: string;
}

export interface TargetRoleSetup {
  targetRole: string;
  experienceLevel: "student" | "fresher" | "intern" | "junior" | "switcher";
  primaryGoal:
    | "get_internship"
    | "get_first_job"
    | "switch_role"
    | "improve_resume"
    | "prepare_interviews";
  preferredJobType:
    | "frontend"
    | "backend"
    | "full_stack"
    | "ai_ml"
    | "data"
    | "devops"
    | "product"
    | "not_sure";
  weeklyTimeCommitment: "low" | "medium" | "high";
  updatedAt: string;
}
