import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";

const SKILLMINT_WORKSPACE_KEYS = [
  "skillmint:resume-analysis",
  "skillmint:resume-sync-status",
  "skillmint:jd-match",
  "skillmint:jd-match-history",
  "skillmint:jd-match-sync-status",
  "skillmint:active-target:v1",
  "skillmint:target-role-setup",
  "skillmint:onboarding-dismissed",
  "skillmint:beta-feedback",
  "skillmint:upgrade-interest",
] as const;

export function clearSkillMintWorkspace(): void {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  let didClearWorkspaceKey = false;

  for (const key of SKILLMINT_WORKSPACE_KEYS) {
    try {
      storage.removeItem(key);
      didClearWorkspaceKey = true;
    } catch {
      continue;
    }
  }

  if (didClearWorkspaceKey) {
    notifySkillMintWorkspaceUpdated();
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
