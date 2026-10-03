export const CANDIDATE_JOB_LIFECYCLE_COLUMNS = [
  "id",
  "user_id",
  "provider",
  "provider_account_id",
  "source_native_id",
  "source_key",
  "original_apply_url",
  "role_title",
  "company_name",
  "location",
  "source_updated_at",
  "source_fetched_at",
  "provider_availability",
  "workflow_state",
  "applied_at",
  "follow_up_at",
  "follow_up_completed_at",
  "created_at",
  "updated_at",
] as const;

export const CANDIDATE_JOB_LIFECYCLE_SELECT =
  CANDIDATE_JOB_LIFECYCLE_COLUMNS.join(",");

export type CandidateJobProviderAvailability =
  | "live"
  | "stale"
  | "closed"
  | "unavailable";

export type CandidateJobWorkflowState =
  | "saved"
  | "applied"
  | "withdrawn"
  | "archived";

export type CandidateJobLifecycleRecord = {
  readonly id: string;
  readonly userId: string;
  readonly provider: "greenhouse";
  readonly providerAccountId: string;
  readonly sourceNativeId: string;
  readonly sourceKey: string;
  readonly originalApplyUrl: string;
  readonly roleTitle: string;
  readonly companyName: string;
  readonly location: string | null;
  readonly sourceUpdatedAt: string | null;
  readonly sourceFetchedAt: string;
  readonly providerAvailability: CandidateJobProviderAvailability;
  readonly workflowState: CandidateJobWorkflowState;
  readonly appliedAt: string | null;
  readonly followUpAt: string | null;
  readonly followUpCompletedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CandidateJobLifecycleMutation =
  | { readonly action: "save" }
  | { readonly action: "mark_applied" }
  | { readonly action: "set_follow_up"; readonly followUpAt: string }
  | { readonly action: "complete_follow_up" }
  | { readonly action: "withdraw" }
  | { readonly action: "archive" }
  | { readonly action: "refresh_provider" };

export function parseCandidateJobLifecycleMutation(
  value: unknown,
): CandidateJobLifecycleMutation | null {
  if (!isRecord(value) || typeof value.action !== "string") return null;

  if (
    [
      "save",
      "mark_applied",
      "complete_follow_up",
      "withdraw",
      "archive",
      "refresh_provider",
    ].includes(value.action) &&
    hasExactKeys(value, ["action"])
  ) {
    return { action: value.action } as CandidateJobLifecycleMutation;
  }

  if (
    value.action === "set_follow_up" &&
    hasExactKeys(value, ["action", "followUpAt"]) &&
    isIsoTimestamp(value.followUpAt)
  ) {
    return { action: "set_follow_up", followUpAt: value.followUpAt };
  }

  return null;
}

export function parseCandidateJobLifecycleRecord(
  value: unknown,
  expectedUserId?: string,
): CandidateJobLifecycleRecord | null {
  if (!isRecord(value)) return null;
  if (expectedUserId && value.user_id !== expectedUserId) return null;
  if (!isUuid(value.id) || !isUuid(value.user_id)) return null;
  if (value.provider !== "greenhouse") return null;
  if (!isProviderAccountId(value.provider_account_id)) return null;
  if (!isBoundedText(value.source_native_id, 1, 160)) return null;
  const expectedSourceKey = `greenhouse:${value.provider_account_id}:${value.source_native_id}`;
  if (value.source_key !== expectedSourceKey) return null;
  if (!isHttpUrl(value.original_apply_url)) return null;
  if (!isBoundedText(value.role_title, 1, 240)) return null;
  if (!isBoundedText(value.company_name, 1, 240)) return null;
  if (
    value.location !== null &&
    !isBoundedText(value.location, 1, 240)
  ) return null;
  if (value.source_updated_at !== null && !isIsoTimestamp(value.source_updated_at)) {
    return null;
  }
  if (!isIsoTimestamp(value.source_fetched_at)) return null;
  if (!isProviderAvailability(value.provider_availability)) return null;
  if (!isWorkflowState(value.workflow_state)) return null;
  if (value.applied_at !== null && !isIsoTimestamp(value.applied_at)) return null;
  if (value.follow_up_at !== null && !isIsoTimestamp(value.follow_up_at)) return null;
  if (
    value.follow_up_completed_at !== null &&
    !isIsoTimestamp(value.follow_up_completed_at)
  ) return null;
  if (!isIsoTimestamp(value.created_at) || !isIsoTimestamp(value.updated_at)) {
    return null;
  }
  if (value.workflow_state === "applied" && value.applied_at === null) return null;
  if (value.follow_up_completed_at !== null && value.follow_up_at === null) return null;

  return {
    id: value.id,
    userId: value.user_id,
    provider: "greenhouse",
    providerAccountId: value.provider_account_id,
    sourceNativeId: value.source_native_id,
    sourceKey: value.source_key,
    originalApplyUrl: value.original_apply_url,
    roleTitle: value.role_title,
    companyName: value.company_name,
    location: value.location,
    sourceUpdatedAt: value.source_updated_at,
    sourceFetchedAt: value.source_fetched_at,
    providerAvailability: value.provider_availability,
    workflowState: value.workflow_state,
    appliedAt: value.applied_at,
    followUpAt: value.follow_up_at,
    followUpCompletedAt: value.follow_up_completed_at,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

export function parseGreenhouseSourceKey(value: unknown): {
  readonly providerAccountId: string;
  readonly sourceNativeId: string;
  readonly sourceKey: string;
} | null {
  if (typeof value !== "string" || value.length > 260) return null;
  const match = /^greenhouse:([a-z0-9][a-z0-9_-]{0,79}):(.{1,160})$/u.exec(value);
  if (!match || match[2].includes(":")) return null;
  return {
    providerAccountId: match[1],
    sourceNativeId: match[2],
    sourceKey: value,
  };
}

function isProviderAvailability(
  value: unknown,
): value is CandidateJobProviderAvailability {
  return typeof value === "string" &&
    ["live", "stale", "closed", "unavailable"].includes(value);
}

function isWorkflowState(value: unknown): value is CandidateJobWorkflowState {
  return typeof value === "string" &&
    ["saved", "applied", "withdrawn", "archived"].includes(value);
}

function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 40) return false;
  if (
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u.test(value)
  ) return false;
  return !Number.isNaN(new Date(value).getTime());
}

function isHttpUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 2_048) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value);
}

function isProviderAccountId(value: unknown): value is string {
  return typeof value === "string" &&
    /^[a-z0-9][a-z0-9_-]{0,79}$/u.test(value);
}

function isBoundedText(
  value: unknown,
  minimum: number,
  maximum: number,
): value is string {
  return typeof value === "string" &&
    value.trim() === value &&
    value.length >= minimum &&
    value.length <= maximum;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  return Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
}
