export interface OnboardingProgress {
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
