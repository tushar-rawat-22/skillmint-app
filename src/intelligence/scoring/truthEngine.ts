import type { ProofScoreResult } from "@/intelligence/proof";
import type { UserProfile } from "@/intelligence/types/profile";
import type {
  CareerIQResult,
  RoleMatchResult,
} from "@/intelligence/types/results";

import { calculateATS } from "../core/ats";
import { calculateRecruiterConfidence } from "../core/recruiter";
import { calculateRoleMatches } from "../core/roleMatch";
import {
  buildBreakdown,
  buildSignal,
  clampScore,
  labelScore,
  normalizeSubscore,
  SCORING_VERSION,
  summarizeBlockers,
  summarizeDrivers,
  type ScoreBreakdown,
  type ScoreCapReason,
  type ScoreSignal,
  type SkillImportance,
  type SkillSupportLevel,
  type SkillTruthClassification,
} from "./scoreContract";

type CareerIQCategoryKey =
  | "careerDirection"
  | "resumeCompleteness"
  | "skillTruth"
  | "projectExperience"
  | "impactOutcomes"
  | "profileFitAlignment"
  | "recruiterAtsReadiness"
  | "proofEvidenceCandidate"
  | "consistencyRiskControl";

export type CareerIQCategoryScores = Record<
  CareerIQCategoryKey,
  ScoreBreakdown
>;

export type SkillTruthSummary = {
  classifications: SkillTruthClassification[];
  backedSkills: string[];
  claimedOnlySkills: string[];
  unsupportedSkillRatio: number;
  coreTargetSkillCoverage: number;
};

export type CareerIQTruthInput = {
  profile: UserProfile;
  proofScore?: ProofScoreResult;
  targetRole?: string | null;
  careerField?: string | null;
};

export type CareerIQTruthResult = CareerIQResult & {
  scoringVersion: typeof SCORING_VERSION;
  label: string;
  explanation: string;
  drivers: string[];
  blockers: string[];
  signals: ScoreSignal[];
  capsApplied: ScoreCapReason[];
  categoryScores: CareerIQCategoryScores;
  skillTruth: SkillTruthSummary;
  weightedScoreBeforeCaps: number;
};

const CAREER_IQ_WEIGHTS: Record<CareerIQCategoryKey, number> = {
  careerDirection: 0.1,
  resumeCompleteness: 0.08,
  skillTruth: 0.18,
  projectExperience: 0.2,
  impactOutcomes: 0.1,
  profileFitAlignment: 0.14,
  recruiterAtsReadiness: 0.08,
  proofEvidenceCandidate: 0.08,
  consistencyRiskControl: 0.04,
};

const TECHNICAL_ROLE_PATTERN =
  /\b(?:front|backend|full[-\s]?stack|software|engineer|developer|cloud|devops|data|ai|ml|machine learning|cyber|security)\b/i;
const ACTION_CONTEXT_PATTERN =
  /\b(?:built|created|developed|implemented|designed|deployed|integrated|optimized|automated|analyzed|led|owned|delivered|tested|used|worked|improved)\b/i;
const METRIC_PATTERN =
  /\b\d+(?:\.\d+)?\s?(?:%|x|k|users?|clients?|requests?|ms|seconds?|minutes?|hours?|stars?|repos?|repositories)\b/i;
const GENERIC_BUZZWORD_PATTERN =
  /\b(?:hardworking|passionate|dynamic|self[-\s]?motivated|team player|fast learner|go[-\s]?getter)\b/i;

const ROLE_KEYWORDS: Record<string, readonly string[]> = {
  frontend: [
    "html",
    "css",
    "javascript",
    "typescript",
    "react",
    "next.js",
    "tailwind",
    "ui",
    "accessibility",
  ],
  backend: [
    "node",
    "java",
    "python",
    "sql",
    "api",
    "database",
    "mongodb",
    "postgres",
    "express",
  ],
  "full stack": [
    "javascript",
    "typescript",
    "react",
    "node",
    "sql",
    "api",
    "database",
    "next.js",
  ],
  data: [
    "python",
    "sql",
    "excel",
    "analytics",
    "dashboard",
    "tableau",
    "power bi",
    "pandas",
  ],
  cloud: [
    "aws",
    "azure",
    "gcp",
    "docker",
    "kubernetes",
    "terraform",
    "linux",
    "ci/cd",
  ],
  ai: [
    "python",
    "machine learning",
    "deep learning",
    "tensorflow",
    "pytorch",
    "llm",
    "rag",
  ],
  security: [
    "security",
    "cybersecurity",
    "linux",
    "network",
    "audit",
    "ctf",
    "vulnerability",
  ],
  product: [
    "product",
    "prd",
    "research",
    "prototype",
    "figma",
    "metrics",
    "roadmap",
  ],
  marketing: [
    "marketing",
    "campaign",
    "seo",
    "content",
    "analytics",
    "growth",
  ],
};

