import {
  ACTIVE_TARGET_STORAGE_DESCRIPTOR,
} from "@/intelligence/target/activeTargetStorage";
import {
  MISSION_STATUS_STORAGE_DESCRIPTOR,
  SELECTED_CAREER_PATH_STORAGE_DESCRIPTOR,
} from "@/intelligence/missions/missionStorage";
import {
  BETA_FEEDBACK_STORAGE_DESCRIPTOR,
} from "@/modules/feedback/services/feedbackLocalStorage";
import {
  TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR,
} from "@/modules/onboarding/storage/targetRoleSetupStorage";
import {
  ONBOARDING_DISMISSED_STORAGE_DESCRIPTOR,
} from "@/modules/onboarding/storage/onboardingStorage";
import {
  UPGRADE_INTEREST_STORAGE_DESCRIPTOR,
} from "@/modules/activation/storage/upgradeInterestStorage";
import {
  ACTIVE_RESUME_ANALYSIS_STORAGE_DESCRIPTOR,
  RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR,
} from "@/modules/resume/services/activeResumeReportStorage";
import {
  JD_MATCH_HISTORY_STORAGE_DESCRIPTOR,
} from "@/lib/storage/jdMatchHistory";
import {
  JD_MATCH_STORAGE_DESCRIPTOR,
  JD_MATCH_SYNC_STATUS_STORAGE_DESCRIPTOR,
} from "@/lib/storage/jdMatchCurrentStorage";
import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";
import type {
  BrowserDataOwner,
  BrowserOwnerContext,
  SkillMintStorageCategory,
  SkillMintStorageDescriptor,
} from "@/lib/storage/skillMintStorageTypes";
import {
  getBrowserDataOwner,
  getOwnerScopeLabel,
} from "@/lib/storage/skillMintStorageTypes";
import {
  createOwnedBrowserValue,
  getBrowserStorage,
  isOwnedBrowserValue,
  isOwnerAwareDescriptor,
  readVisibleStoredValue,
  safeJsonParse,
} from "@/lib/storage/ownedSkillMintStorage";

export const SKILLMINT_STORAGE_DESCRIPTORS: SkillMintStorageDescriptor[] = [
  ACTIVE_RESUME_ANALYSIS_STORAGE_DESCRIPTOR,
  RESUME_SYNC_STATUS_STORAGE_DESCRIPTOR,
  JD_MATCH_STORAGE_DESCRIPTOR,
  JD_MATCH_HISTORY_STORAGE_DESCRIPTOR,
  JD_MATCH_SYNC_STATUS_STORAGE_DESCRIPTOR,
  ACTIVE_TARGET_STORAGE_DESCRIPTOR,
  TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR,
  MISSION_STATUS_STORAGE_DESCRIPTOR,
  SELECTED_CAREER_PATH_STORAGE_DESCRIPTOR,
  BETA_FEEDBACK_STORAGE_DESCRIPTOR,
  ONBOARDING_DISMISSED_STORAGE_DESCRIPTOR,
  UPGRADE_INTEREST_STORAGE_DESCRIPTOR,
];

export type BrowserStorageSummaryItem = {
  descriptor: SkillMintStorageDescriptor;
  status:
    | "visible"
    | "hidden_for_owner"
    | "corrupted"
    | "missing"
    | "owner_unknown";
  owner: BrowserDataOwner | null;
  legacy: boolean;
  bytes: number;
};

export type BrowserStorageSummary = {
  ownerScope: string;
  items: BrowserStorageSummaryItem[];
  visibleCount: number;
  hiddenCount: number;
  corruptedCount: number;
  clearableCount: number;
};

export type BrowserClearResult = {
  attempted: number;
  removed: number;
  failedKeys: string[];
};

export type BrowserExportResult =
  | {
      ok: true;
      fileName: string;
      json: string;
      omitted: Array<{
        key: string;
        reason: string;
      }>;
    }
  | {
      ok: false;
      error: string;
    };

export type BrowserImportResult =
  | {
      ok: true;
      importedKeys: string[];
      skippedKeys: string[];
    }
  | {
      ok: false;
      error: string;
      restored: boolean;
    };

export function getSkillMintStorageDescriptors(): SkillMintStorageDescriptor[] {
  return [...SKILLMINT_STORAGE_DESCRIPTORS].sort((left, right) =>
    left.key.localeCompare(right.key)
  );
}

