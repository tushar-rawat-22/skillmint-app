export const SKILLMINT_WORKSPACE_UPDATED_EVENT =
  "skillmint:workspace-updated";

export function notifySkillMintWorkspaceUpdated(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.dispatchEvent(new Event(SKILLMINT_WORKSPACE_UPDATED_EVENT));
  } catch {
    return;
  }
}

export function subscribeToSkillMintWorkspaceUpdates(
  callback: () => void,
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  try {
    window.addEventListener("storage", callback);
    window.addEventListener(SKILLMINT_WORKSPACE_UPDATED_EVENT, callback);

    return () => {
      window.removeEventListener("storage", callback);
      window.removeEventListener(SKILLMINT_WORKSPACE_UPDATED_EVENT, callback);
    };
  } catch {
    return () => undefined;
  }
}
