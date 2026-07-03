import { UserProfile } from "../types/profile";
import { RecruiterResult } from "../types/results";
import { calculateCodingProfileScore } from "./coding";
import {
  clamp,
  hasMeasurableImpact,
  hasPlaceholderText,
  roundScore,
  scaleScore,
} from "./utils";

export function calculateRecruiterConfidence(
  profile: UserProfile
): RecruiterResult {

  const codingScore = calculateCodingProfileScore(profile.codingProfiles);
  let score =
    scaleScore(profile.recruiterScore, 5, 24) +
    scaleScore(profile.projectsScore, 15, 20) +
    scaleScore(profile.experienceScore, 12, 18) +
    scaleScore(profile.skillsScore, 15, 10) +
    scaleScore(profile.githubScore, 8, 8) +
    scaleScore(profile.linkedinScore, 5, 5) +
    scaleScore(codingScore, 100, 6);

  score += Math.min(profile.certifications.length * 2, 5);
  score += Math.min((profile.achievementScore ?? 0) / 2, 3);
  score += Math.min((profile.leadershipScore ?? 0) / 2, 3);

  if (hasMeasurableImpact(profile)) score += 5;

  if (
    profile.experienceScore === 0 &&
    !hasExceptionalFresherProof(profile, codingScore)
  ) {
    score = Math.min(score, 65);
  }

  if (!profile.github) {
    score = Math.min(score, 70);
  }

  if (profile.projectsScore < 9) {
    score = Math.min(score, 60);
  }

  if (!hasMeasurableImpact(profile)) {
    score = Math.min(score, 75);
  }

  if (!profile.projects.length) {
    score = Math.min(score, 55);
  }

  if (
    profile.experienceScore === 0 &&
    !profile.github &&
    !hasMeasurableImpact(profile)
  ) {
    score = Math.min(score, 55);
  }

  if (score >= 85 && countProofSignals(profile, codingScore) < 3) {
    score = 84;
  }

  if (hasPlaceholderText(profile)) score = Math.min(score, 25);

  score = roundScore(clamp(score, 0, 100));

  let confidence = "Low";

  if (score >= 85)
    confidence = "Very High";
  else if (score >= 70)
    confidence = "High";
  else if (score >= 55)
    confidence = "Moderate";

  return {
    score,
    confidence,
  };
}

function hasExceptionalFresherProof(
  profile: UserProfile,
  codingScore: number,
): boolean {
  return Boolean(
    profile.projectsScore >= 15 &&
      profile.githubScore >= 7 &&
      profile.skillsScore >= 12 &&
      (codingScore >= 60 || profile.certifications.length >= 2),
  );
}

function countProofSignals(
  profile: UserProfile,
  codingScore: number,
): number {
  return [
    profile.experienceScore >= 8,
    profile.projectsScore >= 12,
    profile.githubScore >= 6,
    profile.linkedinScore >= 3,
    codingScore >= 50,
    profile.certifications.length >= 2,
    hasMeasurableImpact(profile),
    (profile.achievementScore ?? 0) >= 6,
  ].filter(Boolean).length;
}
