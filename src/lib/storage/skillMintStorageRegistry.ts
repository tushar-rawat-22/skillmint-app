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
import {
  buildBrowserDataExportWithEngine,
  type BrowserDataExportResult,
} from "@/modules/data-controls/browserDataExportEngine";
export type { BrowserDataExportResult } from "@/modules/data-controls/browserDataExportEngine";
import type {
  BrowserDataOwner,
  BrowserOwnerContext,
  SkillMintStorageDescriptor,
} from "@/lib/storage/skillMintStorageTypes";
import {
  getBrowserDataOwner,
  getOwnerScopeLabel,
} from "@/lib/storage/skillMintStorageTypes";
import {
  classifyStoredValue,
  deleteOwnerPartition,
  getBrowserStorage,
  getClassifiedOwnerPartition,
  isOwnerAwareDescriptor,
  migrateClassificationToContainer,
  readVisibleStoredValue,
  removeOwnedStoragePartition,
  serializeValidatedContainer,
  setOwnerPartition,
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
    | "corrupted"
    | "missing"
    | "owner_unknown";
  legacy: boolean;
  bytes: number;
  issue: "storage_unavailable" | "storage_read_failed" | null;
};

export type BrowserStorageSummary = {
  ownerScope: string;
  items: BrowserStorageSummaryItem[];
  visibleCount: number;
  anonymousWorkspaceDataExists: boolean;
  otherWorkspaceDataExists: boolean;
  corruptedCount: number;
  clearableCount: number;
};

export type BrowserClearResult = {
  attempted: number;
  present: number;
  removed: number;
  absent: number;
  failedKeys: string[];
};

export type BrowserOwnerRemovalResult = {
  attempted: number;
  removedPartitions: number;
  unchanged: number;
  failedKeys: string[];
};

export type BrowserImportResult = {
  ok: boolean;
  outcome:
    | "success"
    | "conflict_no_writes"
    | "conflict_rolled_back"
    | "failure_complete_rollback"
    | "failure_incomplete_rollback";
  importedKeys: string[];
  skippedKeys: string[];
  plannedDescriptors: string[];
  destinationWritesSucceeded: string[];
  destinationWritesFailed: string[];
  anonymousRemovalsSucceeded: string[];
  anonymousRemovalsFailed: string[];
  rollbackSucceededKeys: string[];
  rollbackFailedKeys: string[];
  conflictDescriptors: string[];
  rejectedDescriptors: string[];
  exactStateRestored: boolean;
  integrityWarning: boolean;
  error: string | null;
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
  let anonymousWorkspaceDataExists = false;
  let otherWorkspaceDataExists = false;
  const items = getSkillMintStorageDescriptors().map((descriptor) => {
    let storedValue: string | null = null;
    let storageReadFailed = false;
    const storageUnavailable = !storage;

    try {
      if (!storage) storageReadFailed = true;
      else storedValue = storage.getItem(descriptor.key);
    } catch {
      storageReadFailed = true;
    }

    const result = storageReadFailed
      ? {
          status: "corrupted" as const,
          owner: null,
          legacy: false,
        }
      : readVisibleStoredValue(storedValue, descriptor, context);
    if (
      isOwnerAwareDescriptor(descriptor) &&
      context.currentUserId !== undefined &&
      storedValue !== null &&
      !storageReadFailed
    ) {
      const workspacePresence = getWorkspacePresence(
        classifyStoredValue(storedValue, descriptor),
        owner,
      );
      anonymousWorkspaceDataExists ||= workspacePresence.anonymousExists;
      otherWorkspaceDataExists ||= workspacePresence.otherAccountExists;
    }

    const issue: BrowserStorageSummaryItem["issue"] = storageUnavailable
      ? "storage_unavailable"
      : storageReadFailed
        ? "storage_read_failed"
        : null;

    return {
      descriptor,
      status: result.status === "hidden_for_owner" ? "missing" : result.status,
      legacy: result.legacy,
      bytes: storedValue?.length ?? 0,
      issue,
    };
  });

  return {
    ownerScope: getOwnerScopeLabel(owner),
    items,
    visibleCount: items.filter((item) => item.status === "visible").length,
    anonymousWorkspaceDataExists,
    otherWorkspaceDataExists,
    corruptedCount: items.filter((item) => item.status === "corrupted").length,
    clearableCount: items.filter((item) =>
      item.descriptor.clearWithBrowserReset
    ).length,
  };
}

