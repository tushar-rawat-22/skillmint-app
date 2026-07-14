import type { CareerRoadmap } from "@/intelligence/core/careerRoadmap";
import type {
  ActiveTarget,
  ActiveTargetJdMatch,
  ActiveTargetResumeContext,
} from "@/intelligence/target/activeTargetContract";
import type { BrowserJobMatch } from "@/lib/storage/jdMatchCurrentStorage";
import type { SavedJobMatch } from "@/lib/storage/jdMatchHistory";
import {
  isUuidShapedIdentifier,
  type SkillMintExportPolicy,
  type SkillMintStorageCategory,
  type SkillMintStorageOwnerScope,
} from "@/lib/storage/skillMintStorageTypes";
import type { UpgradeInterestRecord } from "@/modules/activation/types";
import {
  isValidAccountExportTimestamp,
  reconstructCareerRoadmapContractValue,
  reconstructJobDescriptionMatchResultContractValue,
  reconstructParsedResumeProfileContractValue,
  reconstructResumeImprovementPlanContractValue,
  reconstructResumeRewritePlanContractValue,
  reconstructUserProfileContractValue,
} from "@/modules/data-controls/accountDataExportContract";
import type { LocalBetaFeedback } from "@/modules/feedback/types";
import type { TargetRoleSetup } from "@/modules/onboarding/types";
import type { ActiveResumeAnalysis } from "@/modules/resume/services/activeResumeReportStorage";

export const BROWSER_DATA_EXPORT_CONTRACT_VERSION =
  "skillmint-browser-contract-v1" as const;

export type BrowserDataExportContractKey =
  | "skillmint:active-target:v1"
  | "skillmint:beta-feedback"
  | "skillmint:jd-match"
  | "skillmint:jd-match-history"
  | "skillmint:jd-match-sync-status"
  | "skillmint:mission-status:v1"
  | "skillmint:onboarding-dismissed"
  | "skillmint:resume-analysis"
  | "skillmint:resume-sync-status"
  | "skillmint:selected-career-path:v1"
  | "skillmint:target-role-setup"
  | "skillmint:upgrade-interest";

export type BrowserDataExportPrivacyTransformation =
  | "sync_status_message_excluded"
  | "database_reference_excluded"
  | "ownership_reference_excluded"
  | "unsafe_job_match_identifier_excluded"
  | "unsafe_job_match_identifier_replaced"
  | "feedback_sync_error_excluded"
  | "feedback_query_removed"
  | "feedback_fragment_removed"
  | "feedback_absolute_url_reduced_to_pathname";

export type BrowserDataExportContractFailureCode =
  | "invalid_export_value"
  | "invalid_export_timestamp"
  | "unsupported_browser_data_contract";

export type BrowserDataExportContractResult<T> =
  | {
      ok: true;
      value: T;
      privacyTransformations: BrowserDataExportPrivacyTransformation[];
    }
  | {
      ok: false;
      code: BrowserDataExportContractFailureCode;
      reason?: "invalid_shape" | "invalid_timestamp" | "sensitive_key";
    };

export type BrowserDataExportSyncStatusSafeValue = {
  status: "synced" | "local-only" | "pending" | "failed";
  syncedAt?: string;
};

export type BrowserDataExportJobMatchSafeValue = Omit<BrowserJobMatch, "databaseId"> & {
  roadmap?: CareerRoadmap;
};

export type BrowserDataExportSavedJobMatchSafeValue = Omit<SavedJobMatch, "databaseId" | "roadmap"> & {
  roadmap?: CareerRoadmap;
};

export type BrowserDataExportFeedbackSafeValue = Omit<LocalBetaFeedback, "syncError">;

export type BrowserDataExportSafeValueByKey = {
  "skillmint:active-target:v1": ActiveTarget;
  "skillmint:beta-feedback": BrowserDataExportFeedbackSafeValue[];
  "skillmint:jd-match": BrowserDataExportJobMatchSafeValue;
  "skillmint:jd-match-history": BrowserDataExportSavedJobMatchSafeValue[];
  "skillmint:jd-match-sync-status": BrowserDataExportSyncStatusSafeValue;
  "skillmint:mission-status:v1": Record<string, "suggested" | "started" | "done_by_user" | "evidence_detected" | "blocked">;
  "skillmint:onboarding-dismissed": boolean;
  "skillmint:resume-analysis": ActiveResumeAnalysis;
  "skillmint:resume-sync-status": BrowserDataExportSyncStatusSafeValue;
  "skillmint:selected-career-path:v1": string;
  "skillmint:target-role-setup": TargetRoleSetup;
  "skillmint:upgrade-interest": UpgradeInterestRecord[];
};

export type BrowserDataExportContract<K extends BrowserDataExportContractKey = BrowserDataExportContractKey> = {
  key: K;
  descriptorKey: K;
  browserContractVersion: typeof BROWSER_DATA_EXPORT_CONTRACT_VERSION;
  descriptorVersion: number;
  category: SkillMintStorageCategory;
  ownerScope: SkillMintStorageOwnerScope;
  exportPolicy: SkillMintExportPolicy;
  containsPersonalData: boolean;
  reconstruct: (value: unknown) => BrowserDataExportContractResult<BrowserDataExportSafeValueByKey[K]>;
};