export function calculateCareerIQTruth({
  profile,
  proofScore,
  targetRole,
  careerField,
}: CareerIQTruthInput): CareerIQTruthResult {
  const roleMatches = calculateRoleMatches(profile);
  const roleContext = getRoleContext(targetRole, careerField, roleMatches[0]);
  const skillTruth = classifyClaimedSkills(profile, roleContext);
  const categoryScores = buildCategoryScores({
    profile,
    proofScore,
    roleMatches,
    roleContext,
    skillTruth,
  });
  const categorySignals = Object.values(categoryScores)
    .flatMap((category) => category.signals ?? []);
  const weightedScoreBeforeCaps = Object.entries(CAREER_IQ_WEIGHTS).reduce(
    (total, [key, weight]) =>
      total + categoryScores[key as CareerIQCategoryKey].score * weight,
    0,
  );
  const capsApplied = getCareerIQCaps({
    profile,
    proofScore,
    roleContext,
    roleMatches,
    skillTruth,
    categoryScores,
    weightedScoreBeforeCaps,
  });
  const finalScore = clampScore(
    capsApplied.reduce(
      (score, cap) => Math.min(score, cap.maxScore),
      weightedScoreBeforeCaps,
    ),
  );
  const drivers = summarizeDrivers(categorySignals);
  const blockers = summarizeBlockers(categorySignals, capsApplied);

  return {
    score: finalScore,
    grade: getCareerIQGrade(finalScore),
    summary: getCareerIQSummary(finalScore, blockers),
    scoringVersion: SCORING_VERSION,
    label: labelScore(finalScore),
    explanation:
      "Career IQ is a weighted, resume-internal signal for realistic profile-fit roles. It uses claimed-versus-backed skills, applied evidence, profile-fit alignment, proof candidates, and explainable caps.",
    drivers,
    blockers,
    signals: categorySignals,
    capsApplied,
    categoryScores,
    skillTruth,
    weightedScoreBeforeCaps: clampScore(weightedScoreBeforeCaps),
  };
}

export function classifyClaimedSkills(
  profile: UserProfile,
  roleContextInput?: RoleContext,
): SkillTruthSummary {
  const roleContext = roleContextInput ?? getRoleContext(null, null, undefined);
  const projectCorpus = normalizeCorpus(profile.projects.join(" "));
  const experienceCorpus = normalizeCorpus(profile.experience.join(" "));
  const certificationCorpus = normalizeCorpus(
    profile.certifications
      .map((certification) => `${certification.name} ${certification.issuer}`)
      .join(" "),
  );
  const educationCorpus = normalizeCorpus(profile.education);
  const combinedEvidenceCorpus = normalizeCorpus([
    projectCorpus,
    experienceCorpus,
    certificationCorpus,
    educationCorpus,
  ].join(" "));
  const hasProofCandidate = hasEvidenceCandidate(profile);
  const hasMetricOrImpact = Boolean(
    profile.analysisFlags?.hasMeasurableImpact ||
      METRIC_PATTERN.test(combinedEvidenceCorpus),
  );

  const classifications = profile.skills.map((skill) => {
    const normalizedSkill = normalizeSkill(skill);
    const appearsInProject = containsSkill(projectCorpus, normalizedSkill);
    const appearsInExperience = containsSkill(
      experienceCorpus,
      normalizedSkill,
    );
    const appearsInCertification = containsSkill(
      certificationCorpus,
      normalizedSkill,
    );
    const appearsInEducation = containsSkill(educationCorpus, normalizedSkill);
    const appearsInAppliedContext =
      (appearsInProject || appearsInExperience) &&
      ACTION_CONTEXT_PATTERN.test(combinedEvidenceCorpus);
    const importance = getSkillImportance(normalizedSkill, roleContext);
    const supportLevel = getSkillSupportLevel({
      appearsInProject,
      appearsInExperience,
      appearsInCertification,
      appearsInEducation,
      appearsInAppliedContext,
      hasProofCandidate,
      hasMetricOrImpact,
    });
    const score = getSkillSupportScore(supportLevel, importance);

    return {
      skill,
      supportLevel,
      importance,
      score,
      reason: getSkillReason(supportLevel, skill),
      evidence: getSkillEvidence({
        appearsInProject,
        appearsInExperience,
        appearsInCertification,
        appearsInEducation,
        hasProofCandidate,
        hasMetricOrImpact,
      }),
    };
  });
  const claimedOnlySkills = classifications
    .filter((classification) => classification.supportLevel === "claimed_only")
    .map((classification) => classification.skill);
  const backedSkills = classifications
    .filter((classification) =>
      classification.supportLevel === "moderately_supported" ||
      classification.supportLevel === "strongly_supported"
    )
    .map((classification) => classification.skill);
  const unsupportedSkillRatio = classifications.length
    ? claimedOnlySkills.length / classifications.length
    : 1;
  const coreSkills = classifications.filter(
    (classification) => classification.importance === "core_target_skill",
  );
  const coreTargetSkillCoverage = coreSkills.length
    ? coreSkills.filter((classification) =>
        classification.supportLevel === "moderately_supported" ||
        classification.supportLevel === "strongly_supported"
      ).length / coreSkills.length
    : 0;

  return {
    classifications,
    backedSkills,
    claimedOnlySkills,
    unsupportedSkillRatio,
    coreTargetSkillCoverage,
  };
}

