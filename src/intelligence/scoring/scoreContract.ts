export const SCORING_VERSION = "career-iq-v2-beta";

export type ScoreLabel =
  | "Not enough usable information"
  | "Very weak proof"
  | "Early foundation"
  | "Developing"
  | "Promising profile-fit"
  | "Strong profile-fit"
  | "Exceptional proof-rich profile";

export type ScoreSignalCategory =
  | "career_direction"
  | "resume_completeness"
  | "skill_truth"
  | "project_experience"
  | "impact_outcomes"
  | "profile_fit"
  | "recruiter_ats"
  | "proof_evidence"
  | "consistency_risk";

export type ScoreSignalImpact = "positive" | "negative" | "neutral";

export type ScoreSignalSeverity =
  | "tiny"
  | "small"
  | "medium"
  | "major"
  | "critical";

export type ScoreCapReason = {
  id: string;
  maxScore: number;
  reason: string;
  evidence?: string;
};

export type ScoreSignal = {
  id: string;
  category: ScoreSignalCategory;
  impact: ScoreSignalImpact;
  severity: ScoreSignalSeverity;
  scoreImpact?: number;
  label: string;
  explanation: string;
  evidence?: string;
};

export type ScoreBreakdown = {
  score: number;
  label: string;
  explanation: string;
  drivers: string[];
  blockers: string[];
  signals?: ScoreSignal[];
  capsApplied?: ScoreCapReason[];
};

export type SkillSupportLevel =
  | "not_present"
  | "claimed_only"
  | "lightly_supported"
  | "moderately_supported"
  | "strongly_supported";

export type SkillImportance =
  | "core_target_skill"
  | "secondary_skill"
  | "nice_to_have"
  | "unrelated_or_weakly_relevant";

export type SkillTruthClassification = {
  skill: string;
  supportLevel: SkillSupportLevel;
  importance: SkillImportance;
  score: number;
  reason: string;
  evidence?: string;
};

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(Math.round(value), 0), 100);
}

export function normalizeSubscore(value: number, sourceMax: number): number {
  if (!Number.isFinite(value) || sourceMax <= 0) {
    return 0;
  }

  return clampScore((value / sourceMax) * 100);
}

export function labelScore(score: number): ScoreLabel {
  const normalizedScore = clampScore(score);

  if (normalizedScore <= 24) return "Not enough usable information";
  if (normalizedScore <= 39) return "Very weak proof";
  if (normalizedScore <= 54) return "Early foundation";
  if (normalizedScore <= 69) return "Developing";
  if (normalizedScore <= 79) return "Promising profile-fit";
  if (normalizedScore <= 89) return "Strong profile-fit";

  return "Exceptional proof-rich profile";
}

export function buildSignal(signal: ScoreSignal): ScoreSignal {
  return signal;
}

export function buildBreakdown({
  score,
  explanation,
  signals,
  capsApplied = [],
}: {
  score: number;
  explanation: string;
  signals: ScoreSignal[];
  capsApplied?: ScoreCapReason[];
}): ScoreBreakdown {
  const normalizedScore = clampScore(score);

  return {
    score: normalizedScore,
    label: labelScore(normalizedScore),
    explanation,
    drivers: summarizeDrivers(signals),
    blockers: summarizeBlockers(signals, capsApplied),
    signals,
    capsApplied,
  };
}

export function summarizeDrivers(signals: ScoreSignal[]): string[] {
  return signals
    .filter((signal) => signal.impact === "positive")
    .sort(compareSignalStrength)
    .map((signal) => signal.label)
    .slice(0, 5);
}

export function summarizeBlockers(
  signals: ScoreSignal[],
  capsApplied: ScoreCapReason[] = [],
): string[] {
  const signalBlockers = signals
    .filter((signal) => signal.impact === "negative")
    .sort(compareSignalStrength)
    .map((signal) => signal.label);
  const capBlockers = capsApplied.map((cap) => cap.reason);

  return [...capBlockers, ...signalBlockers].slice(0, 6);
}

function compareSignalStrength(a: ScoreSignal, b: ScoreSignal): number {
  return getSeverityWeight(b.severity) - getSeverityWeight(a.severity);
}

function getSeverityWeight(severity: ScoreSignalSeverity): number {
  if (severity === "critical") return 5;
  if (severity === "major") return 4;
  if (severity === "medium") return 3;
  if (severity === "small") return 2;

  return 1;
}