export type BrowserDataExportCoverageDescriptor = {
  key: unknown;
  version?: unknown;
  category?: unknown;
  ownerScope?: unknown;
  containsPersonalData?: unknown;
  exportable?: unknown;
  exportPolicy?: unknown;
};

export type BrowserDataExportCoverageIssueCode =
  | "duplicate_descriptor_key"
  | "duplicate_contract_key"
  | "missing_contract"
  | "unknown_descriptor"
  | "non_exportable_descriptor"
  | "key_mismatch"
  | "descriptor_version_mismatch"
  | "category_mismatch"
  | "owner_scope_mismatch"
  | "export_policy_mismatch"
  | "personal_data_classification_mismatch"
  | "browser_contract_version_mismatch"
  | "missing_export_policy"
  | "malformed_descriptor"
  | "malformed_contract";

export type BrowserDataExportCoverageResult =
  | { ok: true }
  | { ok: false; issues: Array<{ code: BrowserDataExportCoverageIssueCode; key?: string }> };

const VERSION = BROWSER_DATA_EXPORT_CONTRACT_VERSION;

export const BROWSER_DATA_EXPORT_CONTRACTS: readonly BrowserDataExportContract[] = [
  contract("skillmint:active-target:v1", 1, "active_target", "anonymous_or_account", "json_value", true, reconstructActiveTarget),
  contract("skillmint:beta-feedback", 1, "feedback", "anonymous_or_account", "json_value", true, reconstructFeedbackList),
  contract("skillmint:jd-match", 1, "job_match", "anonymous_or_account", "json_value", true, reconstructCurrentJobMatch),
  contract("skillmint:jd-match-history", 1, "job_match", "anonymous_or_account", "json_value", true, reconstructJobMatchHistory),
  contract("skillmint:jd-match-sync-status", 1, "sync_status", "anonymous_or_account", "json_value", false, reconstructSyncStatus),
  contract("skillmint:mission-status:v1", 1, "mission", "anonymous_or_account", "json_value", true, reconstructMissionStatusMap),
  contract("skillmint:onboarding-dismissed", 1, "onboarding", "global_preference", "boolean_string", false, reconstructBoolean),
  contract("skillmint:resume-analysis", 1, "resume", "anonymous_or_account", "json_value", true, reconstructActiveResume),
  contract("skillmint:resume-sync-status", 1, "sync_status", "anonymous_or_account", "json_value", false, reconstructSyncStatus),
  contract("skillmint:selected-career-path:v1", 1, "mission", "anonymous_or_account", "string_value", true, reconstructSelectedCareerPath),
  contract("skillmint:target-role-setup", 1, "onboarding", "anonymous_or_account", "json_value", true, reconstructTargetRoleSetup),
  contract("skillmint:upgrade-interest", 1, "activation", "global_preference", "json_value", false, reconstructUpgradeInterestList),
];

export function getBrowserDataExportContract(
  key: string,
): BrowserDataExportContract | undefined {
  return BROWSER_DATA_EXPORT_CONTRACTS.find((item) => item.key === key);
}

export function validateBrowserDataExportContractCoverage(
  descriptors: readonly BrowserDataExportCoverageDescriptor[] | unknown,
  contracts: readonly BrowserDataExportContract[] | unknown = BROWSER_DATA_EXPORT_CONTRACTS,
): BrowserDataExportCoverageResult {
  try {
    return validateBrowserDataExportContractCoverageUnchecked(
      descriptors,
      contracts,
    );
  } catch {
    return { ok: false, issues: [{ code: "malformed_descriptor" }] };
  }
}

function validateBrowserDataExportContractCoverageUnchecked(
  descriptors: readonly BrowserDataExportCoverageDescriptor[] | unknown,
  contracts: readonly BrowserDataExportContract[] | unknown,
): BrowserDataExportCoverageResult {
  const issues: Array<{ code: BrowserDataExportCoverageIssueCode; key?: string }> = [];
  if (!Array.isArray(descriptors)) return { ok: false, issues: [{ code: "malformed_descriptor" }] };
  if (!Array.isArray(contracts)) return { ok: false, issues: [{ code: "malformed_contract" }] };

  const descriptorByKey = new Map<string, BrowserDataExportCoverageDescriptor>();
  for (const descriptor of descriptors) {
    if (!isCoverageDescriptorMetadata(descriptor)) {
      issues.push({ code: "malformed_descriptor" });
      continue;
    }
    if (descriptorByKey.has(descriptor.key)) issues.push({ code: "duplicate_descriptor_key", key: descriptor.key });
    else descriptorByKey.set(
      descriptor.key,
      descriptor as unknown as BrowserDataExportCoverageDescriptor,
    );
    if (descriptor.exportable === true && descriptor.exportPolicy === undefined) {
      issues.push({ code: "missing_export_policy", key: descriptor.key });
    }
  }

  const contractByKey = new Map<string, BrowserDataExportContract>();
  for (const candidate of contracts) {
    if (!isCoverageContractMetadata(candidate)) {
      issues.push({ code: "malformed_contract" });
      continue;
    }
    const item = candidate as unknown as BrowserDataExportContract;
    if (contractByKey.has(item.key)) issues.push({ code: "duplicate_contract_key", key: item.key });
    else contractByKey.set(item.key, item);
  }

  for (const [key, descriptor] of descriptorByKey) {
    const item = contractByKey.get(key);
    if (descriptor.exportable === true && !item) {
      issues.push({ code: "missing_contract", key });
      continue;
    }
    if (!item) continue;
    if (descriptor.exportable !== true) issues.push({ code: "non_exportable_descriptor", key });
    compareCoverageMetadata(descriptor, item, issues);
  }
  for (const key of contractByKey.keys()) {
    if (!descriptorByKey.has(key)) issues.push({ code: "unknown_descriptor", key });
  }
  return issues.length ? { ok: false, issues } : { ok: true };
}