export function getSkillMintStorageDescriptor(
  key: string,
): SkillMintStorageDescriptor | undefined {
  return SKILLMINT_STORAGE_DESCRIPTORS.find((descriptor) =>
    descriptor.key === key
  );
}

export function getBrowserStorageSummary(
  context: BrowserOwnerContext,
): BrowserStorageSummary {
  const storage = getBrowserStorage();
  const owner = getBrowserDataOwner(context.currentUserId);
  const items = getSkillMintStorageDescriptors().map((descriptor) => {
    let storedValue: string | null = null;

    try {
      storedValue = storage?.getItem(descriptor.key) ?? null;
    } catch {
      storedValue = null;
    }

    const result = readVisibleStoredValue(storedValue, descriptor, context);

    return {
      descriptor,
      status: result.status,
      owner: result.owner,
      legacy: result.legacy,
      bytes: storedValue?.length ?? 0,
    };
  });

  return {
    ownerScope: getOwnerScopeLabel(owner),
    items,
    visibleCount: items.filter((item) => item.status === "visible").length,
    hiddenCount: items.filter((item) =>
      item.status === "hidden_for_owner"
    ).length,
    corruptedCount: items.filter((item) => item.status === "corrupted").length,
    clearableCount: items.filter((item) =>
      item.descriptor.clearWithBrowserReset
    ).length,
  };
}

export function clearSkillMintBrowserData(): BrowserClearResult {
  const storage = getBrowserStorage();
  const clearableDescriptors = getSkillMintStorageDescriptors().filter(
    (descriptor) => descriptor.clearWithBrowserReset,
  );
  const failedKeys: string[] = [];

  if (!storage) {
    return {
      attempted: clearableDescriptors.length,
      removed: 0,
      failedKeys: clearableDescriptors.map((descriptor) => descriptor.key),
    };
  }

  let removed = 0;

  for (const descriptor of clearableDescriptors) {
    try {
      storage.removeItem(descriptor.key);
      removed += 1;
    } catch {
      failedKeys.push(descriptor.key);
    }
  }

  if (removed > 0) {
    notifySkillMintWorkspaceUpdated();
  }

  return {
    attempted: clearableDescriptors.length,
    removed,
    failedKeys,
  };
}

export function buildBrowserDataExport(
  context: BrowserOwnerContext,
  exportedAt = new Date().toISOString(),
): BrowserExportResult {
  const storage = getBrowserStorage();

  if (!storage) {
    return {
      ok: false,
      error: "Browser storage is unavailable.",
    };
  }

  const owner = getBrowserDataOwner(context.currentUserId);

  if (!owner) {
    return {
      ok: false,
      error: "Wait for account status before exporting browser data.",
    };
  }

  const categories: Partial<Record<SkillMintStorageCategory, unknown[]>> = {};
  const omitted: Array<{
    key: string;
    reason: string;
  }> = [];

  for (const descriptor of getSkillMintStorageDescriptors()) {
    if (!descriptor.exportable) {
      continue;
    }

    let storedValue: string | null = null;

    try {
      storedValue = storage.getItem(descriptor.key);
    } catch {
      omitted.push({
        key: descriptor.key,
        reason: "Browser storage read failed.",
      });
      continue;
    }

    const visibleValue = readVisibleStoredValue(
      storedValue,
      descriptor,
      context,
    );

    if (visibleValue.status === "missing") {
      continue;
    }

    if (
      visibleValue.status !== "visible" ||
      visibleValue.serializedValue === null
    ) {
      omitted.push({
        key: descriptor.key,
        reason: visibleValue.status,
      });
      continue;
    }

    const value = parseExportValue(
      visibleValue.serializedValue,
      descriptor,
    );

    if (value === undefined) {
      omitted.push({
        key: descriptor.key,
        reason: "Value could not be parsed for export.",
      });
      continue;
    }

    const categoryRecords = categories[descriptor.category] ?? [];
    categoryRecords.push({
      key: descriptor.key,
      description: descriptor.description,
      value,
    });
    categories[descriptor.category] = categoryRecords;
  }

  const sortedCategories = Object.fromEntries(
    Object.entries(categories)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([category, records]) => [
        category,
        [...records].sort((leftRecord, rightRecord) =>
          String(leftRecord.key).localeCompare(String(rightRecord.key))
        ),
      ]),
  );

  const payload = {
    exportVersion: "skillmint-browser-export-v1",
    source: "browser",
    ownerScope: getOwnerScopeLabel(owner),
    exportedAt,
    categories: sortedCategories,
    omitted,
  };

  return {
    ok: true,
    fileName: getSafeBrowserExportFileName(owner, exportedAt),
    json: `${JSON.stringify(payload, null, 2)}\n`,
    omitted,
  };
}

