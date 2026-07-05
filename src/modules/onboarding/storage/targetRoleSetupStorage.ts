import type { TargetRoleSetup } from "@/modules/onboarding/types";
import { notifySkillMintWorkspaceUpdated } from "@/lib/storage/skillMintStorageEvents";

export const TARGET_ROLE_SETUP_STORAGE_KEY = "skillmint:target-role-setup";

export function getTargetRoleSetup(): TargetRoleSetup | null {
  const storage = getBrowserStorage();

  if (!storage) {
    return null;
  }

  try {
    const storedValue = storage.getItem(TARGET_ROLE_SETUP_STORAGE_KEY);

    if (!storedValue) {
      return null;
    }

    const parsedValue = JSON.parse(storedValue);

    return isTargetRoleSetup(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

export function saveTargetRoleSetup(setup: TargetRoleSetup): void {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(TARGET_ROLE_SETUP_STORAGE_KEY, JSON.stringify(setup));
    notifySkillMintWorkspaceUpdated();
  } catch {
    return;
  }
}

export function clearTargetRoleSetup(): void {
  const storage = getBrowserStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(TARGET_ROLE_SETUP_STORAGE_KEY);
    notifySkillMintWorkspaceUpdated();
  } catch {
    return;
  }
}

function isTargetRoleSetup(value: unknown): value is TargetRoleSetup {
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
    typeof value.updatedAt === "string"
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
