export type MissionStatus =
  | "suggested"
  | "started"
  | "done_by_user"
  | "evidence_detected"
  | "blocked";

export type MissionCategory =
  | "proof"
  | "skill_backing"
  | "project"
  | "resume"
  | "ats"
  | "jd_match"
  | "profile_fit"
  | "goal_alignment"
  | "impact"
  | "portfolio";

export type MissionImpact = "low" | "medium" | "high" | "critical";
export type MissionDifficulty = "easy" | "medium" | "hard";

export type MissionLinkedScore =
  | "Career IQ"
  | "Proof Confidence"
  | "Skill Truth"
  | "ATS Readiness"
  | "Recruiter Confidence"
  | "Latest JD Match"
  | "Profile-fit Role Score";

export type MissionCreatedFrom =
  | "career_iq_cap"
  | "proof_blocker"
  | "skill_truth_gap"
  | "profile_fit_gap"
  | "jd_match_gap"
  | "ats_gap"
  | "goal_gap"
  | "resume_gap";

export type MissionSourcePath =
  | "profile_fit"
  | "latest_jd"
  | "ultimate_goal"
  | "global";

export type Mission = {
  id: string;
  title: string;
  category: MissionCategory;
  status: MissionStatus;
  priority: number;
  impact: MissionImpact;
  difficulty: MissionDifficulty;
  linkedScore: MissionLinkedScore;
  linkedCapId?: string;
  linkedSignalId?: string;
  sourcePath?: MissionSourcePath;
  whyThisMatters: string;
  evidenceNeeded: string;
  steps: string[];
  completionCheck: string;
  expectedOutcome: string;
  createdFrom: MissionCreatedFrom;
  copyText?: string;
  evidenceTarget?: string;
};

export type MissionStatusMap = Record<string, MissionStatus>;

export const MISSION_STATUS_VALUES: MissionStatus[] = [
  "suggested",
  "started",
  "done_by_user",
  "evidence_detected",
  "blocked",
];

export function isMissionStatus(value: unknown): value is MissionStatus {
  return typeof value === "string" &&
    MISSION_STATUS_VALUES.includes(value as MissionStatus);
}

export function makeMissionId(parts: Array<string | undefined | null>): string {
  return parts
    .filter((part): part is string => Boolean(part?.trim()))
    .map(slugifyMissionPart)
    .join(":");
}

export function slugifyMissionPart(value: string): string {
  return value
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\+/g, " plus ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}
