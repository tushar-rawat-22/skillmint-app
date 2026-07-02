import { UserProfile } from "../types/profile";
import { ATSResult } from "../types/results";

export function calculateATS(
  profile: UserProfile
): ATSResult {

  const score = profile.atsScore * 20;

  let verdict = "Poor";

  if (score >= 90)
    verdict = "Excellent";
  else if (score >= 75)
    verdict = "Good";
  else if (score >= 60)
    verdict = "Average";

  return {
    score,
    verdict,
  };
}