function isCoverageDescriptorMetadata(
  value: unknown,
): value is BrowserDataExportCoverageDescriptor & { key: string } {
  if (!isPlainRecord(value) || typeof value.key !== "string" || !value.key) {
    return false;
  }
  return isPositiveInteger(value.version) &&
    isStorageCategory(value.category) &&
    isOwnerScope(value.ownerScope) &&
    typeof value.containsPersonalData === "boolean" &&
    typeof value.exportable === "boolean" &&
    (value.exportPolicy === undefined || isExportPolicy(value.exportPolicy));
}

function isCoverageContractMetadata(value: unknown): boolean {
  if (!isPlainRecord(value)) return false;
  return typeof value.key === "string" && Boolean(value.key) &&
    typeof value.descriptorKey === "string" && Boolean(value.descriptorKey) &&
    isPositiveInteger(value.descriptorVersion) &&
    isStorageCategory(value.category) &&
    isOwnerScope(value.ownerScope) &&
    isExportPolicy(value.exportPolicy) &&
    typeof value.containsPersonalData === "boolean" &&
    typeof value.reconstruct === "function";
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

function isStorageCategory(value: unknown): value is SkillMintStorageCategory {
  return [
    "active_target",
    "activation",
    "feedback",
    "job_match",
    "mission",
    "onboarding",
    "resume",
    "sync_status",
  ].includes(value as SkillMintStorageCategory);
}

function isOwnerScope(value: unknown): value is SkillMintStorageOwnerScope {
  return [
    "global_preference",
    "anonymous_or_account",
    "account_only",
    "non_sensitive_product_state",
  ].includes(value as SkillMintStorageOwnerScope);
}

function isExportPolicy(value: unknown): value is SkillMintExportPolicy {
  return ["json_value", "boolean_string", "string_value"].includes(
    value as SkillMintExportPolicy,
  );
}

function compareCoverageMetadata(
  descriptor: BrowserDataExportCoverageDescriptor,
  item: BrowserDataExportContract,
  issues: Array<{ code: BrowserDataExportCoverageIssueCode; key?: string }>,
) {
  const key = typeof descriptor.key === "string" ? descriptor.key : undefined;
  if (item.descriptorKey !== descriptor.key) issues.push({ code: "key_mismatch", key });
  if (item.browserContractVersion !== BROWSER_DATA_EXPORT_CONTRACT_VERSION) {
    issues.push({ code: "browser_contract_version_mismatch", key });
  }
  if (item.descriptorVersion !== descriptor.version) issues.push({ code: "descriptor_version_mismatch", key });
  if (item.category !== descriptor.category) issues.push({ code: "category_mismatch", key });
  if (item.ownerScope !== descriptor.ownerScope) issues.push({ code: "owner_scope_mismatch", key });
  if (item.exportPolicy !== descriptor.exportPolicy) issues.push({ code: "export_policy_mismatch", key });
  if (item.containsPersonalData !== descriptor.containsPersonalData) {
    issues.push({ code: "personal_data_classification_mismatch", key });
  }
}

function contract<K extends BrowserDataExportContractKey>(
  key: K,
  descriptorVersion: number,
  category: SkillMintStorageCategory,
  ownerScope: SkillMintStorageOwnerScope,
  exportPolicy: SkillMintExportPolicy,
  containsPersonalData: boolean,
  reconstruct: BrowserDataExportContract<K>["reconstruct"],
): BrowserDataExportContract<K> {
  return { key, descriptorKey: key, browserContractVersion: VERSION, descriptorVersion, category, ownerScope, exportPolicy, containsPersonalData, reconstruct };
}

function reconstructActiveResume(value: unknown): BrowserDataExportContractResult<ActiveResumeAnalysis> {
  return attempt(() => {
    const source = exactRecord(value, [
      "fileName",
      "fileType",
      "fileSize",
      "extractedText",
      "parsedProfile",
      "userProfile",
      "analyzedAt",
      "status",
      ...KNOWN_REFERENCE_METADATA_FIELDS,
    ]);
    const referenceMetadata = inspectExcludedReferenceMetadata(source);
    assertSafeNestedGraph(source.parsedProfile);
    assertSafeNestedGraph(source.userProfile);
    const parsedProfile = unwrapShared(reconstructParsedResumeProfileContractValue(source.parsedProfile));
    const userProfile = unwrapShared(reconstructUserProfileContractValue(source.userProfile));
    return success({
      fileName: stringValue(source.fileName),
      fileType: stringValue(source.fileType),
      fileSize: finiteNumber(source.fileSize),
      extractedText: stringValue(source.extractedText),
      parsedProfile,
      userProfile,
      analyzedAt: timestampValue(source.analyzedAt),
      status: enumValue(source.status, ["completed"] as const),
    }, referenceMetadata.transformations);
  });
}

function reconstructSyncStatus(value: unknown): BrowserDataExportContractResult<BrowserDataExportSyncStatusSafeValue> {
  return attempt(() => {
    const source = exactRecord(value, [
      "status",
      "message",
      "syncedAt",
      ...KNOWN_REFERENCE_METADATA_FIELDS,
    ]);
    const referenceMetadata = inspectExcludedReferenceMetadata(source);
    stringValue(required(source, "message"));
    const output: BrowserDataExportSyncStatusSafeValue = {
      status: enumValue(required(source, "status"), ["synced", "local-only", "pending", "failed"] as const),
      ...(hasOwn(source, "syncedAt") ? { syncedAt: timestampValue(source.syncedAt) } : {}),
    };
    return success(output, [
      "sync_status_message_excluded",
      ...referenceMetadata.transformations,
    ]);
  });
}

function reconstructCurrentJobMatch(value: unknown): BrowserDataExportContractResult<BrowserDataExportJobMatchSafeValue> {
  return attempt(() => reconstructJobMatch(value, false));
}

function reconstructJobMatchHistory(value: unknown): BrowserDataExportContractResult<BrowserDataExportSavedJobMatchSafeValue[]> {
  return attempt(() => {
    const source = denseArray(value);
    const rawIds = new Set<string>();
    const outputIds = new Set<string>();
    const identifierReservations = collectHistoryIdentifierReservations(source);
    const items: BrowserDataExportSavedJobMatchSafeValue[] = [];
    const transformations: BrowserDataExportPrivacyTransformation[] = [];
    for (let index = 0; index < source.length; index += 1) {
      const item = reconstructJobMatch(source[index], true, {
        index,
        rawIds,
        outputIds,
        ...identifierReservations,
      });
      if (!item.ok) throwFromResult(item);
      transformations.push(...item.privacyTransformations);
      items.push(item.value as BrowserDataExportSavedJobMatchSafeValue);
    }
    return success(items, transformations);
  });
}

type HistoryJobMatchIdContext = {
  index: number;
  rawIds: Set<string>;
  outputIds: Set<string>;
  privateIdentifiers: ReadonlySet<string>;
  reservedIdentifiers: ReadonlySet<string>;
};

function reconstructJobMatch(
  value: unknown,
  idRequired: boolean,
  historyIdContext?: HistoryJobMatchIdContext,
): BrowserDataExportContractResult<BrowserDataExportJobMatchSafeValue | BrowserDataExportSavedJobMatchSafeValue> {
  return attempt(() => {
    const source = exactRecord(value, [
      "id",
      "syncStatus",
      "jobTitle",
      "companyName",
      "jobDescription",
      "result",
      "improvementPlan",
      "rewritePlan",
      "roadmap",
      "resumeContext",
      "analyzedAt",
      ...KNOWN_REFERENCE_METADATA_FIELDS,
    ]);
    if (idRequired && !hasOwn(source, "id")) throw new InvalidValueError();
    const referenceMetadata = inspectExcludedReferenceMetadata(source);
    const transformations = [...referenceMetadata.transformations];
    let outputId: string | undefined;
    if (hasOwn(source, "id")) {
      const rawId = stringValue(source.id);
      if (historyIdContext) {
        if (historyIdContext.rawIds.has(rawId)) throw new InvalidValueError();
        historyIdContext.rawIds.add(rawId);
      }
      const safeId = getSafeBrowserJobMatchId(
        rawId,
        historyIdContext
          ? historyIdContext.privateIdentifiers
          : new Set(referenceMetadata.excludedIdentifierValues),
      );
      if (safeId && (!historyIdContext || !historyIdContext.outputIds.has(safeId))) {
        outputId = safeId;
      } else if (historyIdContext) {
        outputId = createBrowserExportJobMatchId(
          historyIdContext.index,
          historyIdContext.outputIds,
          historyIdContext.reservedIdentifiers,
        );
        transformations.push("unsafe_job_match_identifier_replaced");
      } else {
        transformations.push("unsafe_job_match_identifier_excluded");
      }
      if (historyIdContext && outputId) historyIdContext.outputIds.add(outputId);
    }
    assertSafeNestedGraph(source.result);
    const result = unwrapShared(reconstructJobDescriptionMatchResultContractValue(source.result));
    const improvementPlan = hasOwn(source, "improvementPlan")
      ? nullableShared(source.improvementPlan, reconstructResumeImprovementPlanContractValue)
      : null;
    const rewritePlan = hasOwn(source, "rewritePlan")
      ? nullableShared(source.rewritePlan, reconstructResumeRewritePlanContractValue)
      : null;
    const output = {
      ...(outputId === undefined ? {} : { id: outputId }),
      ...(hasOwn(source, "syncStatus") ? { syncStatus: enumValue(source.syncStatus, ["synced", "local-only", "pending", "failed"] as const) } : {}),
      jobTitle: stringValue(required(source, "jobTitle")),
      companyName: stringValue(required(source, "companyName")),
      jobDescription: stringValue(required(source, "jobDescription")),
      result,
      improvementPlan,
      rewritePlan,
      ...(hasOwn(source, "roadmap") ? { roadmap: unwrapSharedWithSafety(source.roadmap, reconstructCareerRoadmapContractValue) } : {}),
      ...(hasOwn(source, "resumeContext") ? { resumeContext: reconstructResumeContext(source.resumeContext) } : {}),
      analyzedAt: timestampValue(required(source, "analyzedAt")),
    };
    return success(output, transformations);
  });
}

function reconstructResumeContext(
  value: unknown,
  contract: "job_match" | "active_target" = "job_match",
): ActiveTargetResumeContext {
  const source = exactRecord(value, ["fingerprint", "analyzedAt", "fileName", "scoringVersion"]);
  const stringContract = contract === "active_target" ? nonEmptyString : stringValue;
  return {
    fingerprint: stringContract(required(source, "fingerprint")),
    ...(hasOwn(source, "analyzedAt") ? { analyzedAt: timestampValue(source.analyzedAt) } : {}),
    ...(hasOwn(source, "fileName") ? { fileName: stringContract(source.fileName) } : {}),
    ...(hasOwn(source, "scoringVersion") ? { scoringVersion: stringContract(source.scoringVersion) } : {}),
  };
}

function reconstructActiveTarget(value: unknown): BrowserDataExportContractResult<ActiveTarget> {
  return attempt(() => {
    const source = exactRecord(value, ["id", "source", "status", "title", "companyName", "roleTitle", "location", "jdText", "jdHash", "jdMatch", "targetRole", "careerField", "manualIntent", "mainGap", "nextBestMove", "createdAt", "updatedAt"]);
    const targetSource = enumValue(required(source, "source"), ["latest_jd", "profile_fit", "ultimate_goal", "manual"] as const);
    if (targetSource === "latest_jd" && !hasOwn(source, "jdMatch")) throw new InvalidValueError();
    return success({
      id: nonEmptyString(required(source, "id")),
      source: targetSource,
      status: enumValue(required(source, "status"), ["none", "active", "needs_resume_analysis"] as const),
      title: nonEmptyString(required(source, "title")),
      ...optionalNonEmptyString(source, "companyName"),
      ...optionalNonEmptyString(source, "roleTitle"),
      ...optionalString(source, "location"),
      ...optionalString(source, "jdText"),
      ...optionalString(source, "jdHash"),
      ...(hasOwn(source, "jdMatch") ? { jdMatch: reconstructActiveTargetJdMatch(source.jdMatch) } : {}),
      ...optionalNonEmptyString(source, "targetRole"),
      ...optionalString(source, "careerField"),
      ...(hasOwn(source, "manualIntent") ? { manualIntent: enumValue(source.manualIntent, ["custom_goal"] as const) } : {}),
      mainGap: nonEmptyString(required(source, "mainGap")),
      nextBestMove: nonEmptyString(required(source, "nextBestMove")),
      createdAt: timestampValue(required(source, "createdAt")),
      updatedAt: timestampValue(required(source, "updatedAt")),
    });
  });
}

function reconstructActiveTargetJdMatch(value: unknown): ActiveTargetJdMatch {
  const source = exactRecord(value, ["score", "verdict", "brutalReality", "matchedSkills", "missingSkills", "missingKeywords", "strengths", "weaknesses", "recommendations", "resumeContext"]);
  return {
    score: finiteNumber(required(source, "score")),
    ...optionalString(source, "verdict"),
    ...optionalString(source, "brutalReality"),
    matchedSkills: stringArray(required(source, "matchedSkills")),
    missingSkills: stringArray(required(source, "missingSkills")),
    missingKeywords: stringArray(required(source, "missingKeywords")),
    strengths: stringArray(required(source, "strengths")),
    weaknesses: stringArray(required(source, "weaknesses")),
    recommendations: stringArray(required(source, "recommendations")),
    ...(hasOwn(source, "resumeContext")
      ? { resumeContext: reconstructResumeContext(source.resumeContext, "active_target") }
      : {}),
  };
}

function reconstructTargetRoleSetup(value: unknown): BrowserDataExportContractResult<TargetRoleSetup> {
  return attempt(() => {
    const source = exactRecord(value, ["targetRole", "careerField", "experienceLevel", "primaryGoal", "preferredJobType", "weeklyTimeCommitment", "updatedAt"]);
    return success({
      targetRole: nonEmptyString(required(source, "targetRole")),
      ...(hasOwn(source, "careerField") ? { careerField: enumValue(source.careerField, ["tech_software", "data_analytics", "sales_business_development", "marketing_content", "finance_operations", "design_product", "other"] as const) } : {}),
      experienceLevel: enumValue(required(source, "experienceLevel"), ["student", "fresher", "intern", "junior", "switcher"] as const),
      primaryGoal: enumValue(required(source, "primaryGoal"), ["get_internship", "get_first_job", "switch_role", "improve_resume", "prepare_interviews"] as const),
      preferredJobType: enumValue(required(source, "preferredJobType"), ["frontend", "backend", "full_stack", "ai_ml", "data", "devops", "product", "not_sure"] as const),
      weeklyTimeCommitment: enumValue(required(source, "weeklyTimeCommitment"), ["low", "medium", "high"] as const),
      updatedAt: timestampValue(required(source, "updatedAt")),
    });
  });
}

function reconstructMissionStatusMap(value: unknown): BrowserDataExportContractResult<Record<string, "suggested" | "started" | "done_by_user" | "evidence_detected" | "blocked">> {
  return attempt(() => {
    const source = plainRecord(value);
    const output: Record<string, "suggested" | "started" | "done_by_user" | "evidence_detected" | "blocked"> = Object.create(null);
    for (const key of Object.keys(source).sort(codePointCompare)) {
      if (!key.trim() || isReservedPrototypeKey(key)) throw new SensitiveKeyError();
      output[key] = enumValue(source[key], ["suggested", "started", "done_by_user", "evidence_detected", "blocked"] as const);
    }
    return success(output);
  });
}

function reconstructSelectedCareerPath(value: unknown): BrowserDataExportContractResult<string> {
  return attempt(() => success(nonEmptyString(value)));
}

function reconstructBoolean(value: unknown): BrowserDataExportContractResult<boolean> {
  return attempt(() => {
    if (typeof value !== "boolean") throw new InvalidValueError();
    return success(value);
  });
}

function reconstructFeedbackList(value: unknown): BrowserDataExportContractResult<BrowserDataExportFeedbackSafeValue[]> {
  return attempt(() => {
    const source = denseArray(value);
    const ids = new Set<string>();
    const output: BrowserDataExportFeedbackSafeValue[] = [];
    const transformations: BrowserDataExportPrivacyTransformation[] = [];
    for (const rawItem of source) {
      const item = exactRecord(rawItem, ["id", "feedbackType", "sentiment", "message", "pagePath", "createdAt", "syncStatus", "syncError"]);
      const id = stringValue(required(item, "id"));
      if (ids.has(id)) throw new InvalidValueError();
      ids.add(id);
      const path = reconstructFeedbackPath(required(item, "pagePath"));
      transformations.push(...path.transformations);
      if (hasOwn(item, "syncError")) {
        stringValue(item.syncError);
        transformations.push("feedback_sync_error_excluded");
      }
      output.push({
        id,
        feedbackType: enumValue(required(item, "feedbackType"), ["bug", "confusion", "ui", "idea", "other"] as const),
        sentiment: enumValue(required(item, "sentiment"), ["negative", "neutral", "positive"] as const),
        message: stringValue(required(item, "message")),
        pagePath: path.value,
        createdAt: timestampValue(required(item, "createdAt")),
        syncStatus: enumValue(required(item, "syncStatus"), ["local-only"] as const),
      });
    }
    return success(output, transformations);
  });
}

function reconstructFeedbackPath(value: unknown): { value: string | null; transformations: BrowserDataExportPrivacyTransformation[] } {
  if (value === null) return { value: null, transformations: [] };
  const input = stringValue(value);
  if (/[\u0000-\u001f\u007f]/.test(input)) throw new InvalidValueError();
  if (input.startsWith("//")) throw new InvalidValueError();
  if (input.startsWith("/")) {
    const queryCandidate = input.indexOf("?");
    const fragment = input.indexOf("#");
    const query = queryCandidate >= 0 && (fragment < 0 || queryCandidate < fragment)
      ? queryCandidate
      : -1;
    const end = query >= 0
      ? query
      : fragment >= 0
        ? fragment
        : input.length;
    return {
      value: input.slice(0, end),
      transformations: orderedTransformations([
        ...(query >= 0 ? ["feedback_query_removed" as const] : []),
        ...(fragment >= 0 ? ["feedback_fragment_removed" as const] : []),
      ]),
    };
  }
  if (input.trim() !== input || !/^https?:\/\//i.test(input)) {
    throw new InvalidValueError();
  }
  let url: URL;
  try { url = new URL(input); } catch { throw new InvalidValueError(); }
  if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) throw new InvalidValueError();
  return {
    value: url.pathname,
    transformations: orderedTransformations([
      ...(url.search ? ["feedback_query_removed" as const] : []),
      ...(url.hash ? ["feedback_fragment_removed" as const] : []),
      "feedback_absolute_url_reduced_to_pathname",
    ]),
  };
}

