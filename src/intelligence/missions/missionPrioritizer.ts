import type {
  Mission,
  MissionDifficulty,
  MissionImpact,
} from "./missionContract";

export function prioritizeMissions(missions: Mission[]): Mission[] {
  return dedupeMissions(missions)
    .sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;

      const impactDelta =
        getImpactWeight(b.impact) - getImpactWeight(a.impact);
      if (impactDelta !== 0) return impactDelta;

      return getDifficultyWeight(a.difficulty) -
        getDifficultyWeight(b.difficulty);
    })
    .map((mission, index) => ({
      ...mission,
      priority: Math.max(mission.priority, 100 - index),
    }));
}

export function getTopMissions(
  missions: Mission[],
  limit: number,
): Mission[] {
  return prioritizeMissions(missions).slice(0, limit);
}

function dedupeMissions(missions: Mission[]): Mission[] {
  const seen = new Set<string>();

  return missions.filter((mission) => {
    if (seen.has(mission.id)) {
      return false;
    }

    seen.add(mission.id);
    return true;
  });
}

function getImpactWeight(impact: MissionImpact): number {
  if (impact === "critical") return 4;
  if (impact === "high") return 3;
  if (impact === "medium") return 2;

  return 1;
}

function getDifficultyWeight(difficulty: MissionDifficulty): number {
  if (difficulty === "easy") return 1;
  if (difficulty === "medium") return 2;

  return 3;
}
