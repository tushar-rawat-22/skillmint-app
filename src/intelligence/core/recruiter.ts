import { UserProfile } from "../types/profile";
import { RecruiterResult } from "../types/results";

export function calculateRecruiterConfidence(
  profile: UserProfile
): RecruiterResult {

  const score = profile.recruiterScore * 20;

  let confidence = "Low";

  if (score >= 90)
    confidence = "Very High";
  else if (score >= 75)
    confidence = "High";
  else if (score >= 60)
    confidence = "Moderate";

  return {
    score,
    confidence,
  };
}