function reconstructUpgradeInterestList(value: unknown): BrowserDataExportContractResult<UpgradeInterestRecord[]> {
  return attempt(() => {
    const ids = new Set<string>();
    const output = denseArray(value).map((rawItem) => {
      const item = exactRecord(rawItem, ["id", "source", "label", "createdAt"]);
      const id = stringValue(required(item, "id"));
      if (ids.has(id)) throw new InvalidValueError();
      ids.add(id);
      return {
        id,
        source: enumValue(required(item, "source"), ["dashboard", "resume", "ats", "roadmap"] as const),
        label: stringValue(required(item, "label")),
        createdAt: timestampValue(required(item, "createdAt")),
      };
    });
    return success(output);
  });
}

function attempt<T>(builder: () => BrowserDataExportContractResult<T>): BrowserDataExportContractResult<T> {
  try { return builder(); } catch (error) {
    if (error instanceof TimestampValueError) return { ok: false, code: "invalid_export_timestamp", reason: "invalid_timestamp" };
    if (error instanceof SensitiveKeyError) return { ok: false, code: "unsupported_browser_data_contract", reason: "sensitive_key" };
    return { ok: false, code: "invalid_export_value", reason: "invalid_shape" };
  }
}

function success<T>(value: T, transformations: BrowserDataExportPrivacyTransformation[] = []): BrowserDataExportContractResult<T> {
  return { ok: true, value, privacyTransformations: orderedTransformations(transformations) };
}

