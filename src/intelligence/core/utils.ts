import type { UserProfile } from "../types/profile";
import { calculateCertificationScore } from "./certifications";
import { calculateCodingProfileScore } from "./coding";

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function roundScore(value: number): number {
  return Math.round(value);
}

export function scaleScore(
  value: number,
  sourceMax: number,
  targetMax: number,
): number {
  if (sourceMax <= 0) {
    return 0;
  }

  return clamp(value / sourceMax, 0, 1) * targetMax;
}

export function hasPublicProof(profile: UserProfile): boolean {
  return Boolean(profile.github || profile.linkedin);
}

export function hasMeasurableImpact(profile: UserProfile): boolean {
  return Boolean(profile.analysisFlags?.hasMeasurableImpact);
}

export function hasPlaceholderText(profile: UserProfile): boolean {
  return Boolean(profile.analysisFlags?.isPlaceholderText);
}

export function hasStrongProof(profile: UserProfile): boolean {
  const codingScore = calculateCodingProfileScore(profile.codingProfiles);
  const certificationScore = calculateCertificationScore(
    profile.certifications,
  );

  return Boolean(
    profile.experienceScore >= 8 ||
      profile.githubScore >= 7 ||
      codingScore >= 70 ||
      (certificationScore >= 18 && profile.projectsScore >= 12),
  );
}

export function countExceptionalProofSignals(
  profile: UserProfile,
): number {
  const codingScore = calculateCodingProfileScore(profile.codingProfiles);
  const certificationScore = calculateCertificationScore(
    profile.certifications,
  );

  return [
    profile.experienceScore >= 8,
    profile.githubScore >= 7,
    codingScore >= 70,
    certificationScore >= 25,
    profile.projectsScore >= 15,
    hasMeasurableImpact(profile),
    (profile.achievementScore ?? 0) >= 7,
  ].filter(Boolean).length;
}
