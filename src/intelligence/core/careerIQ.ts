import type { ProofScoreResult } from "@/intelligence/proof";
import type { UserProfile } from "../types/profile";
import type { CareerIQResult } from "../types/results";
import { calculateCareerIQTruth } from "../scoring";

export type CareerIQOptions = {
  proofScore?: ProofScoreResult;
  targetRole?: string | null;
  careerField?: string | null;
};

export function calculateCareerIQ(
  profile: UserProfile,
  options: CareerIQOptions = {},
): CareerIQResult {
  return calculateCareerIQTruth({
    profile,
    proofScore: options.proofScore,
    targetRole: options.targetRole,
    careerField: options.careerField,
  });
}