const TRANSFORMATION_ORDER: readonly BrowserDataExportPrivacyTransformation[] = [
  "sync_status_message_excluded",
  "database_reference_excluded",
  "ownership_reference_excluded",
  "unsafe_job_match_identifier_excluded",
  "unsafe_job_match_identifier_replaced",
  "feedback_sync_error_excluded",
  "feedback_query_removed",
  "feedback_fragment_removed",
  "feedback_absolute_url_reduced_to_pathname",
];

function orderedTransformations(values: BrowserDataExportPrivacyTransformation[]): BrowserDataExportPrivacyTransformation[] {
  const included = new Set(values);
  return TRANSFORMATION_ORDER.filter((item) => included.has(item));
}

function unwrapShared<T>(result: { ok: true; value: T } | { ok: false }): T {
  if (!result.ok) throw new InvalidValueError();
  return result.value;
}

function unwrapSharedWithSafety<T>(value: unknown, reconstructor: (input: unknown) => { ok: true; value: T } | { ok: false }): T {
  assertSafeNestedGraph(value);
  return unwrapShared(reconstructor(value));
}

function nullableShared<T>(value: unknown, reconstructor: (input: unknown) => { ok: true; value: T } | { ok: false }): T | null {
  if (value === null) return null;
  return unwrapSharedWithSafety(value, reconstructor);
}

