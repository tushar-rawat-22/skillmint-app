import { UserProfile } from "../types/profile";

export function generateRecommendations(
  profile: UserProfile
): string[] {

  const recommendations: string[] = [];

  if (profile.skillsScore < 12)
    recommendations.push("Learn another in-demand skill");

  if (profile.projectsScore < 12)
    recommendations.push("Showcase more real-world projects");

  if (profile.githubScore < 8)
    recommendations.push("Increase GitHub activity");

  if (profile.resumeScore < 18)
    recommendations.push("Improve resume formatting");

  return recommendations;
}