type CategoryInput = {
  profile: UserProfile;
  proofScore?: ProofScoreResult;
  roleMatches: RoleMatchResult[];
  roleContext: RoleContext;
  skillTruth: SkillTruthSummary;
};

type RoleContext = {
  targetRole?: string;
  careerField?: string;
  inferredRole?: string;
  keywords: string[];
};

function buildCategoryScores({
  profile,
  proofScore,
  roleMatches,
  roleContext,
  skillTruth,
}: CategoryInput): CareerIQCategoryScores {
  const topRole = roleMatches[0];

  return {
    careerDirection: scoreCareerDirection(profile, roleContext, topRole),
    resumeCompleteness: scoreResumeCompleteness(profile),
    skillTruth: scoreSkillTruth(skillTruth, profile),
    projectExperience: scoreProjectExperience(profile, skillTruth),
    impactOutcomes: scoreImpactOutcomes(profile),
    profileFitAlignment: scoreProfileFitAlignment(
      profile,
      roleMatches,
      roleContext,
      skillTruth,
    ),
    recruiterAtsReadiness: scoreRecruiterAtsReadiness(profile, skillTruth),
    proofEvidenceCandidate: scoreProofEvidenceCandidate(profile, proofScore),
    consistencyRiskControl: scoreConsistencyRiskControl(
      profile,
      roleContext,
      skillTruth,
      roleMatches,
    ),
  };
}

function scoreCareerDirection(
  profile: UserProfile,
  roleContext: RoleContext,
  topRole?: RoleMatchResult,
): ScoreBreakdown {
  const signals: ScoreSignal[] = [];
  let score = 35;

  if (roleContext.targetRole) {
    score += 18;
    signals.push(buildSignal({
      id: "target-role-present",
      category: "career_direction",
      impact: "positive",
      severity: "medium",
      scoreImpact: 18,
      label: "Target role is stated",
      explanation: `The stored setup points SkillMint toward ${roleContext.targetRole}.`,
    }));
  }

  if (topRole && topRole.matchScore >= 65) {
    score += 22;
    signals.push(buildSignal({
      id: "profile-fit-direction-clear",
      category: "career_direction",
      impact: "positive",
      severity: "medium",
      scoreImpact: 22,
      label: "Profile-fit direction is visible",
      explanation: `${topRole.role} has the strongest resume-internal fit.`,
      evidence: `${topRole.matchScore}% profile-fit score`,
    }));
  }

  if (profile.projects.length || profile.experience.length) {
    score += 12;
  }

  if (isDirectionScattered(profile, roleContext)) {
    score -= 24;
    signals.push(buildSignal({
      id: "direction-scattered",
      category: "career_direction",
      impact: "negative",
      severity: "major",
      scoreImpact: -24,
      label: "Resume direction looks scattered",
      explanation:
        "The skills list points in too many directions without enough role-aligned project or experience evidence.",
    }));
  }

  return buildBreakdown({
    score,
    explanation:
      "Checks whether the resume tells a believable role story before scoring readiness.",
    signals,
  });
}

function scoreResumeCompleteness(profile: UserProfile): ScoreBreakdown {
  const signals: ScoreSignal[] = [];
  let score =
    normalizeSubscore(profile.resumeScore, 20) * 0.52 +
    normalizeSubscore(profile.educationScore, 10) * 0.18 +
    normalizeSubscore(profile.atsScore, 5) * 0.16 +
    normalizeSubscore(profile.activityScore, 5) * 0.14;

  if (profile.analysisFlags?.hasSectionClarity) {
    score += 8;
    signals.push(buildSignal({
      id: "section-clarity",
      category: "resume_completeness",
      impact: "positive",
      severity: "small",
      scoreImpact: 8,
      label: "Resume sections are parseable",
      explanation: "SkillMint found enough section structure to read the resume quickly.",
    }));
  }

  if (profile.analysisFlags?.isPlaceholderText) {
    score = Math.min(score, 20);
    signals.push(buildSignal({
      id: "placeholder-extraction",
      category: "resume_completeness",
      impact: "negative",
      severity: "critical",
      label: "Resume text is not usable",
      explanation: "The extracted text looks like placeholder or incomplete content.",
    }));
  }

  return buildBreakdown({
    score,
    explanation:
      "Measures parseability, sections, education/contact signals, and basic formatting safety without letting formatting dominate proof.",
    signals,
  });
}

