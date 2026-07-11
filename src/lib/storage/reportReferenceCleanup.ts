import {
  RESUME_SYNC_STATUS_STORAGE_KEY,
} from "@/modules/resume/services/activeResumeReportStorage";
import {
  JD_MATCH_STORAGE_KEY,
  JD_MATCH_SYNC_STATUS_STORAGE_KEY,
} from "@/lib/storage/jdMatchCurrentStorage";
import {
  JD_MATCH_HISTORY_STORAGE_KEY,
} from "@/lib/storage/jdMatchHistory";
import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";
import {
  getBrowserStorage,
  isOwnedBrowserValue,
  safeJsonParse,
} from "@/lib/storage/ownedSkillMintStorage";

export type SyncedReportReferenceCleanupResult = {
  changedKeys: string[];
  failedKeys: string[];
};

export function detachDeletedSavedReportReferences(): SyncedReportReferenceCleanupResult {
  const storage = getBrowserStorage();
  const changedKeys: string[] = [];
  const failedKeys: string[] = [];

  if (!storage) {
    return {
      changedKeys,
      failedKeys: [
        RESUME_SYNC_STATUS_STORAGE_KEY,
        JD_MATCH_SYNC_STATUS_STORAGE_KEY,
        JD_MATCH_STORAGE_KEY,
        JD_MATCH_HISTORY_STORAGE_KEY,
      ],
    };
  }

  removeKey(storage, RESUME_SYNC_STATUS_STORAGE_KEY, changedKeys, failedKeys);
  removeKey(storage, JD_MATCH_SYNC_STATUS_STORAGE_KEY, changedKeys, failedKeys);
  detachJsonValue(storage, JD_MATCH_STORAGE_KEY, changedKeys, failedKeys);
  detachJsonArray(storage, JD_MATCH_HISTORY_STORAGE_KEY, changedKeys, failedKeys);

  if (changedKeys.length) {
    notifySkillMintWorkspaceUpdated();
  }

  return {
    changedKeys,
    failedKeys,
  };
}

function removeKey(
  storage: Storage,
  key: string,
  changedKeys: string[],
  failedKeys: string[],
) {
  try {
    if (storage.getItem(key) !== null) {
      storage.removeItem(key);
      changedKeys.push(key);
    }
  } catch {
    failedKeys.push(key);
  }
}

function detachJsonValue(
  storage: Storage,
  key: string,
  changedKeys: string[],
  failedKeys: string[],
) {
  try {
    const storedValue = storage.getItem(key);

    if (!storedValue) {
      return;
    }

    const parsedValue = safeJsonParse(storedValue);
    const nextValue = detachDatabaseMetadata(parsedValue);

    if (nextValue === parsedValue) {
      return;
    }

    storage.setItem(key, JSON.stringify(nextValue));
    changedKeys.push(key);
  } catch {
    failedKeys.push(key);
  }
}

function detachJsonArray(
  storage: Storage,
  key: string,
  changedKeys: string[],
  failedKeys: string[],
) {
  try {
    const storedValue = storage.getItem(key);

    if (!storedValue) {
      return;
    }

    const parsedValue = safeJsonParse(storedValue);
    const values = isOwnedBrowserValue(parsedValue) &&
      Array.isArray(parsedValue.value)
      ? parsedValue.value
      : Array.isArray(parsedValue)
        ? parsedValue
        : null;

    if (!values) {
      return;
    }

    const nextValues = values.map(detachDatabaseMetadata);
    const nextStoredValue = isOwnedBrowserValue(parsedValue)
      ? {
          ...parsedValue,
          value: nextValues,
          updatedAt: new Date().toISOString(),
        }
      : nextValues;

    storage.setItem(key, JSON.stringify(nextStoredValue));
    changedKeys.push(key);
  } catch {
    failedKeys.push(key);
  }
}

function detachDatabaseMetadata(value: unknown): unknown {
  if (isOwnedBrowserValue(value)) {
    return {
      ...value,
      value: detachDatabaseMetadata(value.value),
      updatedAt: new Date().toISOString(),
    };
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return value;
  }

  const nextValue = {
    ...(value as Record<string, unknown>),
  };

  if ("databaseId" in nextValue || "syncStatus" in nextValue) {
    delete nextValue.databaseId;
    delete nextValue.syncStatus;
  }

  return nextValue;
}
