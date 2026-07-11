import {
  getTopMissions,
  type MissionStatusMap,
} from "@/intelligence/missions";
import {
  getRecommendedPathSourceForTarget,
  type ActiveTarget,
} from "@/intelligence/target";

import type { RoadmapTrackGeneratorInput } from "./roadmapTrackGenerator";
import {
  buildClosestRoleTrack,
  buildLatestJdTrack,
  buildUltimateGoalTrack,
} from "./roadmapTrackGenerator";
import type { CareerPathEngineResult } from "./careerPathContract";

export type CareerPathEngineInput = RoadmapTrackGeneratorInput & {
  selectedPathId?: string | null;
  missionStatusMap?: MissionStatusMap;
  activeTarget?: ActiveTarget | null;
};

export function buildCareerPathEngineResult(
  input: CareerPathEngineInput,
): CareerPathEngineResult {
  const recommendedSource = getRecommendedPathSourceForTarget(
    input.activeTarget,
  );
  const closestRoleTrack = buildClosestRoleTrack(
    input,
    recommendedSource ? recommendedSource === "profile_fit" : true,
  );
  const latestJdTrack = buildLatestJdTrack(
    input,
    recommendedSource === "latest_jd",
  );
  const ultimateGoalTrack = buildUltimateGoalTrack(
    input,
    recommendedSource === "ultimate_goal",
  );
  const tracks = [
    closestRoleTrack,
    latestJdTrack,
    ultimateGoalTrack,
  ];
  const recommendedPathId =
    tracks.find((track) => track.recommended)?.id ??
    tracks.find((track) => track.status === "available")?.id ??
    closestRoleTrack.id;
  const selectedPathId = tracks.some((track) =>
    track.id === input.selectedPathId
  )
    ? input.selectedPathId ?? recommendedPathId
    : recommendedPathId;
  const selectedTrack = tracks.find((track) => track.id === selectedPathId) ??
    tracks.find((track) => track.id === recommendedPathId) ??
    closestRoleTrack;
  const selectedTrackMissions = selectedTrack.phases.flatMap((phase) =>
    phase.missions
  );

  return {
    recommendedPathId,
    selectedPathId,
    tracks,
    nextBestMissions: getTopMissions(selectedTrackMissions, 3),
  };
}
