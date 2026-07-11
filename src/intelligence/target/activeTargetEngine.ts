import type { JobDescriptionMatchResult } from "@/intelligence/core/jobDescriptionMatch";
import type { ProofScoreResult } from "@/intelligence/proof";
import type {
  CareerIQResult,
  RoleMatchResult,
} from "@/intelligence/types/results";

import type {
  ActiveTarget,
  ActiveTargetEngineResult,
  ActiveTargetJdMatchStatus,
  ActiveTargetResumeContext,
  ActiveTargetSuggestion,
} from "./activeTargetContract";
import {
  getStaleJdMatchReason,
  isJdMatchCurrentForResume,
} from "./activeTargetResumeContext";
import {
  createActiveTargetFromLatestJd,
  createActiveTargetFromProfileFitRole,
  createActiveTargetFromUltimateGoal,
  getRecommendedPathSourceForTarget,
} from "./activeTargetSelection";

export type ActiveTargetLatestJdInput = {
  title?: string;
  companyName?: string;
  roleTitle?: string;
  jobDescription?: string;
  result: JobDescriptionMatchResult;
};

export type ActiveTargetEngineInput = {
  activeTarget?: ActiveTarget | null;
  hasResumeAnalysis: boolean;
  resumeContext?: ActiveTargetResumeContext | null;
  careerIQ?: CareerIQResult | null;
  proof?: ProofScoreResult | null;
  roleMatches?: RoleMatchResult[];
  latestJobMatch?: ActiveTargetLatestJdInput | null;
  targetRole?: string | null;
  careerField?: string | null;
};

export function buildActiveTargetEngineResult(
  input: ActiveTargetEngineInput,
): ActiveTargetEngineResult {
  const suggestions = input.hasResumeAnalysis
    ? buildActiveTargetSuggestions(input)
    : [];
  const jdMatchStatus = getJdMatchStatus(input.activeTarget, input);
  const staleJdMatchReason = getStaleJdMatchReason(
    input.activeTarget?.jdMatch,
    input.resumeContext,
  );
  const activeTarget = input.activeTarget
    ? decorateActiveTarget(
        input.activeTarget,
        input.hasResumeAnalysis,
        jdMatchStatus,
      )
    : null;
  const status = activeTarget?.status ??
    (input.hasResumeAnalysis ? "none" : "none");
  const mainGap = input.activeTarget
    ? getTargetMainGap(input.activeTarget, input)
    : getFallbackMainGap(input);
  const nextBestMove = input.activeTarget
    ? getTargetNextBestMove(input.activeTarget, input)
    : getFallbackNextBestMove(input);

  return {
    activeTarget: activeTarget
      ? {
          ...activeTarget,
          mainGap,
          nextBestMove,
        }
      : null,
    status,
    suggestions,
    primarySuggestion: suggestions.find((suggestion) => !suggestion.disabled),
    targetSummary: activeTarget
      ? getTargetSummary(activeTarget, jdMatchStatus)
      : "No Active Target yet. Set one target so SkillMint can focus missions and roadmap.",
    mainGap,
    nextBestMove,
    recommendedPathSource: getRecommendedPathSourceForTarget(activeTarget),
    jdMatchStatus,
    staleJdMatchReason,
  };
}

function decorateActiveTarget(
  target: ActiveTarget,
  hasResumeAnalysis: boolean,
  jdMatchStatus: ActiveTargetJdMatchStatus,
): ActiveTarget {
  return {
    ...target,
    jdMatch: jdMatchStatus === "current" ? target.jdMatch : undefined,
    status: hasResumeAnalysis ? "active" : "needs_resume_analysis",
  };
}

function buildActiveTargetSuggestions(
  input: ActiveTargetEngineInput,
): ActiveTargetSuggestion[] {
  const suggestions: ActiveTargetSuggestion[] = [];

  if (input.latestJobMatch) {
    const target = createActiveTargetFromLatestJd({
      title: input.latestJobMatch.title,
      companyName: input.latestJobMatch.companyName,
      roleTitle: input.latestJobMatch.roleTitle,
      jdText: input.latestJobMatch.jobDescription,
      result: input.latestJobMatch.result,
      resumeContext: input.resumeContext,
      targetRole: input.targetRole,
      careerField: input.careerField,
    });

    suggestions.push({
      id: target.id,
      source: "latest_jd",
      title: target.companyName
        ? `${target.title} at ${target.companyName}`
        : target.title,
      companyName: target.companyName,
      targetRole: target.targetRole,
      reason:
        "Use the latest pasted JD as the focus for target-specific gaps.",
    });
  }

  const topRole = input.roleMatches?.[0];

  if (topRole) {
    const target = createActiveTargetFromProfileFitRole({
      roleMatch: topRole,
      careerField: input.careerField,
    });

    suggestions.push({
      id: target.id,
      source: "profile_fit",
      title: target.title,
      targetRole: target.targetRole,
      reason:
        "Use the closest profile-fit role when no specific JD is the focus.",
    });
  }

  if (input.targetRole?.trim()) {
    const target = createActiveTargetFromUltimateGoal({
      targetRole: input.targetRole,
      careerField: input.careerField,
      closestRole: topRole?.role,
    });

    if (target) {
      suggestions.push({
        id: target.id,
        source: "ultimate_goal",
        title: target.title,
        targetRole: target.targetRole,
        reason:
          "Use your setup goal when you want missions to push toward a farther role.",
      });
    }
  }

  return suggestions;
}