const OWNERSHIP_REFERENCE_FIELDS = ["accountId", "userId", "ownerId"] as const;
const REMOTE_RECORD_REFERENCE_FIELDS = [
  "databaseId",
  "serverRecordId",
  "remoteId",
] as const;
const KNOWN_REFERENCE_METADATA_FIELDS = [
  ...OWNERSHIP_REFERENCE_FIELDS,
  ...REMOTE_RECORD_REFERENCE_FIELDS,
] as const;

function inspectExcludedReferenceMetadata(
  source: Record<string, unknown>,
): {
  excludedIdentifierValues: string[];
  transformations: BrowserDataExportPrivacyTransformation[];
} {
  const excludedIdentifierValues: string[] = [];
  let ownershipReferenceExcluded = false;
  let databaseReferenceExcluded = false;

  for (const key of OWNERSHIP_REFERENCE_FIELDS) {
    if (!hasOwn(source, key)) continue;
    excludedIdentifierValues.push(stringValue(source[key]));
    ownershipReferenceExcluded = true;
  }

  for (const key of REMOTE_RECORD_REFERENCE_FIELDS) {
    if (!hasOwn(source, key)) continue;
    excludedIdentifierValues.push(stringValue(source[key]));
    databaseReferenceExcluded = true;
  }

  return {
    excludedIdentifierValues,
    transformations: orderedTransformations([
      ...(databaseReferenceExcluded
        ? ["database_reference_excluded" as const]
        : []),
      ...(ownershipReferenceExcluded
        ? ["ownership_reference_excluded" as const]
        : []),
    ]),
  };
}

