import type { UserProfile } from "@/intelligence/types/profile";
import type { ProofScoreResult } from "@/intelligence/proof";

import type { Mission } from "./missionContract";

export type MissionEvidenceContext = {
  profile: UserProfile;
  proof?: ProofScoreResult;
  resumeText?: string;
};

export function isMissionEvidenceDetected(
  mission: Mission,
  context: MissionEvidenceContext,
): boolean {
  const target = mission.evidenceTarget?.trim();

  if (mission.category === "project") {
    return context.profile.projects.length > 0;
  }

  if (mission.category === "proof" || mission.category === "portfolio") {
    return Boolean(
      context.proof?.extractedProofLinks.length ||
        context.profile.github ||
        context.profile.linkedin ||
        context.profile.analysisFlags?.hasProofLink,
    );
  }

  if (mission.category === "impact") {
    return Boolean(context.profile.analysisFlags?.hasMeasurableImpact);
  }

  if (
    target &&
    (
      mission.category === "skill_backing" ||
      mission.category === "jd_match" ||
      mission.category === "goal_alignment" ||
      mission.category === "profile_fit"
    )
  ) {
    return appearsInAppliedContext(target, context);
  }

  if (mission.category === "ats" || mission.category === "resume") {
    return Boolean(
      context.profile.analysisFlags?.hasSectionClarity &&
        context.profile.atsScore >= 3,
    );
  }

  return false;
}

export function applyDetectedMissionEvidence(
  missions: Mission[],
  context: MissionEvidenceContext,
): Mission[] {
  return missions.map((mission) => {
    if (mission.status === "evidence_detected") {
      return mission;
    }

    if (!isMissionEvidenceDetected(mission, context)) {
      return mission;
    }

    return {
      ...mission,
      status: "evidence_detected",
    };
  });
}

function appearsInAppliedContext(
  target: string,
  context: MissionEvidenceContext,
): boolean {
  const normalizedTarget = normalize(target);

  if (!normalizedTarget) {
    return false;
  }

  if (appearsInStructuredAppliedSnippet(normalizedTarget, context)) {
    return true;
  }

  if (appearsInResumeAppliedChunk(normalizedTarget, context.resumeText)) {
    return true;
  }

  return hasSupportedSkillClassification(normalizedTarget, context);
}

function appearsInStructuredAppliedSnippet(
  normalizedTarget: string,
  context: MissionEvidenceContext,
): boolean {
  return getStructuredAppliedSnippets(context.profile).some((snippet) =>
    snippetContainsTarget(snippet, normalizedTarget)
  );
}

function getStructuredAppliedSnippets(profile: UserProfile): string[] {
  return [
    ...profile.projects,
    ...profile.experience,
    ...profile.certifications.map((certification) => certification.name),
    profile.education,
  ].filter((snippet) => snippet.trim().length > 0);
}

function appearsInResumeAppliedChunk(
  normalizedTarget: string,
  resumeText?: string,
): boolean {
  return splitResumeIntoChunks(resumeText).some((chunk) =>
    snippetContainsTarget(chunk, normalizedTarget) &&
      hasAppliedContextLanguage(chunk)
  );
}

function splitResumeIntoChunks(resumeText?: string): string[] {
  if (!resumeText?.trim()) {
    return [];
  }

  return resumeText
    .split(/\r?\n+|[.;!?]\s+|\s+-\s+/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
}

function snippetContainsTarget(
  snippet: string,
  normalizedTarget: string,
): boolean {
  return normalize(snippet).includes(normalizedTarget);
}

function hasAppliedContextLanguage(snippet: string): boolean {
  return /\b(project|built|created|developed|implemented|deployed|used|configured|analyzed|dashboard|intern|experience|certification|course|coursework|case study|report|designed|automated|improved|optimized|tested|launched|published|documented)\b/i
    .test(snippet);
}

function hasSupportedSkillClassification(
  normalizedTarget: string,
  context: MissionEvidenceContext,
): boolean {
  return Boolean(
    context.proof?.skillClassifications.some((classification) =>
      normalize(classification.skill) === normalizedTarget &&
        (
          classification.status === "Evidence-backed" ||
          classification.supportLevel === "moderately_supported" ||
          classification.supportLevel === "strongly_supported"
        )
    ),
  );
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#.]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