function getTargetSummary(
  target: ActiveTarget,
  jdMatchStatus: ActiveTargetJdMatchStatus,
): string {
  if (target.status === "needs_resume_analysis") {
    return "Active Target is saved in this browser. Upload or restore an active resume report to focus gaps.";
  }

  if (target.source === "latest_jd" && jdMatchStatus === "stale") {
    return "This Active Target JD is saved, but its JD Match score belongs to another or unknown resume context. Re-run this JD match for the current resume.";
  }

  if (target.source === "latest_jd") {
    return target.companyName
      ? `${target.title} at ${target.companyName} is your Active Target. JD Match is based on one pasted job description.`
      : `${target.title} is your Active Target. JD Match is based on one pasted job description.`;
  }

  if (target.source === "profile_fit") {
    return `${target.title} is your Active Target from Profile-fit roles. Paste a JD for target-specific matching.`;
  }

  if (target.source === "ultimate_goal") {
    return `${target.title} is your Active Target from setup. SkillMint will keep profile-fit and JD Match separate.`;
  }

  return `${target.title} is your Active Target. Paste a JD for target-specific matching.`;
}

function getTargetMainGap(
  target: ActiveTarget,
  input: ActiveTargetEngineInput,
): string {
  if (target.status === "needs_resume_analysis") {
    return "No active resume analysis is loaded in this browser.";
  }

  if (isStaleLatestJdTarget(target, input)) {
    return "Re-run this JD match for the current resume before trusting target-specific gaps.";
  }

  if (target.source === "latest_jd" && target.jdMatch) {
    return getJdMainGap(target.jdMatch);
  }

  if (target.source === "ultimate_goal") {
    const closestRole = input.roleMatches?.[0]?.role;

    if (
      closestRole &&
      target.targetRole &&
      !closestRole.toLowerCase().includes(target.targetRole.toLowerCase())
    ) {
      return `Your current resume is closer to ${closestRole}, while this target points toward ${target.targetRole}.`;
    }
  }

  return getFallbackMainGap(input) || target.mainGap;
}

function getTargetNextBestMove(
  target: ActiveTarget,
  input: ActiveTargetEngineInput,
): string {
  if (target.status === "needs_resume_analysis") {
    return "Upload or restore your active resume report before trusting target-specific gaps.";
  }

  if (isStaleLatestJdTarget(target, input)) {
    return "Open ATS Match and analyze this JD against the active resume.";
  }

  if (target.source === "latest_jd" && target.jdMatch) {
    return getJdNextBestMove(target.jdMatch);
  }

  if (target.source !== "latest_jd") {
    return "Paste a JD to unlock target-specific gaps.";
  }

  return getFallbackNextBestMove(input) || target.nextBestMove;
}

function getJdMainGap(jdMatch: ActiveTarget["jdMatch"]): string {
  const firstMissingSkill = jdMatch?.missingSkills[0] ??
    jdMatch?.missingKeywords[0];

  if (firstMissingSkill) {
    return `${firstMissingSkill} is requested, but your resume does not show ${firstMissingSkill} usage.`;
  }

  return jdMatch?.weaknesses[0] ??
    "Add clearer proof evidence before optimizing for this target.";
}

function getJdNextBestMove(jdMatch: ActiveTarget["jdMatch"]): string {
  const firstMissingSkill = jdMatch?.missingSkills[0] ??
    jdMatch?.missingKeywords[0];

  if (firstMissingSkill) {
    return `Build or show real ${firstMissingSkill} proof before adding it to your resume.`;
  }

  return "Strengthen the most relevant proof before tailoring this resume.";
}

function getFallbackMainGap(input: ActiveTargetEngineInput): string {
  return input.careerIQ?.capsApplied?.[0]?.reason ??
    input.careerIQ?.blockers?.[0] ??
    input.proof?.blockers?.[0] ??
    input.roleMatches?.[0]?.gaps?.[0] ??
    "Add clearer proof evidence before optimizing for this target.";
}

function getFallbackNextBestMove(input: ActiveTargetEngineInput): string {
  const proofMove = input.proof?.nextProofMove;

  if (proofMove?.trim()) {
    return proofMove;
  }

  const firstGap = input.roleMatches?.[0]?.gaps?.[0];

  if (firstGap) {
    return `Build or show real ${firstGap} proof before adding it to your resume.`;
  }

  return "Build or show real proof before changing your resume.";
}

function getJdMatchStatus(
  target: ActiveTarget | null | undefined,
  input: ActiveTargetEngineInput,
): ActiveTargetJdMatchStatus {
  if (!target || target.source !== "latest_jd") {
    return "not_applicable";
  }

  if (!target.jdMatch) {
    return "missing";
  }

  return isJdMatchCurrentForResume(target.jdMatch, input.resumeContext)
    ? "current"
    : "stale";
}

function isStaleLatestJdTarget(
  target: ActiveTarget,
  input: ActiveTargetEngineInput,
): boolean {
  return target.source === "latest_jd" &&
    getJdMatchStatus(target, input) === "stale";
}
