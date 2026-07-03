import { UserProfile } from "../types/profile";
import { ATSResult } from "../types/results";
import {
  clamp,
  hasMeasurableImpact,
  hasPlaceholderText,
  hasPublicProof,
  roundScore,
  scaleScore,
} from "./utils";

export function calculateATS(
  profile: UserProfile
): ATSResult {

  // ATS readiness here is resume structure/proof quality, not JD matching.
  let score =
    scaleScore(profile.atsScore, 5, 30) +
    scaleScore(profile.skillsScore, 15, 14) +
    scaleScore(profile.projectsScore, 15, 14) +
    scaleScore(profile.educationScore, 10, 8) +
    scaleScore(profile.experienceScore, 12, 8) +
    scaleScore(profile.resumeScore, 20, 8);

  if (profile.certifications.length) score += 6;
  if (hasPublicProof(profile)) score += 6;
  if (profile.analysisFlags?.hasSectionClarity) score += 4;
  if (hasMeasurableImpact(profile)) score += 6;

  if (!profile.skills.length) score -= 14;
  if (!profile.projects.length) score -= 16;
  if (!profile.education) score -= 8;
  if (profile.skills.length >= 16 && profile.projects.length < 2) {
    score -= 6;
  }

  if (!profile.projects.length) score = Math.min(score, 55);
  if (!profile.skills.length) score = Math.min(score, 45);
  if (!profile.experience.length) score = Math.min(score, 78);
  if (!hasMeasurableImpact(profile)) score = Math.min(score, 82);
  if (!hasPublicProof(profile)) score = Math.min(score, 72);
  if (!profile.certifications.length) score = Math.min(score, 88);
  if (!profile.analysisFlags?.hasSectionClarity) {
    score = Math.min(score, 76);
  }
  if (hasPlaceholderText(profile)) score = Math.min(score, 35);

  score = roundScore(clamp(score, 0, 100));

  let verdict = "Weak";

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