function collectHistoryIdentifierReservations(
  source: readonly unknown[],
): {
  privateIdentifiers: ReadonlySet<string>;
  reservedIdentifiers: ReadonlySet<string>;
} {
  const privateIdentifiers = new Set<string>();
  const reservedIdentifiers = new Set<string>();

  for (const rawItem of source) {
    const item = plainRecord(rawItem);
    if (typeof item.id === "string") reservedIdentifiers.add(item.id);
    for (const key of KNOWN_REFERENCE_METADATA_FIELDS) {
      if (typeof item[key] !== "string") continue;
      privateIdentifiers.add(item[key]);
      reservedIdentifiers.add(item[key]);
    }
  }

  return { privateIdentifiers, reservedIdentifiers };
}

function getSafeBrowserJobMatchId(
  id: string,
  excludedIdentifierValues: ReadonlySet<string>,
): string | undefined {
  if (
    !id.trim() ||
    isUuidShapedIdentifier(id) ||
    excludedIdentifierValues.has(id)
  ) {
    return undefined;
  }
  return id;
}

function createBrowserExportJobMatchId(
  index: number,
  usedIds: ReadonlySet<string>,
  reservedIdentifiers: ReadonlySet<string>,
): string {
  const base = `browser-export-jd-${index + 1}`;
  let suffix = 1;
  let candidate = base;
  while (usedIds.has(candidate) || reservedIdentifiers.has(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }
  return candidate;
}

function throwFromResult(result: { ok: false; code: BrowserDataExportContractFailureCode }): never {
  if (result.code === "invalid_export_timestamp") throw new TimestampValueError();
  if (result.code === "unsupported_browser_data_contract") throw new SensitiveKeyError();
  throw new InvalidValueError();
}

function assertSafeNestedGraph(value: unknown): void {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    denseArray(value).forEach(assertSafeNestedGraph);
    return;
  }
  const record = plainRecord(value);
  for (const key of Object.keys(record)) {
    if (isSensitiveUnexpectedKey(key)) throw new SensitiveKeyError();
    assertSafeNestedGraph(record[key]);
  }
}

