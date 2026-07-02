import { CodingProfile } from "../types/profile";

function scoreLeetCode(profile: CodingProfile): number {
  const solved = profile.solved ?? 0;
  const rating = profile.rating ?? profile.contestRating ?? 0;
  const hardSolved = profile.hardSolved ?? 0;

  let score = 0;

  if (solved >= 800) score += 45;
  else if (solved >= 500) score += 36;
  else if (solved >= 250) score += 26;
  else if (solved >= 100) score += 16;
  else if (solved > 0) score += 8;

  if (rating >= 2100) score += 35;
  else if (rating >= 1800) score += 28;
  else if (rating >= 1600) score += 20;
  else if (rating >= 1400) score += 12;

  if (hardSolved >= 100) score += 20;
  else if (hardSolved >= 50) score += 14;
  else if (hardSolved >= 20) score += 8;

  return Math.min(score, 100);
}

function scoreCompetitivePlatform(profile: CodingProfile): number {
  const rating = profile.rating ?? profile.contestRating ?? 0;
  const solved = profile.solved ?? 0;

  let score = 0;

  if (rating >= 2200) score += 60;
  else if (rating >= 1900) score += 45;
  else if (rating >= 1600) score += 30;
  else if (rating >= 1300) score += 18;

  if (solved >= 500) score += 30;
  else if (solved >= 250) score += 22;
  else if (solved >= 100) score += 12;

  return Math.min(score, 100);
}

export function calculateCodingProfileScore(
  profiles: CodingProfile[]
): number {
  if (!profiles.length) return 0;

  const scores = profiles.map((profile) => {
    if (profile.platform === "leetcode") {
      return scoreLeetCode(profile);
    }

    return scoreCompetitivePlatform(profile);
  });

  const bestScore = Math.max(...scores);
  const platformDiversityBonus = Math.min(profiles.length * 5, 15);

  return Math.min(bestScore + platformDiversityBonus, 100);
}