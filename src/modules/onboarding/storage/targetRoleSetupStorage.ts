import type { TargetRoleSetup } from "@/modules/onboarding/types";
import {
  readVisibleStorageValue,
  removeOwnedStoragePartition,
  writeOwnedJsonStorageValue,
} from "@/lib/storage/ownedSkillMintStorage";
import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";
import type {
  BrowserOwnerContext,
  SkillMintStorageDescriptor,
} from "@/lib/storage/skillMintStorageTypes";

export const TARGET_ROLE_SETUP_STORAGE_KEY = "skillmint:target-role-setup";
export const TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR:
  SkillMintStorageDescriptor = {
    key: TARGET_ROLE_SETUP_STORAGE_KEY,
    version: 1,
    category: "onboarding",
    ownerScope: "anonymous_or_account",
    containsPersonalData: true,
    clearWithBrowserReset: true,
    exportable: true,
    importable: true,
    exportPolicy: "json_value",
    validateValue: isTargetRoleSetup,
    description:
      "Browser-local target role setup used for career direction and recommendations.",
  };

export function getTargetRoleSetup(
  options: BrowserOwnerContext = {
    currentUserId: null,
  },
): TargetRoleSetup | null {
  const storedValue = readVisibleStorageValue(
    TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR,
    options,
  );

  try {
    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue);

    return isTargetRoleSetup(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export function saveTargetRoleSetup(
  setup: TargetRoleSetup,
  options: BrowserOwnerContext = {
    currentUserId: null,
  },
): void {
  if (
    writeOwnedJsonStorageValue(
      TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR,
      setup,
      options,
    )
  ) {
    notifySkillMintWorkspaceUpdated();
  }
}

export function clearTargetRoleSetup(
  options: BrowserOwnerContext = { currentUserId: null },
): boolean {
  const result = removeOwnedStoragePartition(
    TARGET_ROLE_SETUP_STORAGE_DESCRIPTOR,
    options,
  );

  if (result.ok && result.changed) {
    notifySkillMintWorkspaceUpdated();
  }

  return result.ok;
}

export function isTargetRoleSetup(value: unknown): value is TargetRoleSetup {
  if (!isRecord(value)) {
    return false;
  }

  return (
    isNonEmptyString(value.targetRole) &&
    (
      value.careerField === undefined ||
      isCareerField(value.careerField)
    ) &&
    isExperienceLevel(value.experienceLevel) &&
    isPrimaryGoal(value.primaryGoal) &&
    isPreferredJobType(value.preferredJobType) &&
    isWeeklyTimeCommitment(value.weeklyTimeCommitment) &&
    typeof value.updatedAt === "string" &&
    Number.isFinite(Date.parse(value.updatedAt))
  );
}

function isCareerField(
  value: unknown,
): value is NonNullable<TargetRoleSetup["careerField"]> {
  return value === "tech_software" ||
    value === "data_analytics" ||
    value === "sales_business_development" ||
    value === "marketing_content" ||
    value === "finance_operations" ||
    value === "design_product" ||
    value === "other";
}

function isExperienceLevel(
  value: unknown,
): value is TargetRoleSetup["experienceLevel"] {
  return value === "student" ||
    value === "fresher" ||
    value === "intern" ||
    value === "junior" ||
    value === "switcher";
}

function isPrimaryGoal(
  value: unknown,
): value is TargetRoleSetup["primaryGoal"] {
  return value === "get_internship" ||
    value === "get_first_job" ||
    value === "switch_role" ||
    value === "improve_resume" ||
    value === "prepare_interviews";
}

function isPreferredJobType(
  value: unknown,
): value is TargetRoleSetup["preferredJobType"] {
  return value === "frontend" ||
    value === "backend" ||
    value === "full_stack" ||
    value === "ai_ml" ||
    value === "data" ||
    value === "devops" ||
    value === "product" ||
    value === "not_sure";
}

function isWeeklyTimeCommitment(
  value: unknown,
): value is TargetRoleSetup["weeklyTimeCommitment"] {
  return value === "low" || value === "medium" || value === "high";
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" &&
    !Array.isArray(value);
}
