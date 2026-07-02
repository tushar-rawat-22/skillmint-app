import { UserProfile } from "../types/profile";
import { CareerIQResult } from "../types/results";
import { calculateCertificationScore } from "./certifications";
import { calculateCodingProfileScore } from "./coding";

export function calculateCareerIQ(
  profile: UserProfile
): CareerIQResult {
  const baseScore =
    profile.resumeScore +
    profile.skillsScore +
    profile.projectsScore +
    profile.experienceScore +
    profile.educationScore +
    profile.githubScore +
    profile.linkedinScore +
    profile.atsScore +
    profile.recruiterScore +
    profile.activityScore;

  const certificationBonus = Math.min(
    Math.round(
      calculateCertificationScore(profile.certifications) / 8
    ),
    6
  );

  const codingBonus = Math.min(
    Math.round(
      calculateCodingProfileScore(profile.codingProfiles) / 12
    ),
    8
  );

  const achievementBonus = Math.min(
    Math.round((profile.achievementScore ?? 0) / 2),
    4
  );

  const score = Math.min(
    baseScore + certificationBonus + codingBonus + achievementBonus,
    100
  );

  let grade = "C";
  let summary = "Needs focused improvement.";

  if (score >= 90) {
    grade = "A+";
    summary = "Exceptional profile with strong hiring signals.";
  } else if (score >= 80) {
    grade = "A";
    summary = "Strong profile with clear competitive advantage.";
  } else if (score >= 70) {
    grade = "B+";
    summary = "Good profile with visible growth potential.";
  } else if (score >= 60) {
    grade = "B";
    summary = "Solid foundation but important gaps remain.";
  }

  return {
    score,
    grade,
    summary,
  };
}