function scoreSkillTruth(
  skillTruth: SkillTruthSummary,
  profile: UserProfile,
): ScoreBreakdown {
  const signals: ScoreSignal[] = [];

  if (!skillTruth.classifications.length) {
    signals.push(buildSignal({
      id: "no-skills-detected",
      category: "skill_truth",
      impact: "negative",
      severity: "critical",
      label: "No claimed skills were detected",
      explanation: "SkillMint could not find a usable skills list to cross-check.",
    }));

    return buildBreakdown({
      score: 0,
      explanation:
        "Cross-checks claimed skills against projects, experience, certifications, and education.",
      signals,
    });
  }

  const weightedAverage =
    skillTruth.classifications.reduce(
      (total, classification) => total + classification.score,
      0,
    ) / skillTruth.classifications.length;
  let score = weightedAverage;

  if (skillTruth.unsupportedSkillRatio > 0.65) {
    score -= 18;
    signals.push(buildSignal({
      id: "unsupported-skill-ratio-high",
      category: "skill_truth",
      impact: "negative",
      severity: "critical",
      scoreImpact: -18,
      label: "Most claimed skills are unsupported",
      explanation:
        "More than 65% of listed skills do not have clear project, work, certification, or education context.",
      evidence: `${Math.round(skillTruth.unsupportedSkillRatio * 100)}% claimed-only skills`,
    }));
  }

  if (profile.skills.length >= 18 && skillTruth.backedSkills.length < 5) {
    score = Math.min(score, 45);
    signals.push(buildSignal({
      id: "keyword-stuffing-risk",
      category: "skill_truth",
      impact: "negative",
      severity: "major",
      label: "Skill list may be keyword-heavy",
      explanation:
        "A long skill list does not raise trust unless enough of those skills are backed by resume evidence.",
      evidence: `${profile.skills.length} claimed skills, ${skillTruth.backedSkills.length} backed skills`,
    }));
  }

  if (skillTruth.backedSkills.length >= 5) {
    score += 10;
    signals.push(buildSignal({
      id: "backed-core-skill-density",
      category: "skill_truth",
      impact: "positive",
      severity: "major",
      scoreImpact: 10,
      label: "Several claimed skills are backed",
      explanation:
        "SkillMint found at least five skills connected to applied resume evidence.",
      evidence: skillTruth.backedSkills.slice(0, 5).join(", "),
    }));
  }

  return buildBreakdown({
    score,
    explanation:
      "Distinguishes claimed-only skills from lightly, moderately, and strongly supported skills.",
    signals,
  });
}

function scoreProjectExperience(
  profile: UserProfile,
  skillTruth: SkillTruthSummary,
): ScoreBreakdown {
  const signals: ScoreSignal[] = [];
  let score =
    normalizeSubscore(profile.projectsScore, 15) * 0.5 +
    normalizeSubscore(profile.experienceScore, 12) * 0.28 +
    Math.min(profile.projects.length * 6, 12) +
    Math.min(profile.experience.length * 4, 8);

  if (profile.analysisFlags?.hasMeasurableImpact) {
    score += 8;
  }

  if (!profile.projects.length && !profile.experience.length) {
    score = 0;
    signals.push(buildSignal({
      id: "no-applied-evidence",
      category: "project_experience",
      impact: "negative",
      severity: "critical",
      label: "No applied work is visible",
      explanation:
        "SkillMint found no project, internship, freelance, or work evidence to support readiness.",
    }));
  }

  if (profile.analysisFlags?.hasGenericProjects) {
    score = Math.min(score, 58);
    signals.push(buildSignal({
      id: "generic-projects",
      category: "project_experience",
      impact: "negative",
      severity: "major",
      label: "Projects look generic",
      explanation:
        "Project titles or descriptions are too generic to prove meaningful applied work.",
    }));
  }

  if (skillTruth.backedSkills.length >= 4 && profile.projects.length >= 2) {
    signals.push(buildSignal({
      id: "skills-used-in-applied-work",
      category: "project_experience",
      impact: "positive",
      severity: "major",
      label: "Projects support claimed skills",
      explanation:
        "Multiple backed skills appear connected to project or experience evidence.",
    }));
  }

  return buildBreakdown({
    score,
    explanation:
      "Measures whether the resume shows applied work, not just a skill inventory.",
    signals,
  });
}

function scoreImpactOutcomes(profile: UserProfile): ScoreBreakdown {
  const signals: ScoreSignal[] = [];
  let score = 25;

  if (profile.analysisFlags?.hasMeasurableImpact) {
    score += 38;
    signals.push(buildSignal({
      id: "measurable-impact",
      category: "impact_outcomes",
      impact: "positive",
      severity: "major",
      scoreImpact: 38,
      label: "Measurable outcomes are present",
      explanation:
        "The resume includes numbers, scale, performance, users, or other outcome language.",
    }));
  } else {
    signals.push(buildSignal({
      id: "missing-measurable-impact",
      category: "impact_outcomes",
      impact: "negative",
      severity: "medium",
      label: "Outcomes are thin",
      explanation:
        "The resume describes work, but does not show enough results, scale, or measurable impact.",
    }));
  }

  score += Math.min((profile.achievementScore ?? 0) * 2.2, 16);
  score += Math.min((profile.leadershipScore ?? 0) * 1.4, 10);
  score += Math.min((profile.researchScore ?? 0) * 1.4, 8);
  score += Math.min((profile.openSourceScore ?? 0) * 1.2, 8);

  return buildBreakdown({
    score,
    explanation:
      "Checks whether the resume proves results through metrics, scale, leadership, research, or achievements.",
    signals,
  });
}

