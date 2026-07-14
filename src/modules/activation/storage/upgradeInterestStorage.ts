import type {
  UpgradeInterestRecord,
  UpgradeInterestSource,
} from "@/modules/activation/types";
import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";
import type { SkillMintStorageDescriptor } from "@/lib/storage/skillMintStorageTypes";

export const UPGRADE_INTEREST_STORAGE_KEY = "skillmint:upgrade-interest";
export const UPGRADE_INTEREST_STORAGE_DESCRIPTOR:
  SkillMintStorageDescriptor = {
    key: UPGRADE_INTEREST_STORAGE_KEY,
    version: 1,
    category: "activation",
    ownerScope: "global_preference",
    containsPersonalData: false,
    clearWithBrowserReset: true,
    exportable: true,
    importable: false,
    exportPolicy: "json_value",
    validateValue: isUpgradeInterestRecords,
    description:
      "Browser-local beta upgrade-interest clicks; no payment or entitlement.",
  };
const MAX_UPGRADE_INTEREST_RECORDS = 20;

function isUpgradeInterestRecords(value: unknown): boolean {
  return Array.isArray(value) && value.every(isUpgradeInterestRecord);
}

export function saveUpgradeInterest(input: {
  source: UpgradeInterestSource;
  label: string;
}): UpgradeInterestRecord | null {
  const storage = getBrowserStorage();

  if (!storage) {
    return null;
  }

  const record: UpgradeInterestRecord = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    source: input.source,
    label: input.label,
    createdAt: new Date().toISOString(),
  };

  try {
    const records = getUpgradeInterestRecords();
    const nextRecords = [record, ...records]
      .slice(0, MAX_UPGRADE_INTEREST_RECORDS);

    storage.setItem(
      UPGRADE_INTEREST_STORAGE_KEY,
      JSON.stringify(nextRecords),
    );
    notifySkillMintWorkspaceUpdated();

    return record;
  } catch {
    return null;
  }
}

export function getUpgradeInterestRecords(): UpgradeInterestRecord[] {
  const storage = getBrowserStorage();

  if (!storage) {
    return [];
  }

  try {
    const storedValue = storage.getItem(UPGRADE_INTEREST_STORAGE_KEY);

    if (!storedValue) {
      return [];
    }

    const parsedValue = JSON.parse(storedValue);

    return Array.isArray(parsedValue)
      ? parsedValue.filter(isUpgradeInterestRecord)
      : [];
  } catch {
    return [];
  }
}

function isUpgradeInterestRecord(
  value: unknown,
): value is UpgradeInterestRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return typeof record.id === "string" &&
    isUpgradeInterestSource(record.source) &&
    typeof record.label === "string" &&
    typeof record.createdAt === "string" &&
    Number.isFinite(Date.parse(record.createdAt));
}

function isUpgradeInterestSource(
  value: unknown,
): value is UpgradeInterestSource {
  return value === "dashboard" ||
    value === "resume" ||
    value === "ats" ||
    value === "roadmap";
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
