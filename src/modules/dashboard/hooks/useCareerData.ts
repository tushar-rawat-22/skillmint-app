"use client";

import { useMemo, useSyncExternalStore } from "react";

import { mockProfile } from "@/intelligence/mock/profile";

import { calculateCareerIQ } from "@/intelligence/core/careerIQ";
import { calculateATS } from "@/intelligence/core/ats";
import { calculateRecruiterConfidence } from "@/intelligence/core/recruiter";
import { estimateSalary } from "@/intelligence/core/salary";
import { generateMissions } from "@/intelligence/core/missions";
import { generateRecommendations } from "@/intelligence/core/recommendations";
import { calculateRoleMatches } from "@/intelligence/core/roleMatch";
import {
  calculateProofAwareCareerIQ,
  calculateProofAwareRecruiterConfidence,
  createMissingProofScore,
  generateProofScore,
} from "@/intelligence/proof";
import type { ParsedProofProfile } from "@/intelligence/proof";
import type { UserProfile } from "@/intelligence/types/profile";
import type { CareerIQResult } from "@/intelligence/types/results";
import { subscribeToSkillMintWorkspaceUpdates } from "@/lib/storage/skillMintStorageEvents";
import { TARGET_ROLE_SETUP_STORAGE_KEY } from "@/modules/onboarding/storage/targetRoleSetupStorage";

const RESUME_ANALYSIS_STORAGE_KEY = "skillmint:resume-analysis";

export function useCareerData() {
  const storedAnalysis = useSyncExternalStore(
    subscribeToStoredAnalysis,
    readStoredAnalysis,
    getServerSnapshot,
  );
  const storedSetup = useSyncExternalStore(
    subscribeToStoredAnalysis,
    readStoredSetup,
    getServerSnapshot,
  );
  const analysisContext = useMemo(
    () => getStoredAnalysisContext(storedAnalysis),
    [storedAnalysis],
  );
  const profile = analysisContext?.profile ?? mockProfile;
  const baseCareerIQ = calculateCareerIQ(profile);
  const ats = calculateATS(profile);
  const baseRecruiter = calculateRecruiterConfidence(profile);
  const proof = analysisContext
    ? generateProofScore({
        profile,
        parsedProfile: analysisContext.parsedProfile,
        resumeText: analysisContext.extractedText,
        careerField: getStoredCareerField(storedSetup),
      })
    : createMissingProofScore();
  const proofAwareCareerIQ = calculateProofAwareCareerIQ(baseCareerIQ, proof);
  const careerIQ = applyCareerIQTrustCap(proofAwareCareerIQ, proof);
  const recruiter = calculateProofAwareRecruiterConfidence(
    baseRecruiter,
    proof,
  );

  return {
    profile,
    proof,
    baseCareerIQ,
    proofAwareCareerIQ,
    careerIQ,
    ats,
    baseRecruiter,
    recruiter,
    salary: estimateSalary(baseCareerIQ.score, profile),
    missions: generateMissions(profile),
    recommendations: generateRecommendations(profile),
    roleMatches: calculateRoleMatches(profile),
  };
}

function applyCareerIQTrustCap(
  careerIQ: CareerIQResult,
  proof: ReturnType<typeof generateProofScore>,
): CareerIQResult {
  const capCandidates = [
    getProofCoverageCap(proof.proofCoverageLabel),
    proof.evidenceBackedSkills.length === 0 ? 64 : 100,
    proof.proofConfidenceScore < 50 ? 64 : 100,
  ];
  const trustCap = Math.min(...capCandidates);
  const score = Math.min(careerIQ.score, trustCap);

  if (score === careerIQ.score) {
    return careerIQ;
  }

  return {
    score,
    grade: getCareerIQGrade(score),
    summary:
      `${careerIQ.summary} More evidence-backed proof is needed before this score can rise.`,
  };
}

function getProofCoverageCap(label: string): number {
  if (label === "Missing") return 54;
  if (label === "Weak") return 69;
  if (label === "Moderate") return 82;

  return 100;
}

function getCareerIQGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";

  return "C";
}

function subscribeToStoredAnalysis(
  onStoreChange: () => void,
): () => void {
  return subscribeToSkillMintWorkspaceUpdates(onStoreChange);
}

function readStoredAnalysis(): string | null {
  return getBrowserStorage()?.getItem(RESUME_ANALYSIS_STORAGE_KEY) ?? null;
}

function readStoredSetup(): string | null {
  return getBrowserStorage()?.getItem(TARGET_ROLE_SETUP_STORAGE_KEY) ??
    null;
}

function getServerSnapshot(): null {
  return null;
}

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

type StoredAnalysisContext = {
  profile: UserProfile;
  extractedText: string;
  parsedProfile: ParsedProofProfile | null;
};

function getStoredAnalysisContext(
  storedAnalysis: string | null,
): StoredAnalysisContext | null {
  if (!storedAnalysis) {
    return null;
  }

  try {
    const parsedAnalysis = JSON.parse(storedAnalysis);

    if (!isRecord(parsedAnalysis)) {
      return null;
    }

    const userProfile = parsedAnalysis.userProfile;

    if (!isUserProfile(userProfile)) {
      return null;
    }

    return {
      profile: userProfile,
      extractedText:
        typeof parsedAnalysis.extractedText === "string"
          ? parsedAnalysis.extractedText
          : "",
      parsedProfile: isParsedProofProfile(parsedAnalysis.parsedProfile)
        ? parsedAnalysis.parsedProfile
        : null,
    };
  } catch {
    return null;
  }
}

function getStoredCareerField(storedSetup: string | null): string | null {
  if (!storedSetup) {
    return null;
  }

  try {
    const parsedSetup = JSON.parse(storedSetup);

    if (!isRecord(parsedSetup)) {
      return null;
    }

    return typeof parsedSetup.careerField === "string"
      ? parsedSetup.careerField
      : null;
  } catch {
    return null;
  }
}

function isParsedProofProfile(value: unknown): value is ParsedProofProfile {
  if (!isRecord(value)) {
    return false;
  }

  return (
    (value.skills === undefined || isStringArray(value.skills)) &&
    (value.projects === undefined || isStringArray(value.projects)) &&
    (value.experience === undefined || isStringArray(value.experience)) &&
    (
      value.certifications === undefined ||
      isStringArray(value.certifications)
    ) &&
    (value.links === undefined || isRecord(value.links)) &&
    (value.rawSections === undefined || isRecord(value.rawSections))
  );
}

function isUserProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== "object") {
    return false;
  }

  const profile = value as Record<string, unknown>;

  return (
    isNumber(profile.resumeScore) &&
    isNumber(profile.skillsScore) &&
    isNumber(profile.projectsScore) &&
    isNumber(profile.experienceScore) &&
    isNumber(profile.educationScore) &&
    isNumber(profile.githubScore) &&
    isNumber(profile.linkedinScore) &&
    isNumber(profile.atsScore) &&
    isNumber(profile.recruiterScore) &&
    isNumber(profile.activityScore) &&
    isStringArray(profile.skills) &&
    isStringArray(profile.projects) &&
    isStringArray(profile.experience) &&
    typeof profile.education === "string" &&
    Array.isArray(profile.certifications) &&
    Array.isArray(profile.codingProfiles)
  );
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) &&
    value.every((item) => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" &&
    !Array.isArray(value);
}
