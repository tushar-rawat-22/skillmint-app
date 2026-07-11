import {
  clearSkillMintBrowserData,
  type BrowserClearResult,
} from "@/lib/storage/skillMintStorageRegistry";

export function clearSkillMintWorkspace(): BrowserClearResult {
  return clearSkillMintBrowserData();
}
