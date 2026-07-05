const SKILLMINT_WORKSPACE_KEYS = [
  "skillmint:resume-analysis",
  "skillmint:resume-sync-status",
  "skillmint:jd-match",
  "skillmint:jd-match-history",
  "skillmint:jd-match-sync-status",
  "skillmint:target-role-setup",
  "skillmint:onboarding-dismissed",
  "skillmint:beta-feedback",
] as const;

export function clearSkillMintWorkspace(): void {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  for (const key of SKILLMINT_WORKSPACE_KEYS) {
    try {
      storage.removeItem(key);
    } catch {
      continue;
    }
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
