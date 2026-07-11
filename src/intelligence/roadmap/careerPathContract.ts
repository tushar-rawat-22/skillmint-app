import type { Mission } from "@/intelligence/missions";

export type CareerPathSource =
  | "profile_fit"
  | "latest_jd"
  | "ultimate_goal";

export type CareerPathStatus =
  | "available"
  | "locked"
  | "empty";

export type CareerPathPhaseWindow =
  | "30_days"
  | "60_days"
  | "90_days";

export type CareerPathPhase = {
  window: CareerPathPhaseWindow;
  title: string;
  goal: string;
  missions: Mission[];
};

export type CareerPathTrack = {
  id: string;
  source: CareerPathSource;
  title: string;
  label: string;
  status: CareerPathStatus;
  targetRole?: string;
  summary: string;
  currentReality: string;
  mainGap: string;
  recommended: boolean;
  lockedReason?: string;
  nextBestMissionId?: string;
  phases: CareerPathPhase[];
  copyText?: string;
};

export type CareerPathEngineResult = {
  recommendedPathId: string;
  selectedPathId?: string;
  tracks: CareerPathTrack[];
  nextBestMissions: Mission[];
};
