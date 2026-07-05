import type {
  OnboardingProgress,
  OnboardingStep,
} from "@/modules/onboarding/types";

export function buildOnboardingSteps(
  progress: OnboardingProgress,
): OnboardingStep[] {
  return [
    {
      id: "set-career-direction",
      title: "Set career direction",
      description:
        "Choose a target role, goal, and weekly pace so SkillMint can guide the next steps.",
      href: "/setup",
      status: progress.hasTargetRoleSetup ? "complete" : "active",
      cta: progress.hasTargetRoleSetup ? "Update setup" : "Open setup",
    },
    {
      id: "upload-resume",
      title: "Upload your resume",
      description:
        "Start with a resume so SkillMint can build your career intelligence.",
      href: "/upload",
      status: progress.hasResumeAnalysis ? "complete" : "active",
      cta: progress.hasResumeAnalysis ? "Upload another" : "Upload resume",
    },
    {
      id: "review-intelligence",
      title: "Review resume intelligence",
      description:
        "See what SkillMint detected before matching jobs or planning next steps.",
      href: "/resume",
      status: progress.hasJobMatch
        ? "complete"
        : progress.hasResumeAnalysis
          ? "active"
          : "locked",
      cta: "Review resume",
    },
    {
      id: "match-job-description",
      title: "Match a job description",
      description:
        "Paste a real job description to learn where you are competitive and where proof is missing.",
      href: "/ats",
      status: progress.hasJobMatch
        ? "complete"
        : progress.hasResumeAnalysis
          ? "active"
          : "locked",
      cta: progress.hasJobMatch ? "Match another job" : "Open ATS match",
    },
    {
      id: "generate-roadmap",
      title: "Generate your roadmap",
      description:
        "Turn your resume and latest job match into a practical 30/60/90-day plan.",
      href: "/roadmap",
      status: progress.hasRoadmap
        ? "complete"
        : progress.hasJobMatch
          ? "active"
          : "locked",
      cta: "Open roadmap",
    },
    {
      id: "create-account",
      title: "Create account and sync data",
      description:
        "Keep your resume analyses, job matches, and roadmap available across sessions.",
      href: progress.isSignedIn ? "/settings" : "/signup",
      status: progress.isSignedIn
        ? "complete"
        : progress.isSupabaseConfigured
          ? "active"
          : "locked",
      cta: progress.isSignedIn ? "View sync status" : "Create account",
    },
  ];
}
