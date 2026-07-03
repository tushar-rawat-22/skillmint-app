import { calculateCodingProfileScore } from "./coding";
import { calculateCertificationScore } from "./certifications";
import type { UserProfile } from "../types/profile";
import { SalaryResult } from "../types/results";
import {
  clamp,
  hasMeasurableImpact,
  hasPlaceholderText,
} from "./utils";

export function estimateSalary(
  careerIQ: number,
  profile?: UserProfile,
): SalaryResult {
  if (!profile) {
    return {
      salary: Math.round(300000 + Math.min(careerIQ, 80) * 5000),
      currency: "INR",
    };
  }

  const salary = estimateFresherFriendlySalary(careerIQ, profile);

  return {
    salary,
    currency: "INR",
  };
}

function estimateFresherFriendlySalary(
  careerIQ: number,
  profile: UserProfile,
): number {
  const codingScore = calculateCodingProfileScore(profile.codingProfiles);
  const certificationScore = calculateCertificationScore(
    profile.certifications,
  );
  const recruiterSignal = profile.recruiterScore * 20;
  const hasStrongProof =
    profile.projectsScore >= 12 &&
    profile.skillsScore >= 12 &&
    profile.githubScore >= 6 &&
    profile.atsScore >= 4 &&
    profile.recruiterScore >= 4;
  const hasExceptionalProof =
    hasStrongProof &&
    (codingScore >= 60 || certificationScore >= 25) &&
    hasMeasurableImpact(profile);
  const hasLowExperience = profile.experienceScore <= 5;

  // Fresher salary is intentionally conservative until there is hard proof.
  let salary =
    300000 +
    profile.skillsScore * 8000 +
    profile.projectsScore * 12000 +
    profile.githubScore * 10000 +
    profile.atsScore * 12000 +
    profile.recruiterScore * 13000 +
    Math.min(codingScore, 60) * 1500 +
    Math.min(certificationScore, 28) * 2200 +
    Math.min(careerIQ, 80) * 1200;

  if (!hasLowExperience) {
    salary += profile.experienceScore * 22000;
  }

  let cap = 450000;

  if (
    profile.skillsScore >= 8 &&
    profile.projectsScore >= 9 &&
    profile.atsScore >= 3
  ) {
    cap = 800000;
  }

  if (hasStrongProof) {
    cap = 1200000;
  }

  if (hasExceptionalProof) {
    cap = 1800000;
  }

  if (!hasLowExperience) {
    cap = Math.max(cap, 1400000);
  }

  if (hasLowExperience && !hasExceptionalProof) {
    cap = Math.min(cap, 800000);
  }

  if (!profile.github && !profile.codingProfiles.length) {
    cap = Math.min(cap, 700000);
  }

  if (profile.projectsScore < 9) {
    cap = Math.min(cap, 600000);
  }

  if (recruiterSignal < 55) {
    cap = Math.min(cap, 650000);
  }

  if (!hasStrongProof) {
    cap = Math.min(cap, 1100000);
  }

  if (hasPlaceholderText(profile)) {
    cap = 350000;
  }

  return roundToNearest(clamp(salary, 300000, cap), 25000);
}

function roundToNearest(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest;
}
