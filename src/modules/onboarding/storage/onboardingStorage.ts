const ONBOARDING_DISMISSED_STORAGE_KEY = "skillmint:onboarding-dismissed";

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