function exactRecord(value: unknown, keys: readonly string[]): Record<string, unknown> {
  const record = plainRecord(value);
  const allowed = new Set(keys);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key) && isSensitiveUnexpectedKey(key)) {
      throw new SensitiveKeyError();
    }
  }
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      throw new InvalidValueError();
    }
  }
  return record;
}

function plainRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InvalidValueError();
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new InvalidValueError();
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      typeof key !== "string" ||
      !descriptor?.enumerable ||
      !("value" in descriptor)
    ) {
      throw new InvalidValueError();
    }
  }
  return value as Record<string, unknown>;
}

function denseArray(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new InvalidValueError();
  const ownKeys = Object.keys(value);
  if (ownKeys.length !== value.length) throw new InvalidValueError();
  for (const key of Reflect.ownKeys(value)) {
    if (key === "length") continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (
      typeof key !== "string" ||
      !descriptor?.enumerable ||
      !("value" in descriptor)
    ) {
      throw new InvalidValueError();
    }
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!hasOwn(value, String(index))) throw new InvalidValueError();
  }
  return value;
}

function required(record: Record<string, unknown>, key: string): unknown {
  if (!hasOwn(record, key)) throw new InvalidValueError();
  return record[key];
}

function hasOwn(record: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function stringValue(value: unknown): string {
  if (typeof value !== "string") throw new InvalidValueError();
  return value;
}

function nonEmptyString(value: unknown): string {
  const output = stringValue(value);
  if (!output.trim()) throw new InvalidValueError();
  return output;
}

function finiteNumber(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) throw new InvalidValueError();
  return value;
}

function timestampValue(value: unknown): string {
  if (!isValidAccountExportTimestamp(value)) throw new TimestampValueError();
  return value;
}

function enumValue<const T extends readonly string[]>(value: unknown, values: T): T[number] {
  if (typeof value !== "string" || !values.includes(value)) throw new InvalidValueError();
  return value as T[number];
}

function stringArray(value: unknown): string[] {
  return denseArray(value).map(stringValue);
}

function optionalString(record: Record<string, unknown>, key: string): Record<string, string> {
  return hasOwn(record, key) ? { [key]: stringValue(record[key]) } : {};
}

function optionalNonEmptyString(record: Record<string, unknown>, key: string): Record<string, string> {
  return hasOwn(record, key) ? { [key]: nonEmptyString(record[key]) } : {};
}

function isSensitiveUnexpectedKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return new Set(["accesstoken", "refreshtoken", "authorization", "bearer", "jwt", "apikey", "anonkey", "servicerolekey", "cookie", "session", "password", "secret", "clientsecret", "privatekey", "rawprovidererror", "stacktrace", "userid", "accountid", "ownerid", "owneruserid", "databaseid", "serverrecordid", "remoteid", "proto", "prototype", "constructor"]).has(normalized);
}

function isReservedPrototypeKey(key: string): boolean {
  return key === "__proto__" || key === "prototype" || key === "constructor";
}

function codePointCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

class InvalidValueError extends Error {}
class TimestampValueError extends InvalidValueError {}
class SensitiveKeyError extends InvalidValueError {}