function scoreProfileFitAlignment(
  profile: UserProfile,
  roleMatches: RoleMatchResult[],
  roleContext: RoleContext,
  skillTruth: SkillTruthSummary,
): ScoreBreakdown {
  const signals: ScoreSignal[] = [];
  const topRole = roleMatches[0];
  const targetFit = getTargetRoleFit(roleMatches, roleContext.targetRole);
  let score = targetFit?.matchScore ?? topRole?.matchScore ?? 0;

  if (topRole) {
    signals.push(buildSignal({
      id: "top-profile-fit-role",
      category: "profile_fit",
      impact: topRole.matchScore >= 60 ? "positive" : "neutral",
      severity: "medium",
      label: `${topRole.role} is the strongest profile-fit role`,
      explanation:
        "Profile-fit roles are based on the whole resume and remain separate from Latest JD Match.",
      evidence: `${Math.round(topRole.matchScore)}% profile-fit score`,
    }));
  }

  if (roleContext.targetRole && targetFit && targetFit.matchScore < 45) {
    score = Math.min(score, 45);
    signals.push(buildSignal({
      id: "target-role-evidence-mismatch",
      category: "profile_fit",
      impact: "negative",
      severity: "major",
      label: "Target role is not backed strongly yet",
      explanation:
        "The stored target role has weaker resume evidence than the strongest profile-fit direction.",
      evidence: `${roleContext.targetRole}: ${Math.round(targetFit.matchScore)}%`,
    }));
  }

  if (skillTruth.coreTargetSkillCoverage > 0.6) {
    score += 8;
  }

  if (!profile.projects.length && profile.experienceScore === 0) {
    score = Math.min(score, 45);
  }

  return buildBreakdown({
    score,
    explanation:
      "Scores realistic role alignment from resume evidence, not from one pasted JD.",
    signals,
  });
}

function scoreRecruiterAtsReadiness(
  profile: UserProfile,
  skillTruth: SkillTruthSummary,
): ScoreBreakdown {
  const ats = calculateATS(profile);
  const recruiter = calculateRecruiterConfidence(profile);
  const signals: ScoreSignal[] = [];
  let score = ats.score * 0.5 + recruiter.score * 0.5;

  if (ats.score >= 70 && skillTruth.unsupportedSkillRatio > 0.65) {
    score = Math.min(score, 62);
    signals.push(buildSignal({
      id: "ats-keyword-proof-gap",
      category: "recruiter_ats",
      impact: "negative",
      severity: "major",
      label: "ATS keywords outpace proof",
      explanation:
        "The resume may parse reasonably, but claimed skills still need stronger backing.",
      evidence: `${ats.score}% ATS readiness`,
    }));
  }

  return buildBreakdown({
    score,
    explanation:
      "Measures parser and recruiter scan clarity while limiting keyword-only inflation.",
    signals,
  });
}

function scoreProofEvidenceCandidate(
  profile: UserProfile,
  proofScore?: ProofScoreResult,
): ScoreBreakdown {
  const signals: ScoreSignal[] = [];
  const linkCount = proofScore?.extractedProofLinks.length ??
    [
      profile.github,
      profile.linkedin,
      profile.analysisFlags?.hasProofLink ? "proof-link" : undefined,
    ].filter(Boolean).length;
  let score =
    (profile.github ? 22 : 0) +
    (profile.linkedin ? 10 : 0) +
    (profile.analysisFlags?.hasProofLink ? 16 : 0) +
    Math.min(linkCount * 8, 28) +
    normalizeSubscore(profile.githubScore, 8) * 0.16 +
    normalizeSubscore(profile.activityScore, 5) * 0.12;

  if (proofScore) {
    score = score * 0.72 + proofScore.proofConfidenceScore * 0.28;
  }

  if (linkCount > 0) {
    signals.push(buildSignal({
      id: "evidence-candidates-found",
      category: "proof_evidence",
      impact: "positive",
      severity: "medium",
      label: "Evidence candidates are present",
      explanation:
        "The resume contains links or artifacts that may support claims. They are not external verification.",
      evidence: `${linkCount} evidence candidate${linkCount === 1 ? "" : "s"}`,
    }));
  } else {
    signals.push(buildSignal({
      id: "no-evidence-candidates",
      category: "proof_evidence",
      impact: "negative",
      severity: "major",
      label: "No evidence candidates found",
      explanation:
        "SkillMint did not find GitHub, portfolio, live app, dashboard, report, certificate, or similar proof-candidate links.",
    }));
  }

  return buildBreakdown({
    score,
    explanation:
      "Scores evidence candidates such as links, public artifacts, dashboards, reports, and proof-bearing profiles.",
    signals,
  });
}

