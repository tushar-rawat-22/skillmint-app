export type CareerLoopStage =
  | "setup"
  | "resume"
  | "job_match"
  | "roadmap"
  | "improve";

export type UpgradeInterestSource =
  | "dashboard"
  | "resume"
  | "ats"
  | "roadmap";

export interface UpgradeInterestRecord {
  id: string;
  source: UpgradeInterestSource;
  label: string;
  createdAt: string;
}
