import { UserProfile } from "../types/profile";

export function generateMissions(
  profile: UserProfile
): string[] {

  const missions: string[] = [];

  if (profile.githubScore < 8)
    missions.push("Improve GitHub Portfolio");

  if (profile.projectsScore < 12)
    missions.push("Build Another Project");

  if (profile.resumeScore < 18)
    missions.push("Improve Resume");

  if (profile.linkedinScore < 4)
    missions.push("Optimize LinkedIn");

  return missions;
}