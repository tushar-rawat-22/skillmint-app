import {
  getTopMissions,
  type MissionStatusMap,
} from "@/intelligence/missions";

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
};

export function buildCareerPathEngineResult(
  input: CareerPathEngineInput,
): CareerPathEngineResult {
  const closestRoleTrack = buildClosestRoleTrack(input, true);
  const latestJdTrack = buildLatestJdTrack(input, false);
  const ultimateGoalTrack = buildUltimateGoalTrack(input, false);
  const tracks = [
    closestRoleTrack,
    latestJdTrack,
    ultimateGoalTrack,
  ];
  const recommendedPathId =
    tracks.find((track) => track.recommended && track.status === "available")
      ?.id ??
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
