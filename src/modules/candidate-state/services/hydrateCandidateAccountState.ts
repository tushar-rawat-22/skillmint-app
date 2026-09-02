"use client";

import {
  getMissionStatusMap,
  getSelectedCareerPathId,
  setMissionStatusMap,
  setSelectedCareerPathId,
} from "@/intelligence/missions/missionStorage";
import {
  getActiveTarget,
  isActiveTarget,
  setActiveTarget,
} from "@/intelligence/target/activeTargetStorage";
import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";
import { readLatestCurrentUserCandidateState } from "./candidateAccountStateRepository";

export async function hydrateCandidateAccountStateFromAccount(
  userId: string,
): Promise<boolean> {
  const result = await readLatestCurrentUserCandidateState(userId);
  if (!result.ok || !result.data) return false;

  const context = { currentUserId: userId };
  let changed = false;

  if (!getActiveTarget(context) && isActiveTarget(result.data.activeTarget)) {
    changed = setActiveTarget(result.data.activeTarget, {
      ownerUserId: userId,
    }) || changed;
  }

  if (
    Object.keys(getMissionStatusMap(context)).length === 0 &&
    Object.keys(result.data.missionStatuses).length > 0
  ) {
    changed = setMissionStatusMap(result.data.missionStatuses, {
      currentUserId: userId,
      syncAccount: false,
    }) || changed;
  }

  if (!getSelectedCareerPathId(context) && result.data.selectedPathId) {
    changed = setSelectedCareerPathId(result.data.selectedPathId, {
      currentUserId: userId,
      syncAccount: false,
    }) || changed;
  }

  if (changed) notifySkillMintWorkspaceUpdated();
  return changed;
}
