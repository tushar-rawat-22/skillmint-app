import { mockProfile } from "@/intelligence/mock/profile";

import { calculateCareerIQ } from "@/intelligence/core/careerIQ";
import { calculateATS } from "@/intelligence/core/ats";
import { calculateRecruiterConfidence } from "@/intelligence/core/recruiter";
import { estimateSalary } from "@/intelligence/core/salary";
import { generateMissions } from "@/intelligence/core/missions";
import { generateRecommendations } from "@/intelligence/core/recommendations";
import { calculateRoleMatches } from "@/intelligence/core/roleMatch";

export function useCareerData() {
  const profile = mockProfile;

  const careerIQ = calculateCareerIQ(profile);

  return {
    profile,
    careerIQ,
    ats: calculateATS(profile),
    recruiter: calculateRecruiterConfidence(profile),
    salary: estimateSalary(careerIQ.score),
    missions: generateMissions(profile),
    recommendations: generateRecommendations(profile),
    roleMatches: calculateRoleMatches(profile),
  };
}