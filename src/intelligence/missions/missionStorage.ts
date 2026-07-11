import {
  isMissionStatus,
  type MissionStatus,
  type MissionStatusMap,
} from "./missionContract";

export const MISSION_STATUS_STORAGE_KEY = "skillmint:mission-status:v1";
export const SELECTED_CAREER_PATH_STORAGE_KEY =
  "skillmint:selected-career-path:v1";

export function getMissionStatusMap(): MissionStatusMap {
  const storage = getBrowserStorage();

  if (!storage) {
    return {};
  }

  try {
    const storedValue = storage.getItem(MISSION_STATUS_STORAGE_KEY);

    if (!storedValue) {
      return {};
    }

    const parsedValue = JSON.parse(storedValue);

    if (!isRecord(parsedValue)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(parsedValue).filter((entry): entry is [string, MissionStatus] =>
        typeof entry[0] === "string" && isMissionStatus(entry[1])
      ),
    );
  } catch {
    return {};
  }
}

export function setMissionStatusMap(statusMap: MissionStatusMap): boolean {
  const storage = getBrowserStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(MISSION_STATUS_STORAGE_KEY, JSON.stringify(statusMap));
    return true;
  } catch {
    return false;
  }
}

export function getMissionStatus(missionId: string): MissionStatus | null {
  return getMissionStatusMap()[missionId] ?? null;
}

export function setMissionStatus(
  missionId: string,
  status: MissionStatus,
): boolean {
  const nextStatusMap = {
    ...getMissionStatusMap(),
    [missionId]: status,
  };

  return setMissionStatusMap(nextStatusMap);
}

export function getSelectedCareerPathId(): string | null {
  const storage = getBrowserStorage();

  if (!storage) {
    return null;
  }

  try {
    return storage.getItem(SELECTED_CAREER_PATH_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setSelectedCareerPathId(pathId: string): boolean {
  const storage = getBrowserStorage();

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(SELECTED_CAREER_PATH_STORAGE_KEY, pathId);
    return true;
  } catch {
    return false;
  }
}

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