export function formatOtherWorkspaceSummary(
  anonymousWorkspaceDataExists: boolean,
  otherWorkspaceDataExists: boolean,
): string {
  if (anonymousWorkspaceDataExists && otherWorkspaceDataExists) {
    return "Signed-out or unassigned and other SkillMint account workspace data exist in this browser.";
  }
  if (anonymousWorkspaceDataExists) {
    return "Signed-out or unassigned SkillMint workspace data exists in this browser.";
  }
  if (otherWorkspaceDataExists) {
    return "Other SkillMint account workspace data exists in this browser.";
  }
  return "No other SkillMint workspace data detected.";
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
      present: 0,
      removed: 0,
      absent: 0,
      failedKeys: clearableDescriptors.map((descriptor) => descriptor.key),
    };
  }

  let removed = 0;
  let present = 0;
  let absent = 0;

  for (const descriptor of clearableDescriptors) {
    try {
      if (storage.getItem(descriptor.key) === null) {
        absent += 1;
        continue;
      }

      present += 1;
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
    present,
    removed,
    absent,
    failedKeys,
  };
}

export function removeSkillMintOwnerData(
  context: BrowserOwnerContext,
): BrowserOwnerRemovalResult {
  const storage = getBrowserStorage();
  const descriptors = getSkillMintStorageDescriptors().filter(isOwnerAwareDescriptor);
  const result: BrowserOwnerRemovalResult = {
    attempted: descriptors.length,
    removedPartitions: 0,
    unchanged: 0,
    failedKeys: [],
  };

  for (const descriptor of descriptors) {
    const removal = removeOwnedStoragePartition(descriptor, context, { storage });
    if (!removal.ok) result.failedKeys.push(descriptor.key);
    else if (removal.changed) result.removedPartitions += 1;
    else result.unchanged += 1;
  }

  if (result.removedPartitions > 0) notifySkillMintWorkspaceUpdated();
  return result;
}

export function buildBrowserDataExport(
  context: BrowserOwnerContext,
  exportedAt = new Date().toISOString(),
): BrowserDataExportResult {
  return buildBrowserDataExportWithEngine({
    context,
    exportedAt,
    descriptors: getSkillMintStorageDescriptors(),
    storage: getBrowserStorage(),
  });
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

      const classification = classifyStoredValue(storedValue, descriptor);
      return Boolean(getClassifiedOwnerPartition(
        classification,
        { kind: "anonymous" },
      ));
    } catch {
      return false;
    }
  });
}

