import {
  MISSION_STATUS_STORAGE_DESCRIPTOR,
  isMissionStatusMap,
} from "@/intelligence/missions/missionStorage";
import {
  ACTIVE_TARGET_STORAGE_DESCRIPTOR,
  isActiveTarget,
} from "@/intelligence/target/activeTargetStorage";
import {
  classifyStoredValue,
  getBrowserStorage,
  getClassifiedOwnerPartition,
} from "@/lib/storage/ownedSkillMintStorage";
import {
  getBrowserDataOwner,
  type BrowserOwnerContext,
} from "@/lib/storage/skillMintStorageTypes";

export function hasRoadmapActionAfterActiveTarget(
  context: BrowserOwnerContext,
): boolean {
  const storage = getBrowserStorage();
  const owner = getBrowserDataOwner(context.currentUserId);

  if (!storage || !owner) {
    return false;
  }

  try {
    const activeTargetPartition = getClassifiedOwnerPartition(
      classifyStoredValue(
        storage.getItem(ACTIVE_TARGET_STORAGE_DESCRIPTOR.key),
        ACTIVE_TARGET_STORAGE_DESCRIPTOR,
      ),
      owner,
    );
    const missionStatusPartition = getClassifiedOwnerPartition(
      classifyStoredValue(
        storage.getItem(MISSION_STATUS_STORAGE_DESCRIPTOR.key),
        MISSION_STATUS_STORAGE_DESCRIPTOR,
      ),
      owner,
    );

    if (
      !activeTargetPartition ||
      !missionStatusPartition ||
      !isActiveTarget(activeTargetPartition.value) ||
      activeTargetPartition.value.status !== "active" ||
      !isMissionStatusMap(missionStatusPartition.value)
    ) {
      return false;
    }

    const hasIntentionalAction = Object.values(missionStatusPartition.value).some(
      (status) =>
        status === "started" ||
        status === "done_by_user" ||
        status === "blocked",
    );

    if (!hasIntentionalAction) {
      return false;
    }

    const activeTargetSelectedAt = Date.parse(activeTargetPartition.updatedAt);
    const missionStatusUpdatedAt = Date.parse(missionStatusPartition.updatedAt);

    return Number.isFinite(activeTargetSelectedAt) &&
      Number.isFinite(missionStatusUpdatedAt) &&
      missionStatusUpdatedAt >= activeTargetSelectedAt;
  } catch {
    return false;
  }
}
