import {
  isMissionStatus,
  type MissionStatus,
  type MissionStatusMap,
} from "./missionContract";
import {
  readVisibleStorageValue,
  writeOwnedJsonStorageValue,
  writeOwnedStringStorageValue,
} from "@/lib/storage/ownedSkillMintStorage";
import type {
  BrowserOwnerContext,
  SkillMintStorageDescriptor,
} from "@/lib/storage/skillMintStorageTypes";

export const MISSION_STATUS_STORAGE_KEY = "skillmint:mission-status:v1";
export const SELECTED_CAREER_PATH_STORAGE_KEY =
  "skillmint:selected-career-path:v1";

export const MISSION_STATUS_STORAGE_DESCRIPTOR: SkillMintStorageDescriptor = {
  key: MISSION_STATUS_STORAGE_KEY,
  version: 1,
  category: "mission",
  ownerScope: "anonymous_or_account",
  containsPersonalData: true,
  clearWithBrowserReset: true,
  exportable: true,
  importable: true,
  exportPolicy: "json_value",
  validateValue: isMissionStatusMap,
  description:
    "Browser-local mission status map; it does not verify proof or change scores.",
};

export const SELECTED_CAREER_PATH_STORAGE_DESCRIPTOR:
  SkillMintStorageDescriptor = {
    key: SELECTED_CAREER_PATH_STORAGE_KEY,
    version: 1,
    category: "mission",
    ownerScope: "anonymous_or_account",
    containsPersonalData: true,
    clearWithBrowserReset: true,
    exportable: true,
    importable: true,
    exportPolicy: "string_value",
    validateValue: isSelectedCareerPathId,
    description:
      "Browser-local selected career path ID used for roadmap display.",
};

export function isMissionStatusMap(value: unknown): value is MissionStatusMap {
  return isRecord(value) && Object.entries(value).every(
    ([missionId, status]) => missionId.trim().length > 0 && isMissionStatus(status),
  );
}

export function isSelectedCareerPathId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function getMissionStatusMap(
  options: BrowserOwnerContext = {
    currentUserId: null,
  },
): MissionStatusMap {
  const storedValue = readVisibleStorageValue(
    MISSION_STATUS_STORAGE_DESCRIPTOR,
    options,
  );

  try {
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

export function setMissionStatusMap(
  statusMap: MissionStatusMap,
  options: BrowserOwnerContext = {
    currentUserId: null,
  },
): boolean {
  return writeOwnedJsonStorageValue(
    MISSION_STATUS_STORAGE_DESCRIPTOR,
    statusMap,
    options,
  );
}

export function getMissionStatus(
  missionId: string,
  options: BrowserOwnerContext = {
    currentUserId: null,
  },
): MissionStatus | null {
  return getMissionStatusMap(options)[missionId] ?? null;
}

export function setMissionStatus(
  missionId: string,
  status: MissionStatus,
  options: BrowserOwnerContext = {
    currentUserId: null,
  },
): boolean {
  const nextStatusMap = {
    ...getMissionStatusMap(options),
    [missionId]: status,
  };

  return setMissionStatusMap(nextStatusMap, options);
}

export function getSelectedCareerPathId(
  options: BrowserOwnerContext = {
    currentUserId: null,
  },
): string | null {
  const storedValue = readVisibleStorageValue(
    SELECTED_CAREER_PATH_STORAGE_DESCRIPTOR,
    options,
  );

  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    return typeof parsedValue === "string" ? parsedValue : storedValue;
  } catch {
    return storedValue;
  }
}

export function setSelectedCareerPathId(
  pathId: string,
  options: BrowserOwnerContext = {
    currentUserId: null,
  },
): boolean {
  return writeOwnedStringStorageValue(
    SELECTED_CAREER_PATH_STORAGE_DESCRIPTOR,
    pathId,
    options,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