export function importAnonymousBrowserWorkspaceToAccount(
  userId: string,
  importedAt = new Date().toISOString(),
): BrowserImportResult {
  const storage = getBrowserStorage();
  const accountOwner = getBrowserDataOwner(userId);

  if (!storage || !accountOwner || accountOwner.kind !== "account") {
    return createImportFailure(
      "failure_complete_rollback",
      "Browser storage or account owner is unavailable.",
      true,
    );
  }

  const anonymousOwner: BrowserDataOwner = { kind: "anonymous" };
  const plans: Array<{
    descriptor: SkillMintStorageDescriptor;
    originalRaw: string;
    finalRaw: string;
    unrelatedAccountPartitions: Record<string, string>;
  }> = [];
  const skippedKeys: string[] = [];
  const conflictDescriptors: string[] = [];

  try {
    for (const descriptor of getSkillMintStorageDescriptors()) {
      if (!isOwnerAwareDescriptor(descriptor) || !descriptor.importable) {
        skippedKeys.push(descriptor.key);
        continue;
      }

      const storedValue = storage.getItem(descriptor.key);
      if (storedValue === null) {
        skippedKeys.push(descriptor.key);
        continue;
      }

      const classification = classifyStoredValue(storedValue, descriptor);
      const anonymousPartition = getClassifiedOwnerPartition(
        classification,
        anonymousOwner,
      );

      if (!anonymousPartition) {
        if (isRecognizedNonAnonymousClassification(classification.status)) {
          skippedKeys.push(descriptor.key);
          continue;
        }
        return createImportFailure(
          "failure_complete_rollback",
          `Import preflight rejected unrecognized data for ${descriptor.key}.`,
          true,
          { skippedKeys, destinationWritesFailed: [descriptor.key] },
        );
      }

      if (getClassifiedOwnerPartition(classification, accountOwner)) {
        conflictDescriptors.push(descriptor.key);
        continue;
      }

      const container = migrateClassificationToContainer(
        classification,
        descriptor,
      );
      if (!container) {
        return createImportFailure(
          "failure_complete_rollback",
          `Import preflight could not migrate ${descriptor.key}.`,
          true,
          { skippedKeys, destinationWritesFailed: [descriptor.key] },
        );
      }

      const preparedImport = prepareAnonymousImportValue(
        descriptor,
        anonymousPartition.value,
      );
      if (!preparedImport.ok) {
        return createImportFailure(
          "failure_complete_rollback",
          `Import preflight rejected ${descriptor.key}: ${preparedImport.reason}`,
          true,
          {
            skippedKeys,
            destinationWritesFailed: [descriptor.key],
            rejectedDescriptors: [descriptor.key],
          },
        );
      }

      if (!descriptor.validateValue(preparedImport.value)) {
        return createImportFailure(
          "failure_complete_rollback",
          `Import preflight rejected an invalid transformed value for ${descriptor.key}.`,
          true,
          {
            skippedKeys,
            destinationWritesFailed: [descriptor.key],
            rejectedDescriptors: [descriptor.key],
          },
        );
      }

      const withDestination = setOwnerPartition(container, accountOwner, {
        value: preparedImport.value,
        updatedAt: importedAt,
      });
      const withoutAnonymous = deleteOwnerPartition(withDestination, anonymousOwner);
      const finalRaw = serializeValidatedContainer(withoutAnonymous, descriptor);
      if (!finalRaw) {
        return createImportFailure(
          "failure_complete_rollback",
          `Import preflight could not serialize ${descriptor.key}.`,
          true,
          { skippedKeys, destinationWritesFailed: [descriptor.key] },
        );
      }
      plans.push({
        descriptor,
        originalRaw: storedValue,
        finalRaw,
        unrelatedAccountPartitions: Object.fromEntries(
          Object.entries(container.partitions.accounts)
            .filter(([ownerId]) => ownerId !== accountOwner.userId)
            .map(([ownerId, partition]) => [ownerId, JSON.stringify(partition)]),
        ),
      });
    }
  } catch {
    return createImportFailure(
      "failure_complete_rollback",
      "Browser storage could not be read during import preflight.",
      true,
      { skippedKeys },
    );
  }

  if (conflictDescriptors.length) {
    return createImportFailure(
      "conflict_no_writes",
      "Import stopped because this account already has browser workspace data.",
      true,
      { skippedKeys, plannedDescriptors: plans.map((plan) => plan.descriptor.key), conflictDescriptors },
    );
  }

  const progress = emptyImportProgress(skippedKeys, plans.map((plan) => plan.descriptor.key));
  const writtenFinalKeys = new Set<string>();
  for (const plan of plans) {
    let currentRaw: string | null;
    try {
      currentRaw = storage.getItem(plan.descriptor.key);
    } catch {
      progress.destinationWritesFailed.push(plan.descriptor.key);
      return rollbackImport(
        storage,
        plans,
        progress,
        writtenFinalKeys,
        "Browser storage could not be reread before import.",
      );
    }

    if (currentRaw !== plan.originalRaw) {
      progress.conflictDescriptors.push(plan.descriptor.key);
      if (!progress.destinationWritesSucceeded.length) {
        return createImportFailure(
          "conflict_no_writes",
          "Browser data changed in another tab before import could write. No browser data was changed by this import.",
          false,
          progress,
        );
      }
      return rollbackImport(
        storage,
        plans,
        progress,
        writtenFinalKeys,
        "Browser data changed in another tab during import.",
        true,
      );
    }

    try {
      // One final write adds the account partition and removes anonymous data.
      storage.setItem(plan.descriptor.key, plan.finalRaw);
      writtenFinalKeys.add(plan.descriptor.key);
      const writtenRaw = storage.getItem(plan.descriptor.key);
      const destinationRead = readVisibleStoredValue(
        writtenRaw,
        plan.descriptor,
        { currentUserId: accountOwner.userId },
      );
      const anonymousRead = readVisibleStoredValue(
        writtenRaw,
        plan.descriptor,
        { currentUserId: null },
      );
      const classification = classifyStoredValue(writtenRaw, plan.descriptor);
      if (writtenRaw !== plan.finalRaw) {
        progress.conflictDescriptors.push(plan.descriptor.key);
      }
      if (
        writtenRaw !== plan.finalRaw ||
        destinationRead.status !== "visible" ||
        anonymousRead.status === "visible" ||
        (classification.status !== "current_container" &&
          classification.status !== "previous_container") ||
        !unrelatedAccountPartitionsRemainValid(
          classification,
          plan.unrelatedAccountPartitions,
        )
      ) {
        throw new Error("final import verification failed");
      }
      progress.destinationWritesSucceeded.push(plan.descriptor.key);
      progress.anonymousRemovalsSucceeded.push(plan.descriptor.key);
    } catch {
      progress.destinationWritesFailed.push(plan.descriptor.key);
      return rollbackImport(
        storage,
        plans,
        progress,
        writtenFinalKeys,
        "Final browser import write or verification failed.",
      );
    }
  }

  if (plans.length) notifySkillMintWorkspaceUpdated();
  return {
    ok: true,
    outcome: "success",
    importedKeys: plans.map((plan) => plan.descriptor.key),
    ...progress,
    exactStateRestored: false,
    integrityWarning: false,
    error: null,
  };
}