function scoreConsistencyRiskControl(
  profile: UserProfile,
  roleContext: RoleContext,
  skillTruth: SkillTruthSummary,
  roleMatches: RoleMatchResult[],
): ScoreBreakdown {
  const signals: ScoreSignal[] = [];
  let score = 84;

  if (profile.analysisFlags?.isPlaceholderText) {
    score = 20;
    signals.push(buildSignal({
      id: "placeholder-risk",
      category: "consistency_risk",
      impact: "negative",
      severity: "critical",
      label: "Resume extraction is unusable",
      explanation:
        "The extracted resume text does not provide enough trustworthy internal evidence.",
    }));
  }

  if (skillTruth.unsupportedSkillRatio > 0.65) {
    score -= 22;
  }

  if (isDirectionScattered(profile, roleContext)) {
    score -= 18;
  }

  if (
    roleContext.targetRole &&
    getTargetRoleFit(roleMatches, roleContext.targetRole)?.matchScore !==
      undefined &&
    (getTargetRoleFit(roleMatches, roleContext.targetRole)?.matchScore ?? 0) <
      45
  ) {
    score -= 16;
    signals.push(buildSignal({
      id: "target-fit-consistency-risk",
      category: "consistency_risk",
      impact: "negative",
      severity: "major",
      label: "Target role and resume evidence do not fully align",
      explanation:
        "The resume may need role-specific projects or proof before this target direction becomes believable.",
    }));
  }

  if (GENERIC_BUZZWORD_PATTERN.test(profile.projects.join(" "))) {
    score -= 8;
  }

  return buildBreakdown({
    score,
    explanation:
      "Controls for contradictions, scattered direction, unsupported claims, and generic filler.",
    signals,
  });
}

type CapInput = {
  profile: UserProfile;
  proofScore?: ProofScoreResult;
  roleContext: RoleContext;
  roleMatches: RoleMatchResult[];
  skillTruth: SkillTruthSummary;
  categoryScores: CareerIQCategoryScores;
  weightedScoreBeforeCaps: number;
};

function getCareerIQCaps({
  profile,
  proofScore,
  roleContext,
  roleMatches,
  skillTruth,
  categoryScores,
  weightedScoreBeforeCaps,
}: CapInput): ScoreCapReason[] {
  const caps: ScoreCapReason[] = [];
  const hasAppliedEvidence =
    profile.projects.length > 0 || profile.experience.length > 0;
  const hasRoleRelevantProof =
    hasAppliedEvidence || hasEvidenceCandidate(profile);
  const topRole = roleMatches[0];
  const targetFit = getTargetRoleFit(roleMatches, roleContext.targetRole);

  if (!hasUsableProfile(profile)) {
    caps.push({
      id: "no-usable-resume-text",
      maxScore: 25,
      reason: "No usable resume text or structured evidence was found.",
    });
  }

  if (
    profile.education &&
    profile.skills.length > 0 &&
    !profile.projects.length &&
    !profile.experience.length
  ) {
    caps.push({
      id: "education-skills-only",
      maxScore: 55,
      reason:
        "The resume shows education and skills, but no project or experience evidence.",
    });
  }

  if (!profile.projects.length && !profile.experience.length && !hasRoleRelevantProof) {
    caps.push({
      id: "no-applied-or-role-proof",
      maxScore: 45,
      reason:
        "No projects, experience, or role-relevant proof candidates were detected.",
    });
  }

  if (
    isTechnicalRole(roleContext, topRole) &&
    !hasAppliedEvidence &&
    profile.experienceScore === 0
  ) {
    caps.push({
      id: "technical-fresher-no-applied-evidence",
      maxScore: 58,
      reason:
        "A technical fresher direction needs at least one role-relevant project or internship signal.",
    });
  }

  if (
    categoryScores.careerDirection.score < 55 ||
    isDirectionScattered(profile, roleContext)
  ) {
    caps.push({
      id: "unclear-or-scattered-direction",
      maxScore: 72,
      reason: "Target direction is unclear or scattered across unrelated claims.",
    });
  }

  if (proofScore && proofScore.proofConfidenceScore < 25) {
    caps.push({
      id: "proof-confidence-below-25",
      maxScore: 68,
      reason: "Proof Confidence is below 25, so Career IQ cannot rise too high.",
      evidence: `${proofScore.proofConfidenceScore}% Proof Confidence`,
    });
  }

  if (skillTruth.unsupportedSkillRatio > 0.65) {
    caps.push({
      id: "unsupported-claimed-skills-over-65",
      maxScore: 62,
      reason:
        "More than 65% of claimed skills are not backed by resume evidence.",
      evidence: `${Math.round(skillTruth.unsupportedSkillRatio * 100)}% claimed-only skills`,
    });
  }

  if (
    categoryScores.recruiterAtsReadiness.score >= 70 &&
    (
      categoryScores.skillTruth.score < 45 ||
      categoryScores.projectExperience.score < 42
    )
  ) {
    caps.push({
      id: "strong-keywords-weak-evidence",
      maxScore: 70,
      reason:
        "Parser/recruiter keywords are stronger than the underlying proof evidence.",
    });
  }

  if (roleContext.targetRole && targetFit && targetFit.matchScore < 45) {
    caps.push({
      id: "target-role-evidence-contradiction",
      maxScore: 65,
      reason:
        "The claimed target direction is not yet supported by the strongest resume evidence.",
      evidence: `${roleContext.targetRole}: ${Math.round(targetFit.matchScore)}% profile-fit`,
    });
  }

  if (
    categoryScores.resumeCompleteness.score >= 72 &&
    (
      categoryScores.skillTruth.score < 42 ||
      categoryScores.proofEvidenceCandidate.score < 35
    )
  ) {
    caps.push({
      id: "good-formatting-weak-proof",
      maxScore: 65,
      reason:
        "Good resume structure cannot overcome weak proof for claimed skills.",
    });
  }

  if (
    categoryScores.resumeCompleteness.score < 45 &&
    categoryScores.projectExperience.score >= 78 &&
    categoryScores.skillTruth.score >= 70 &&
    weightedScoreBeforeCaps >= 78
  ) {
    return caps.filter((cap) => cap.id !== "unclear-or-scattered-direction");
  }

  return dedupeCaps(caps);
}

