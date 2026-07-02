import { Certification } from "../types/profile";

const CERTIFICATION_TIER_POINTS = {
  S: 15,
  A: 12,
  B: 8,
  C: 5,
  D: 2,
} as const;

export function calculateCertificationScore(
  certifications: Certification[]
): number {
  if (!certifications.length) return 0;

  const total = certifications.reduce((score, certification) => {
    const base = CERTIFICATION_TIER_POINTS[certification.tier];

    const verifiedBonus = certification.verified ? 2 : 0;

    return score + base + verifiedBonus;
  }, 0);

  return Math.min(total, 40);
}

export function getStrongestCertification(
  certifications: Certification[]
): Certification | null {
  if (!certifications.length) return null;

  return [...certifications].sort((a, b) => {
    return (
      CERTIFICATION_TIER_POINTS[b.tier] -
      CERTIFICATION_TIER_POINTS[a.tier]
    );
  })[0];
}