import type { SkillMintStorageDescriptor } from "@/lib/storage/skillMintStorageTypes";

export const ONBOARDING_DISMISSED_STORAGE_KEY =
  "skillmint:onboarding-dismissed";
export const ONBOARDING_DISMISSED_STORAGE_DESCRIPTOR:
  SkillMintStorageDescriptor = {
    key: ONBOARDING_DISMISSED_STORAGE_KEY,
    version: 1,
    category: "onboarding",
    ownerScope: "global_preference",
    containsPersonalData: false,
    clearWithBrowserReset: true,
    exportable: true,
    exportPolicy: "boolean_string",
    description:
      "Browser-local preference for hiding onboarding checklist prompts.",
  };

export function getOnboardingDismissed(): boolean {
  const storage = getBrowserStorage();

  if (!storage) {
    return false;
  }

  try {
    return storage.getItem(ONBOARDING_DISMISSED_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setOnboardingDismissed(value: boolean): void {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(
      ONBOARDING_DISMISSED_STORAGE_KEY,
      value ? "true" : "false",
    );
  } catch {
    return;
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