function getRoleContext(
  targetRole: string | null | undefined,
  careerField: string | null | undefined,
  topRole?: RoleMatchResult,
): RoleContext {
  const roleText = normalizeCorpus(
    [targetRole, careerField, topRole?.role].filter(Boolean).join(" "),
  );
  const keywords = Object.entries(ROLE_KEYWORDS)
    .filter(([roleKey]) => roleText.includes(roleKey))
    .flatMap(([, terms]) => terms);

  return {
    targetRole: targetRole?.trim() || undefined,
    careerField: careerField?.trim() || undefined,
    inferredRole: topRole?.role,
    keywords: uniqueStrings(keywords),
  };
}

function getSkillSupportLevel({
  appearsInProject,
  appearsInExperience,
  appearsInCertification,
  appearsInEducation,
  appearsInAppliedContext,
  hasProofCandidate,
  hasMetricOrImpact,
}: {
  appearsInProject: boolean;
  appearsInExperience: boolean;
  appearsInCertification: boolean;
  appearsInEducation: boolean;
  appearsInAppliedContext: boolean;
  hasProofCandidate: boolean;
  hasMetricOrImpact: boolean;
}): SkillSupportLevel {
  if (
    appearsInAppliedContext &&
    hasProofCandidate &&
    (hasMetricOrImpact || appearsInExperience)
  ) {
    return "strongly_supported";
  }

  if (appearsInAppliedContext || (appearsInExperience && hasMetricOrImpact)) {
    return "moderately_supported";
  }

  if (
    appearsInProject ||
    appearsInExperience ||
    appearsInCertification ||
    appearsInEducation
  ) {
    return "lightly_supported";
  }

  return "claimed_only";
}

function getSkillSupportScore(
  supportLevel: SkillSupportLevel,
  importance: SkillImportance,
): number {
  const baseScores: Record<SkillSupportLevel, number> = {
    not_present: 0,
    claimed_only: 12,
    lightly_supported: 42,
    moderately_supported: 72,
    strongly_supported: 94,
  };
  const importanceMultiplier: Record<SkillImportance, number> = {
    core_target_skill: 1.1,
    secondary_skill: 1,
    nice_to_have: 0.88,
    unrelated_or_weakly_relevant: 0.68,
  };

  return clampScore(baseScores[supportLevel] * importanceMultiplier[importance]);
}

function getSkillImportance(
  normalizedSkill: string,
  roleContext: RoleContext,
): SkillImportance {
  if (
    roleContext.keywords.some((keyword) =>
      containsSkill(keyword, normalizedSkill) ||
      containsSkill(normalizedSkill, keyword)
    )
  ) {
    return "core_target_skill";
  }

  if (
    Object.values(ROLE_KEYWORDS).some((keywords) =>
      keywords.some((keyword) =>
        containsSkill(keyword, normalizedSkill) ||
        containsSkill(normalizedSkill, keyword)
      )
    )
  ) {
    return "secondary_skill";
  }

  if (normalizedSkill.length > 2) {
    return "nice_to_have";
  }

  return "unrelated_or_weakly_relevant";
}

