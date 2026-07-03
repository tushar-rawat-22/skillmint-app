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
import type { UserProfile } from "@/intelligence/types/profile";

const RESUME_ANALYSIS_STORAGE_KEY = "skillmint:resume-analysis";

export function useCareerData() {
  const storedAnalysis = useSyncExternalStore(
    subscribeToStoredAnalysis,
    readStoredAnalysis,
    getServerSnapshot,
  );
  const profile = useMemo(
    () => getStoredUserProfile(storedAnalysis) ?? mockProfile,
    [storedAnalysis],
  );

  const careerIQ = calculateCareerIQ(profile);

  return {
    profile,
    careerIQ,
    ats: calculateATS(profile),
    recruiter: calculateRecruiterConfidence(profile),
    salary: estimateSalary(careerIQ.score, profile),
    missions: generateMissions(profile),
    recommendations: generateRecommendations(profile),
    roleMatches: calculateRoleMatches(profile),
  };
}

function subscribeToStoredAnalysis(
  onStoreChange: () => void,
): () => void {
  window.addEventListener("storage", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
  };
}

function readStoredAnalysis(): string | null {
  return getBrowserStorage()?.getItem(RESUME_ANALYSIS_STORAGE_KEY) ?? null;
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

function getStoredUserProfile(
  storedAnalysis: string | null,
): UserProfile | null {
  if (!storedAnalysis) {
    return null;
  }

  try {
    const parsedAnalysis = JSON.parse(storedAnalysis);
    const userProfile = (parsedAnalysis as Record<string, unknown>)
      .userProfile;

    return isUserProfile(userProfile) ? userProfile : null;
  } catch {
    return null;
  }
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
