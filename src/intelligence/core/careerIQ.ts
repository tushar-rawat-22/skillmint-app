import { UserProfile } from "../types/profile";
import { CareerIQResult } from "../types/results";
import { calculateCertificationScore } from "./certifications";
import { calculateCodingProfileScore } from "./coding";
import {
  clamp,
  countExceptionalProofSignals,
  hasPlaceholderText,
  hasPublicProof,
  hasStrongProof,
  roundScore,
  scaleScore,
} from "./utils";

export function calculateCareerIQ(
  profile: UserProfile
): CareerIQResult {
  const certificationScore = calculateCertificationScore(
    profile.certifications
  );
  const codingProfileScore = calculateCodingProfileScore(
    profile.codingProfiles
  );
  const optionalProofScore =
    (profile.leadershipScore ?? 0) +
    (profile.achievementScore ?? 0) +
    (profile.researchScore ?? 0);

  let score =
    scaleScore(profile.resumeScore, 20, 14) +
    scaleScore(profile.skillsScore, 15, 12) +
    scaleScore(profile.projectsScore, 15, 14) +
    scaleScore(profile.experienceScore, 12, 14) +
    scaleScore(profile.educationScore, 10, 8) +
    scaleScore(profile.githubScore, 8, 8) +
    scaleScore(profile.linkedinScore, 5, 4) +
    scaleScore(profile.atsScore, 5, 8) +
    scaleScore(profile.recruiterScore, 5, 8) +
    scaleScore(certificationScore, 40, 5) +
    scaleScore(codingProfileScore, 100, 3) +
    scaleScore(optionalProofScore, 30, 2);

  if (profile.experienceScore === 0 && profile.githubScore <= 4) {
    score = Math.min(score, 72);
  }

  if (profile.projectsScore < 9) {
    score = Math.min(score, 68);
  }

  if (profile.skillsScore >= 12 && profile.projectsScore < 9) {
    score = Math.min(score, 65);
  }

  if (!hasPublicProof(profile)) {
    score = Math.min(score, 62);
  }

  if (profile.atsScore < 3) {
    score = Math.min(score, 70);
  }

  if (score > 85 && !hasStrongProof(profile)) {
    score = 85;
  }

  if (score > 90 && countExceptionalProofSignals(profile) < 3) {
    score = 90;
  }

  if (hasPlaceholderText(profile)) {
    score = Math.min(score, 35);
  }

  score = roundScore(clamp(score, 0, 100));

  let grade = "C";
  let summary = "Weak profile, major improvements needed.";

  if (score >= 90) {
    grade = "A+";
    summary = "Exceptional, rare profile with standout evidence.";
  } else if (score >= 80) {
    grade = "A";
    summary = "Competitive profile, with proof still needing review.";
  } else if (score >= 70) {
    grade = "B+";
    summary = "Good foundation, but not elite yet.";
  } else if (score >= 60) {
    grade = "B";
    summary = "Average-to-decent student profile with clear gaps.";
  } else if (score >= 50) {
    grade = "C";
    summary = "Weak-to-average profile, needs stronger proof.";
  }

  return {
    score,
    grade,
    summary,
  };
}