function getSkillReason(
  supportLevel: SkillSupportLevel,
  skill: string,
): string {
  if (supportLevel === "strongly_supported") {
    return `${skill} appears in applied context with proof-candidate or measurable evidence.`;
  }

  if (supportLevel === "moderately_supported") {
    return `${skill} appears in project or experience action context.`;
  }

  if (supportLevel === "lightly_supported") {
    return `${skill} appears outside the skills list, but proof depth is still thin.`;
  }

  if (supportLevel === "not_present") {
    return `${skill} was not detected in the resume.`;
  }

  return `${skill} is listed, but the resume does not show where it was used.`;
}

function getSkillEvidence({
  appearsInProject,
  appearsInExperience,
  appearsInCertification,
  appearsInEducation,
  hasProofCandidate,
  hasMetricOrImpact,
}: {
  appearsInProject: boolean;
  appearsInExperience: boolean;
  appearsInCertification: boolean;
  appearsInEducation: boolean;
  hasProofCandidate: boolean;
  hasMetricOrImpact: boolean;
}): string | undefined {
  const evidence = [
    appearsInProject ? "project context" : undefined,
    appearsInExperience ? "experience context" : undefined,
    appearsInCertification ? "certification/course context" : undefined,
    appearsInEducation ? "education/coursework context" : undefined,
    hasProofCandidate ? "evidence candidate link" : undefined,
    hasMetricOrImpact ? "measurable outcome language" : undefined,
  ].filter(Boolean);

  return evidence.length ? evidence.join(", ") : undefined;
}

function getCareerIQGrade(score: number): string {
  if (score >= 90) return "A+";
  if (score >= 80) return "A";
  if (score >= 70) return "B+";
  if (score >= 60) return "B";

  return "C";
}

function getCareerIQSummary(score: number, blockers: string[]): string {
  const label = labelScore(score);
  const blocker = blockers[0];

  if (blocker) {
    return `Career IQ: ${label}. Main limiter: ${blocker}`;
  }

  return `Career IQ: ${label}. This is based on resume evidence, not a job guarantee.`;
}

function hasUsableProfile(profile: UserProfile): boolean {
  if (profile.analysisFlags?.isPlaceholderText) {
    return false;
  }

  return Boolean(
    profile.skills.length ||
      profile.projects.length ||
      profile.experience.length ||
      profile.education ||
      profile.resumeScore > 0,
  );
}

function hasEvidenceCandidate(profile: UserProfile): boolean {
  return Boolean(
    profile.github ||
      profile.linkedin ||
      profile.analysisFlags?.hasProofLink ||
      profile.codingProfiles.length ||
      profile.certifications.length ||
      (profile.openSourceScore ?? 0) > 0 ||
      (profile.researchScore ?? 0) > 0,
  );
}

function isTechnicalRole(
  roleContext: RoleContext,
  topRole?: RoleMatchResult,
): boolean {
  return TECHNICAL_ROLE_PATTERN.test(
    [roleContext.targetRole, roleContext.careerField, topRole?.role]
      .filter(Boolean)
      .join(" "),
  );
}

function isDirectionScattered(
  profile: UserProfile,
  roleContext: RoleContext,
): boolean {
  if (profile.skills.length < 10) {
    return false;
  }

  const skillText = normalizeCorpus(profile.skills.join(" "));
  const roleFamilyHits = Object.values(ROLE_KEYWORDS).filter((keywords) =>
    keywords.some((keyword) => containsSkill(skillText, keyword)),
  ).length;
  const roleKeywordHits = roleContext.keywords.filter((keyword) =>
    containsSkill(skillText, keyword),
  ).length;

  return (
    roleFamilyHits >= 4 &&
    roleKeywordHits <= 2 &&
    profile.projects.length <= 1 &&
    profile.experience.length === 0
  );
}

function getTargetRoleFit(
  roleMatches: RoleMatchResult[],
  targetRole?: string,
): RoleMatchResult | undefined {
  if (!targetRole) {
    return undefined;
  }

  const normalizedTarget = normalizeCorpus(targetRole);

  return roleMatches.find((match) =>
    normalizeCorpus(match.role).includes(normalizedTarget) ||
      normalizedTarget.includes(normalizeCorpus(match.role).split(" ")[0] ?? "")
  );
}

function normalizeSkill(value: string): string {
  return normalizeCorpus(value)
    .replace(/\bnode js\b/g, "node")
    .replace(/\bnext js\b/g, "next.js")
    .replace(/\breact js\b/g, "react");
}

function normalizeCorpus(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#./]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function containsSkill(corpus: string, skill: string): boolean {
  if (!corpus || !skill) {
    return false;
  }

  const normalizedCorpus = ` ${normalizeCorpus(corpus)} `;
  const normalizedSkill = ` ${normalizeSkill(skill)} `;

  return normalizedCorpus.includes(normalizedSkill) ||
    normalizedCorpus.includes(normalizedSkill.replace(".", " "));
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeSkill).filter(Boolean)));
}

function dedupeCaps(caps: ScoreCapReason[]): ScoreCapReason[] {
  const seen = new Set<string>();

  return caps.filter((cap) => {
    if (seen.has(cap.id)) {
      return false;
    }

    seen.add(cap.id);
    return true;
  });
}
