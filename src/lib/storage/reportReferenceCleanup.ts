import {
  detachDeletedResumeSyncStatusReference,
  RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR,
} from "@/modules/resume/services/activeResumeReportStorage";
import {
  detachDeletedCurrentJobMatchReference,
  detachDeletedJobMatchSyncStatusReference,
  JD_MATCH_STORAGE_DESCRIPTOR,
  JD_MATCH_SYNC_STATUS_STORAGE_DESCRIPTOR,
} from "@/lib/storage/jdMatchCurrentStorage";
import {
  detachDeletedJobMatchHistoryReferences,
  JD_MATCH_HISTORY_STORAGE_DESCRIPTOR,
} from "@/lib/storage/jdMatchHistory";
import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";
import { updateOwnedStorageValue } from "@/lib/storage/ownedSkillMintStorage";
import type {
  BrowserOwnerContext,
  SkillMintStorageDescriptor,
} from "@/lib/storage/skillMintStorageTypes";

export type SyncedReportReferenceCleanupResult = {
  changedKeys: string[];
  unchangedKeys: string[];
  failedKeys: string[];
};

export function detachDeletedSavedReportReferences(
  context: BrowserOwnerContext,
): SyncedReportReferenceCleanupResult {
  const result: SyncedReportReferenceCleanupResult = {
    changedKeys: [],
    unchangedKeys: [],
    failedKeys: [],
  };

  recordMutation(
    RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR,
    updateOwnedStorageValue(
      RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR,
      context,
      detachDeletedResumeSyncStatusReference,
    ),
    result,
  );
  recordMutation(
    JD_MATCH_SYNC_STATUS_STORAGE_DESCRIPTOR,
    updateOwnedStorageValue(
      JD_MATCH_SYNC_STATUS_STORAGE_DESCRIPTOR,
      context,
      detachDeletedJobMatchSyncStatusReference,
    ),
    result,
  );
  recordMutation(
    JD_MATCH_STORAGE_DESCRIPTOR,
    updateOwnedStorageValue(
      JD_MATCH_STORAGE_DESCRIPTOR,
      context,
      detachDeletedCurrentJobMatchReference,
    ),
    result,
  );
  recordMutation(
    JD_MATCH_HISTORY_STORAGE_DESCRIPTOR,
    updateOwnedStorageValue(
      JD_MATCH_HISTORY_STORAGE_DESCRIPTOR,
      context,
      detachDeletedJobMatchHistoryReferences,
    ),
    result,
  );

  if (result.changedKeys.length) notifySkillMintWorkspaceUpdated();
  return result;
}

function recordMutation(
  descriptor: SkillMintStorageDescriptor,
  mutation: { ok: boolean; changed: boolean },
  result: SyncedReportReferenceCleanupResult,
) {
  if (!mutation.ok) result.failedKeys.push(descriptor.key);
  else if (mutation.changed) result.changedKeys.push(descriptor.key);
  else result.unchangedKeys.push(descriptor.key);
}