export function hasAnonymousBrowserWorkspace(): boolean {
  const storage = getBrowserStorage();

  if (!storage) {
    return false;
  }

  return getSkillMintStorageDescriptors().some((descriptor) => {
    if (!isOwnerAwareDescriptor(descriptor)) {
      return false;
    }

    try {
      const storedValue = storage.getItem(descriptor.key);

      if (!storedValue) {
        return false;
      }

      const parsedValue = safeJsonParse(storedValue);

      return !isOwnedBrowserValue(parsedValue) ||
        parsedValue.owner.kind === "anonymous";
    } catch {
      return false;
    }
  });
}

export function importAnonymousBrowserWorkspaceToAccount(
  userId: string,
): BrowserImportResult {
  const storage = getBrowserStorage();
  const accountOwner: BrowserDataOwner = {
    kind: "account",
    userId,
  };

  if (!storage) {
    return {
      ok: false,
      error: "Browser storage is unavailable.",
      restored: false,
    };
  }

  const originalValues = new Map<string, string | null>();
  const writes: Array<{
    descriptor: SkillMintStorageDescriptor;
    serializedValue: string;
  }> = [];
  const skippedKeys: string[] = [];

  try {
    for (const descriptor of getSkillMintStorageDescriptors()) {
      if (!isOwnerAwareDescriptor(descriptor)) {
        skippedKeys.push(descriptor.key);
        continue;
      }

      const storedValue = storage.getItem(descriptor.key);

      originalValues.set(descriptor.key, storedValue);

      if (!storedValue) {
        skippedKeys.push(descriptor.key);
        continue;
      }

      const parsedValue = safeJsonParse(storedValue);

      if (isOwnedBrowserValue(parsedValue)) {
        if (parsedValue.owner.kind !== "anonymous") {
          skippedKeys.push(descriptor.key);
          continue;
        }

        writes.push({
          descriptor,
          serializedValue: JSON.stringify({
            ...parsedValue,
            owner: accountOwner,
            updatedAt: new Date().toISOString(),
          }),
        });
        continue;
      }

      if (parsedValue === undefined) {
        skippedKeys.push(descriptor.key);
        continue;
      }

      writes.push({
        descriptor,
        serializedValue: JSON.stringify(
          createOwnedBrowserValue(parsedValue, accountOwner),
        ),
      });
    }

    for (const write of writes) {
      storage.setItem(write.descriptor.key, write.serializedValue);
    }

    if (writes.length) {
      notifySkillMintWorkspaceUpdated();
    }

    return {
      ok: true,
      importedKeys: writes.map((write) => write.descriptor.key),
      skippedKeys,
    };
  } catch {
    let restored = true;

    for (const [key, originalValue] of originalValues.entries()) {
      try {
        if (originalValue === null) {
          storage.removeItem(key);
        } else {
          storage.setItem(key, originalValue);
        }
      } catch {
        restored = false;
      }
    }

    return {
      ok: false,
      error: "Import failed. Your anonymous browser workspace was preserved.",
      restored,
    };
  }
}

function parseExportValue(
  serializedValue: string,
  descriptor: SkillMintStorageDescriptor,
): unknown {
  if (descriptor.exportPolicy === "string_value") {
    const parsedValue = safeJsonParse(serializedValue);

    return typeof parsedValue === "string" ? parsedValue : serializedValue;
  }

  if (descriptor.exportPolicy === "boolean_string") {
    const parsedValue = safeJsonParse(serializedValue);

    if (typeof parsedValue === "boolean") {
      return parsedValue;
    }

    return serializedValue === "true";
  }

  return safeJsonParse(serializedValue);
}

function getSafeBrowserExportFileName(
  owner: BrowserDataOwner,
  exportedAt: string,
): string {
  const datePart = exportedAt.slice(0, 10) || "export";
  const scopePart = owner.kind === "anonymous" ? "anonymous" : "account";

  return `skillmint-browser-${scopePart}-${datePart}.json`;
}
