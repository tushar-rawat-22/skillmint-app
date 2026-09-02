import {
  isMissionStatus,
  type MissionStatus,
  type MissionStatusMap,
} from "./missionContract";
import { getActiveTarget } from "@/intelligence/target/activeTargetStorage";
import {
  readVisibleStorageValue,
  writeOwnedJsonStorageValue,
  writeOwnedStringStorageValue,
} from "@/lib/storage/ownedSkillMintStorage";
import type {
  BrowserOwnerContext,
  SkillMintStorageDescriptor,
} from "@/lib/storage/skillMintStorageTypes";
import { syncLatestCurrentUserCandidateState } from "@/modules/candidate-state/services/candidateAccountStateRepository";

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
    "Browser-local mission status map; signed-in activation state is also reconciled with the latest saved job match.",
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
      "Selected career path ID used for roadmap display and signed-in activation continuity.",
  };

type MissionStorageOptions = BrowserOwnerContext & {
  syncAccount?: boolean;
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
  options: BrowserOwnerContext = { currentUserId: null },
): MissionStatusMap {
  const storedValue = readVisibleStorageValue(
    MISSION_STATUS_STORAGE_DESCRIPTOR,
    options,
  );
  try {
    if (!storedValue) return {};
    const parsedValue = JSON.parse(storedValue);
    if (!isRecord(parsedValue)) return {};
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
  options: MissionStorageOptions = { currentUserId: null },
): boolean {
  const didWrite = writeOwnedJsonStorageValue(
    MISSION_STATUS_STORAGE_DESCRIPTOR,
    statusMap,
    options,
  );
  if (didWrite && options.syncAccount !== false) {
    void syncCandidateState(options, statusMap, getSelectedCareerPathId(options));
  }
  return didWrite;
}

export function getMissionStatus(
  missionId: string,
  options: BrowserOwnerContext = { currentUserId: null },
): MissionStatus | null {
  return getMissionStatusMap(options)[missionId] ?? null;
}

export function setMissionStatus(
  missionId: string,
  status: MissionStatus,
  options: MissionStorageOptions = { currentUserId: null },
): boolean {
  return setMissionStatusMap(
    { ...getMissionStatusMap(options), [missionId]: status },
    options,
  );
}

export function getSelectedCareerPathId(
  options: BrowserOwnerContext = { currentUserId: null },
): string | null {
  const storedValue = readVisibleStorageValue(
    SELECTED_CAREER_PATH_STORAGE_DESCRIPTOR,
    options,
  );
  if (!storedValue) return null;
  try {
    const parsedValue = JSON.parse(storedValue);
    return typeof parsedValue === "string" ? parsedValue : storedValue;
  } catch {
    return storedValue;
  }
}

export function setSelectedCareerPathId(
  pathId: string,
  options: MissionStorageOptions = { currentUserId: null },
): boolean {
  const didWrite = writeOwnedStringStorageValue(
    SELECTED_CAREER_PATH_STORAGE_DESCRIPTOR,
    pathId,
    options,
  );
  if (didWrite && options.syncAccount !== false) {
    void syncCandidateState(options, getMissionStatusMap(options), pathId);
  }
  return didWrite;
}

async function syncCandidateState(
  options: MissionStorageOptions,
  missionStatuses: MissionStatusMap,
  selectedPathId: string | null,
) {
  const userId = typeof options.currentUserId === "string"
    ? options.currentUserId.trim()
    : "";
  if (!userId) return;

  await syncLatestCurrentUserCandidateState(userId, {
    activeTarget: getActiveTarget({ currentUserId: userId }),
    missionStatuses,
    selectedPathId,
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