type ImportProgress = Pick<
  BrowserImportResult,
  | "skippedKeys"
  | "plannedDescriptors"
  | "destinationWritesSucceeded"
  | "destinationWritesFailed"
  | "anonymousRemovalsSucceeded"
  | "anonymousRemovalsFailed"
  | "rollbackSucceededKeys"
  | "rollbackFailedKeys"
  | "conflictDescriptors"
  | "rejectedDescriptors"
>;

function emptyImportProgress(
  skippedKeys: string[] = [],
  plannedDescriptors: string[] = [],
): ImportProgress {
  return {
    skippedKeys,
    plannedDescriptors,
    destinationWritesSucceeded: [],
    destinationWritesFailed: [],
    anonymousRemovalsSucceeded: [],
    anonymousRemovalsFailed: [],
    rollbackSucceededKeys: [],
    rollbackFailedKeys: [],
    conflictDescriptors: [],
    rejectedDescriptors: [],
  };
}

export function prepareAnonymousImportValue(
  descriptor: SkillMintStorageDescriptor,
  value: unknown,
) {
  if (!descriptor.validateValue(value)) {
    return {
      ok: false as const,
      reason: "Anonymous source value did not pass descriptor validation.",
    };
  }

  return descriptor.prepareAnonymousImport?.(value) ?? { ok: true as const, value };
}

function getWorkspacePresence(
  classification: ReturnType<typeof classifyStoredValue>,
  currentOwner: BrowserDataOwner | null,
): { anonymousExists: boolean; otherAccountExists: boolean } {
  if (classification.status === "legacy_raw_anonymous") {
    return { anonymousExists: true, otherAccountExists: false };
  }

  if (classification.status === "previous_owner_envelope") {
    return {
      anonymousExists: classification.owner.kind === "anonymous",
      otherAccountExists: classification.owner.kind === "account" &&
        (currentOwner?.kind !== "account" ||
          classification.owner.userId !== currentOwner.userId),
    };
  }

  if (
    classification.status !== "current_container" &&
    classification.status !== "previous_container"
  ) {
    return { anonymousExists: false, otherAccountExists: false };
  }

  return {
    anonymousExists: Boolean(classification.container.partitions.anonymous),
    otherAccountExists: Object.keys(classification.container.partitions.accounts)
      .some((userId) => currentOwner?.kind !== "account" || userId !== currentOwner.userId),
  };
}

function createImportFailure(
  outcome: Exclude<BrowserImportResult["outcome"], "success">,
  error: string,
  exactStateRestored: boolean,
  overrides: Partial<ImportProgress> = {},
): BrowserImportResult {
  return {
    ok: false,
    outcome,
    importedKeys: [],
    ...emptyImportProgress(),
    ...overrides,
    exactStateRestored,
    integrityWarning: outcome === "failure_incomplete_rollback" ||
      outcome === "conflict_rolled_back",
    error,
  };
}

function rollbackImport(
  storage: Storage,
  plans: Array<{
    descriptor: SkillMintStorageDescriptor;
    originalRaw: string;
    finalRaw: string;
  }>,
  progress: ImportProgress,
  writtenFinalKeys: ReadonlySet<string>,
  error: string,
  concurrentChange = false,
): BrowserImportResult {
  for (const plan of plans) {
    if (!writtenFinalKeys.has(plan.descriptor.key)) continue;
    try {
      if (storage.getItem(plan.descriptor.key) !== plan.finalRaw) {
        throw new Error("external browser change prevented guarded rollback");
      }
      storage.setItem(plan.descriptor.key, plan.originalRaw);
      if (storage.getItem(plan.descriptor.key) !== plan.originalRaw) {
        throw new Error("rollback verification failed");
      }
      progress.rollbackSucceededKeys.push(plan.descriptor.key);
    } catch {
      progress.rollbackFailedKeys.push(plan.descriptor.key);
    }
  }

  const exactStateRestored = !concurrentChange && progress.rollbackFailedKeys.length === 0;
  const affectedDescriptors = progress.rollbackFailedKeys.join(", ");
  if (progress.rollbackFailedKeys.length > 0) {
    notifySkillMintWorkspaceUpdated();
  }
  return createImportFailure(
    concurrentChange
      ? "conflict_rolled_back"
      : exactStateRestored
      ? "failure_complete_rollback"
      : "failure_incomplete_rollback",
    concurrentChange
      ? `${error} This import rolled back only values it had written and preserved the external browser change.`
      : exactStateRestored
      ? `${error} Exact pre-import browser data was restored.`
      : `${error} Browser data could not be restored for: ${affectedDescriptors}. Stop using import and preserve this tab for recovery.`,
    exactStateRestored,
    progress,
  );
}

function unrelatedAccountPartitionsRemainValid(
  classification: ReturnType<typeof classifyStoredValue>,
  expectedPartitions: Record<string, string>,
): boolean {
  if (
    classification.status !== "current_container" &&
    classification.status !== "previous_container"
  ) {
    return false;
  }

  return Object.entries(expectedPartitions).every(([ownerId, partition]) =>
    JSON.stringify(classification.container.partitions.accounts[ownerId]) === partition
  );
}

function isRecognizedNonAnonymousClassification(
  status: ReturnType<typeof classifyStoredValue>["status"],
): boolean {
  return status === "missing" ||
    status === "current_container" ||
    status === "previous_container" ||
    status === "previous_owner_envelope";
}
