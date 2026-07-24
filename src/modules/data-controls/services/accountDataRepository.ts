"use client";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import {
  ACCOUNT_EXPORT_TABLE_CONTRACTS,
  getUuidComparisonKey,
  isUuidShapedAccountExportId,
  isValidAccountExportTimestamp,
  type AccountExportTableContract,
} from "@/modules/data-controls/accountDataExportContract";
import type {
  AccountDataCounts,
  AccountDataErrorCode,
  AccountDataExport,
  AccountDataExportFile,
  AccountDataRepositoryError,
  AccountExportCountOnlyIntegrity,
  AccountExportKeysetPaginationIntegrity,
  AccountExportNoPaginationIntegrity,
  AccountExportTableIntegrity,
  BetaFeedbackExportRow,
  JobMatchExportRow,
  ProfileExportRow,
  RepositoryResult,
  ResumeAnalysisExportRow,
  SavedReportsDeletionCounts,
} from "@/modules/data-controls/types";

type SupabaseBrowserClient = NonNullable<
  ReturnType<typeof createSupabaseBrowserClient>
>;

type SavedReportsRpcRow = {
  resume_analyses_deleted?: number;
  job_matches_deleted?: number;
  career_snapshots_deleted?: number;
};

type AdapterResponse = {
  data: unknown;
  error: unknown | null;
  status?: number;
};

export type AccountDataExportQueryAdapter = {
  getAuthenticatedUserId: () => Promise<AdapterResponse>;
  getExactCount: (input: {
    tableName: AccountOwnedTableName;
    ownerColumn: "id" | "user_id";
    expectedUserId: string;
  }) => Promise<AdapterResponse>;
  getProfileRows: (input: {
    expectedUserId: string;
    selectedColumns: string;
    limit: 2;
  }) => Promise<AdapterResponse>;
  getKeysetPage: (input: {
    tableName: "resume_analyses" | "job_matches" | "beta_feedback";
    ownerColumn: "user_id";
    expectedUserId: string;
    selectedColumns: string;
    cursor: string | null;
    limit: number;
  }) => Promise<AdapterResponse>;
};

export type AccountExportLimits = {
  pageSize: number;
  maxPagesPerTable: number;
  maxRowsPerTable: number;
  maxTotalRows: number;
  maxSerializedBytes: number;
};

export const ACCOUNT_EXPORT_LIMITS: Readonly<AccountExportLimits> = {
  // Adjustable beta safeguards, not plan, pricing, or entitlement limits.
  pageSize: 250,
  maxPagesPerTable: 100,
  maxRowsPerTable: 25_000,
  maxTotalRows: 50_000,
  maxSerializedBytes: 10 * 1024 * 1024,
};

export type AccountExportCollectorOptions = {
  limits?: Partial<AccountExportLimits>;
  serialize?: (payload: AccountDataExport) => string;
  expectedUserId?: string;
};

type ResourceState = {
  totalRows: number;
  estimatedSerializedBytes: number;
};

type CollectedTable<
  T,
  TIntegrity extends AccountExportTableIntegrity = AccountExportTableIntegrity,
> = {
  rows: T[];
  integrity: TIntegrity;
};

export async function getCurrentUserAccountDataCounts(
  expectedUserId?: string,
): Promise<
  RepositoryResult<AccountDataCounts>
> {
  const authResult = await getCurrentAuthUser(expectedUserId);

  if (!authResult.ok) return authResult;

  const { supabase, userId } = authResult.data;

  try {
    const [
      profileCount,
      resumeAnalysesCount,
      jobMatchesCount,
      careerSnapshotsCount,
      betaFeedbackCount,
    ] = await Promise.all([
      getCount(supabase, "profiles", "id", userId),
      getCount(supabase, "resume_analyses", "user_id", userId),
      getCount(supabase, "job_matches", "user_id", userId),
      getCount(supabase, "career_snapshots", "user_id", userId),
      getCount(supabase, "beta_feedback", "user_id", userId),
    ]);

    const counts = [
      profileCount,
      resumeAnalysesCount,
      jobMatchesCount,
      careerSnapshotsCount,
      betaFeedbackCount,
    ];
    const failedCount = counts.find((count) => !count.ok);

    if (failedCount && !failedCount.ok) return failedCount;

    if (
      !profileCount.ok ||
      !resumeAnalysesCount.ok ||
      !jobMatchesCount.ok ||
      !careerSnapshotsCount.ok ||
      !betaFeedbackCount.ok
    ) {
      return failure("unknown");
    }

    const finalIdentity = await confirmSupabaseIdentity(supabase, userId);
    if (!finalIdentity.ok) return finalIdentity;

    return {
      ok: true,
      data: {
        profile: profileCount.data,
        resumeAnalyses: resumeAnalysesCount.data,
        jobMatches: jobMatchesCount.data,
        careerSnapshots: careerSnapshotsCount.data,
        betaFeedback: betaFeedbackCount.data,
      },
    };
  } catch {
    return failure("unknown");
  }
}

export async function buildCurrentUserAccountDataExport(
  request: string | {
    expectedUserId?: string;
    exportedAt?: string;
  } = {},
): Promise<RepositoryResult<AccountDataExportFile>> {
  const configStatus = getSupabaseConfigStatus();

  if (!configStatus.isConfigured) return failure("not_configured");

  const supabase = createSupabaseBrowserClient();

  if (!supabase) return failure("not_configured");

  const exportedAt = typeof request === "string"
    ? request
    : request.exportedAt ?? new Date().toISOString();

  return buildAccountDataExportWithAdapter(
    createSupabaseAccountExportAdapter(supabase),
    exportedAt,
    typeof request === "string"
      ? {}
      : { expectedUserId: request.expectedUserId },
  );
}

export async function buildAccountDataExportWithAdapter(
  adapter: AccountDataExportQueryAdapter,
  exportedAt: string,
  options: AccountExportCollectorOptions = {},
): Promise<RepositoryResult<AccountDataExportFile>> {
  if (!isValidAccountExportTimestamp(exportedAt)) {
    return failure("invalid_response");
  }

  const limits = getLimits(options.limits);
  const normalizedRequestedUserId = options.expectedUserId === undefined
    ? undefined
    : normalizeExpectedUserId(options.expectedUserId);
  if (options.expectedUserId !== undefined && !normalizedRequestedUserId) {
    return failure("not_authenticated");
  }
  const expectedIdentity = await readAuthenticatedUserId(adapter);

  if (!expectedIdentity.ok) return expectedIdentity;

  const requestedUserId = normalizedRequestedUserId ?? expectedIdentity.data;
  if (!requestedUserId) return failure("not_authenticated");
  if (expectedIdentity.data !== requestedUserId) {
    return failure("account_changed");
  }
  const expectedUserId = requestedUserId;
  const resourceState: ResourceState = {
    totalRows: 0,
    estimatedSerializedBytes: 0,
  };

  const beforeTables = await checkExpectedIdentity(adapter, expectedUserId);
  if (!beforeTables.ok) return beforeTables;

  const profiles = await collectProfileTable(
    adapter,
    expectedUserId,
    limits,
    resourceState,
  );
  if (!profiles.ok) return profiles;

  const afterProfiles = await checkExpectedIdentity(adapter, expectedUserId);
  if (!afterProfiles.ok) return afterProfiles;

  const resumeAnalyses = await collectKeysetTable<ResumeAnalysisExportRow>(
    adapter,
    ACCOUNT_EXPORT_TABLE_CONTRACTS.resume_analyses,
    expectedUserId,
    limits,
    resourceState,
  );
  if (!resumeAnalyses.ok) return resumeAnalyses;

  const afterResumeAnalyses = await checkExpectedIdentity(adapter, expectedUserId);
  if (!afterResumeAnalyses.ok) return afterResumeAnalyses;

  const jobMatches = await collectKeysetTable<JobMatchExportRow>(
    adapter,
    ACCOUNT_EXPORT_TABLE_CONTRACTS.job_matches,
    expectedUserId,
    limits,
    resourceState,
  );
  if (!jobMatches.ok) return jobMatches;

  const afterJobMatches = await checkExpectedIdentity(adapter, expectedUserId);
  if (!afterJobMatches.ok) return afterJobMatches;

  const careerSnapshots = await collectCareerSnapshotsCountOnly(
    adapter,
    expectedUserId,
  );
  if (!careerSnapshots.ok) return careerSnapshots;

  const afterCareerSnapshots = await checkExpectedIdentity(adapter, expectedUserId);
  if (!afterCareerSnapshots.ok) return afterCareerSnapshots;

  const betaFeedback = await collectKeysetTable<BetaFeedbackExportRow>(
    adapter,
    ACCOUNT_EXPORT_TABLE_CONTRACTS.beta_feedback,
    expectedUserId,
    limits,
    resourceState,
  );
  if (!betaFeedback.ok) return betaFeedback;

  const afterCollectors = await checkExpectedIdentity(adapter, expectedUserId);
  if (!afterCollectors.ok) return afterCollectors;

  const payload: AccountDataExport = {
    exportVersion: "skillmint-account-export-v2",
    schemaContractVersion: "skillmint-account-contract-v1",
    source: "account",
    exportedAt,
    accountScope: "current_authenticated_account",
    accountIdentity: {
      included: false,
      checkpointChecksPassed: true,
      continuousIdentityStabilityProven: false,
    },
    manifest: {
      tables: {
        profiles: profiles.data.integrity,
        resume_analyses: resumeAnalyses.data.integrity,
        job_matches: jobMatches.data.integrity,
        career_snapshots: careerSnapshots.data.integrity,
        beta_feedback: betaFeedback.data.integrity,
      },
      allCollectorsSucceeded: true,
      serializationSucceeded: true,
      consistency: {
        pointInTimeSnapshot: false,
        statement:
          "Rows were collected through separate authenticated browser requests. The export is not a point-in-time transactional database snapshot, and concurrent changes may remain undetected even when observed counts are stable.",
      },
    },
    data: {
      profiles: profiles.data.rows,
      resume_analyses: resumeAnalyses.data.rows,
      job_matches: jobMatches.data.rows,
      career_snapshots: [],
      beta_feedback: betaFeedback.data.rows,
    },
  };

  let json: string;
  try {
    const serialize = options.serialize ?? ((value: AccountDataExport) =>
      JSON.stringify(value, null, 2));
    const serializedPayload: unknown = serialize(payload);
    if (typeof serializedPayload !== "string") {
      return failure("serialization_failed");
    }
    json = `${serializedPayload}\n`;
  } catch {
    return failure("serialization_failed");
  }

  if (getUtf8ByteLength(json) > limits.maxSerializedBytes) {
    return failure("export_too_large");
  }

  const beforeReturn = await checkExpectedIdentity(adapter, expectedUserId);
  if (!beforeReturn.ok) return beforeReturn;

  return {
    ok: true,
    data: {
      fileName: `skillmint-account-${exportedAt.slice(0, 10)}.json`,
      json,
    },
  };
}

export async function deleteCurrentUserSavedReports(
  expectedUserId?: string,
): Promise<
  RepositoryResult<SavedReportsDeletionCounts>
> {
  const authResult = await getCurrentAuthUser(expectedUserId);

  if (!authResult.ok) return authResult;

  const { data, error, status } = await authResult.data.supabase.rpc(
    "delete_current_user_saved_reports",
  );

  if (error) return providerFailure(error, status);

  const finalIdentity = await confirmSupabaseIdentity(
    authResult.data.supabase,
    authResult.data.userId,
  );
  if (!finalIdentity.ok) return finalIdentity;

  return parseSavedReportsDeletionCounts(data);
}

export function parseSavedReportsDeletionCounts(
  data: unknown,
): RepositoryResult<SavedReportsDeletionCounts> {
  const row = Array.isArray(data)
    ? data.length === 1 ? data[0] : null
    : data;

  if (!isSavedReportsRpcRow(row)) return failure("invalid_response");

  const resumeAnalysesDeleted = row.resume_analyses_deleted;
  const jobMatchesDeleted = row.job_matches_deleted;
  const careerSnapshotsDeleted = row.career_snapshots_deleted;

  if (
    !isValidCount(resumeAnalysesDeleted) ||
    !isValidCount(jobMatchesDeleted) ||
    !isValidCount(careerSnapshotsDeleted)
  ) {
    return failure("invalid_response");
  }

  return {
    ok: true,
    data: {
      resumeAnalysesDeleted,
      jobMatchesDeleted,
      careerSnapshotsDeleted,
    },
  };
}

function createSupabaseAccountExportAdapter(
  supabase: SupabaseBrowserClient,
): AccountDataExportQueryAdapter {
  return {
    async getAuthenticatedUserId() {
      const { data, error } = await supabase.auth.getUser();
      return {
        data: data.user?.id ?? null,
        error,
      };
    },
    async getExactCount(input) {
      const { count, error, status } = await getExactSupabaseCount(
        supabase,
        input.tableName,
        input.expectedUserId,
      );
      return { data: count, error, status };
    },
    async getProfileRows(input) {
      const { data, error, status } = await supabase
        .from("profiles")
        .select(input.selectedColumns)
        .eq("id", input.expectedUserId)
        .limit(input.limit);
      return { data, error, status };
    },
    async getKeysetPage(input) {
      let query = supabase
        .from(input.tableName)
        .select(input.selectedColumns)
        .eq(input.ownerColumn, input.expectedUserId)
        .order("id", { ascending: true })
        .limit(input.limit);

      if (input.cursor) query = query.gt("id", input.cursor);

      const { data, error, status } = await query;
      return { data, error, status };
    },
  };
}

async function collectProfileTable(
  adapter: AccountDataExportQueryAdapter,
  expectedUserId: string,
  limits: AccountExportLimits,
  resourceState: ResourceState,
): Promise<RepositoryResult<CollectedTable<
  ProfileExportRow,
  AccountExportNoPaginationIntegrity
>>> {
  const contract = ACCOUNT_EXPORT_TABLE_CONTRACTS.profiles;
  const preCount = await getAdapterCount(adapter, contract, expectedUserId);
  if (!preCount.ok) return preCount;

  const responseResult = await safeAdapterCall(() =>
    adapter.getProfileRows({
      expectedUserId,
      selectedColumns: contract.selectedColumns,
      limit: 2,
    })
  );
  if (!responseResult.ok) return responseResult;
  const response = responseResult.data;
  if (response.error) return providerFailure(response.error, response.status);
  if (!Array.isArray(response.data)) return failure("invalid_response");
  if (response.data.length > 1) return failure("cardinality_violation");

  const rows: ProfileExportRow[] = [];
  for (const providerRow of response.data) {
    if (!providerRowBelongsToExpectedAccount(providerRow, "id", expectedUserId)) {
      return failure("invalid_response");
    }
    const reconstructed = contract.reconstructRow(providerRow);
    if (!reconstructed.ok) return failure("invalid_response");
    const guard = recordResourceUse(reconstructed.value, resourceState, limits, 1);
    if (!guard.ok) return guard;
    rows.push(reconstructed.value);
  }

  const postCount = await getAdapterCount(adapter, contract, expectedUserId);
  if (!postCount.ok) return postCount;

  const reconciled = reconcileCounts(preCount.data, rows.length, postCount.data);
  if (!reconciled.ok) return reconciled;

  return {
    ok: true,
    data: {
      rows,
      integrity: createProfileIntegrity(preCount.data, rows.length, postCount.data),
    },
  };
}

async function collectKeysetTable<T>(
  adapter: AccountDataExportQueryAdapter,
  contract: AccountExportTableContract<T> & {
    tableName: "resume_analyses" | "job_matches" | "beta_feedback";
    ownerColumn: "user_id";
    reconstructRow: (value: unknown) => { ok: true; value: T } | { ok: false };
  },
  expectedUserId: string,
  limits: AccountExportLimits,
  resourceState: ResourceState,
): Promise<RepositoryResult<CollectedTable<
  T,
  AccountExportKeysetPaginationIntegrity
>>> {
  const preCount = await getAdapterCount(adapter, contract, expectedUserId);
  if (!preCount.ok) return preCount;
  if (preCount.data > limits.maxRowsPerTable) return failure("export_too_large");

  const rows: T[] = [];
  const seenIds = new Set<string>();
  let cursor: string | null = null;
  let pagesFetched = 0;
  let terminatedNormally = false;

  while (!terminatedNormally) {
    if (pagesFetched >= limits.maxPagesPerTable) {
      return failure("export_too_large");
    }

    const responseResult = await safeAdapterCall(() =>
      adapter.getKeysetPage({
        tableName: contract.tableName,
        ownerColumn: contract.ownerColumn,
        expectedUserId,
        selectedColumns: contract.selectedColumns,
        cursor,
        limit: limits.pageSize,
      })
    );
    pagesFetched += 1;

    if (!responseResult.ok) return responseResult;
    const response = responseResult.data;

    if (response.error) return providerFailure(response.error, response.status);
    if (!Array.isArray(response.data)) return failure("invalid_response");
    if (response.data.length > limits.pageSize) return failure("invalid_response");

    if (response.data.length > 0 && cursor) {
      const lastProviderRow = response.data[response.data.length - 1];
      if (!isRecord(lastProviderRow) ||
        !isUuidShapedAccountExportId(lastProviderRow.id)) {
        return failure("invalid_response");
      }
      if (getUuidComparisonKey(lastProviderRow.id) <= getUuidComparisonKey(cursor)) {
        return failure("pagination_stalled");
      }
    }

    for (const providerRow of response.data) {
      if (!providerRowBelongsToExpectedAccount(
        providerRow,
        contract.ownerColumn,
        expectedUserId,
      )) {
        return failure("invalid_response");
      }
      const reconstructed = contract.reconstructRow(providerRow);
      if (!reconstructed.ok) return failure("invalid_response");

      const id = getExportRowId(reconstructed.value);
      if (!id) return failure("invalid_response");
      const comparisonId = getUuidComparisonKey(id);

      if (seenIds.has(comparisonId)) return failure("duplicate_rows");
      if (cursor && comparisonId <= getUuidComparisonKey(cursor)) {
        return failure("pagination_stalled");
      }

      seenIds.add(comparisonId);
      cursor = id;

      if (rows.length >= limits.maxRowsPerTable) {
        return failure("export_too_large");
      }
      const guard = recordResourceUse(
        reconstructed.value,
        resourceState,
        limits,
        rows.length + 1,
      );
      if (!guard.ok) return guard;
      rows.push(reconstructed.value);

      if (rows.length > preCount.data) return failure("count_mismatch");
    }

    terminatedNormally = rows.length === preCount.data ||
      response.data.length < limits.pageSize;
  }

  const postCount = await getAdapterCount(adapter, contract, expectedUserId);
  if (!postCount.ok) return postCount;

  const reconciled = reconcileCounts(preCount.data, rows.length, postCount.data);
  if (!reconciled.ok) return reconciled;

  return {
    ok: true,
    data: {
      rows,
      integrity: createKeysetIntegrity(
        preCount.data,
        rows.length,
        postCount.data,
        pagesFetched,
      ),
    },
  };
}

async function collectCareerSnapshotsCountOnly(
  adapter: AccountDataExportQueryAdapter,
  expectedUserId: string,
): Promise<RepositoryResult<CollectedTable<
  never,
  AccountExportCountOnlyIntegrity
>>> {
  const contract = ACCOUNT_EXPORT_TABLE_CONTRACTS.career_snapshots;
  const preCount = await getAdapterCount(adapter, contract, expectedUserId);
  if (!preCount.ok) return preCount;
  if (preCount.data > 0) return failure("unsupported_data_contract");

  const postCount = await getAdapterCount(adapter, contract, expectedUserId);
  if (!postCount.ok) return postCount;

  const reconciled = reconcileCounts(preCount.data, 0, postCount.data);
  if (!reconciled.ok) return reconciled;

  return {
    ok: true,
    data: {
      rows: [],
      integrity: createCountOnlyIntegrity(preCount.data, postCount.data),
    },
  };
}

async function getAdapterCount(
  adapter: AccountDataExportQueryAdapter,
  contract: Pick<AccountExportTableContract<unknown>, "tableName" | "ownerColumn">,
  expectedUserId: string,
): Promise<RepositoryResult<number>> {
  const responseResult = await safeAdapterCall(() =>
    adapter.getExactCount({
      tableName: contract.tableName,
      ownerColumn: contract.ownerColumn,
      expectedUserId,
    })
  );
  if (!responseResult.ok) return responseResult;
  const response = responseResult.data;
  if (response.error) return providerFailure(response.error, response.status);
  if (!isValidCount(response.data)) return failure("invalid_response");
  return { ok: true, data: response.data };
}

async function readAuthenticatedUserId(
  adapter: AccountDataExportQueryAdapter,
): Promise<RepositoryResult<string>> {
  const responseResult = await safeAdapterCall(() =>
    adapter.getAuthenticatedUserId()
  );
  if (!responseResult.ok) return responseResult;
  const response = responseResult.data;
  if (response.error) return providerFailure(response.error);
  const userId = normalizeExpectedUserId(response.data);
  return userId ? { ok: true, data: userId } : failure("not_authenticated");
}

async function checkExpectedIdentity(
  adapter: AccountDataExportQueryAdapter,
  expectedUserId: string,
): Promise<RepositoryResult<true>> {
  const currentIdentity = await readAuthenticatedUserId(adapter);
  if (!currentIdentity.ok) return currentIdentity;
  if (currentIdentity.data !== expectedUserId) return failure("account_changed");
  return { ok: true, data: true };
}

async function getCurrentAuthUser(expectedUserId?: string): Promise<
  RepositoryResult<{ supabase: SupabaseBrowserClient; userId: string }>
> {
  const normalizedExpectedUserId = expectedUserId === undefined
    ? undefined
    : normalizeExpectedUserId(expectedUserId);
  if (expectedUserId !== undefined && !normalizedExpectedUserId) {
    return failure("not_authenticated");
  }

  const configStatus = getSupabaseConfigStatus();
  if (!configStatus.isConfigured) return failure("not_configured");

  const supabase = createSupabaseBrowserClient();
  if (!supabase) return failure("not_configured");

  let data: Awaited<ReturnType<SupabaseBrowserClient["auth"]["getUser"]>>["data"];
  try {
    const response = await supabase.auth.getUser();
    if (response.error) return providerFailure(response.error);
    data = response.data;
  } catch (error) {
    return providerFailure(error);
  }

  const userId = normalizeExpectedUserId(data.user?.id);
  if (!userId) return failure("not_authenticated");
  if (normalizedExpectedUserId !== undefined) {
    if (normalizedExpectedUserId !== userId) return failure("account_changed");
  }

  return { ok: true, data: { supabase, userId } };
}

async function confirmSupabaseIdentity(
  supabase: SupabaseBrowserClient,
  expectedUserId: string,
): Promise<RepositoryResult<true>> {
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error) return providerFailure(error);
    const currentUserId = normalizeExpectedUserId(data.user?.id);
    if (!currentUserId) return failure("not_authenticated");
    if (currentUserId !== expectedUserId) return failure("account_changed");
    return { ok: true, data: true };
  } catch (error) {
    return providerFailure(error);
  }
}

async function getCount(
  supabase: SupabaseBrowserClient,
  tableName: AccountOwnedTableName,
  ownerColumn: "id" | "user_id",
  ownerValue: string,
): Promise<RepositoryResult<number>> {
  const expectedOwnerColumn = tableName === "profiles" ? "id" : "user_id";
  if (ownerColumn !== expectedOwnerColumn) return failure("invalid_response");
  const { count, error, status } = await getExactSupabaseCount(
    supabase,
    tableName,
    ownerValue,
  );

  if (error) return providerFailure(error, status);
  if (!isValidCount(count)) return failure("invalid_response");
  return { ok: true, data: count };
}

async function getExactSupabaseCount(
  supabase: SupabaseBrowserClient,
  tableName: AccountOwnedTableName,
  expectedUserId: string,
) {
  if (tableName === "profiles") {
    return supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("id", expectedUserId);
  }

  return supabase
    .from(tableName)
    .select("id", { count: "exact", head: true })
    .eq("user_id", expectedUserId);
}

type AccountOwnedTableName = Exclude<
  keyof Database["public"]["Tables"],
  "analytics_events"
>;

function reconcileCounts(
  preCount: number,
  exportedCount: number,
  postCount: number,
): RepositoryResult<true> {
  return preCount === exportedCount &&
      postCount === exportedCount &&
      preCount === postCount
    ? { ok: true, data: true }
    : failure("count_mismatch");
}

function createProfileIntegrity(
  preCount: number,
  exportedCount: number,
  postCount: number,
): AccountExportNoPaginationIntegrity {
  return {
    preCount,
    exportedCount,
    postCount,
    countStable: true,
    responseShapeValidated: true,
    pagination: {
      strategy: "none",
      queryCompleted: true,
      pagesFetched: 1,
    },
  };
}

function createKeysetIntegrity(
  preCount: number,
  exportedCount: number,
  postCount: number,
  pagesFetched: number,
): AccountExportKeysetPaginationIntegrity {
  return {
    preCount,
    exportedCount,
    postCount,
    countStable: true,
    responseShapeValidated: true,
    pagination: {
      strategy: "id_keyset",
      pagesFetched,
      everyPageValidated: true,
      terminatedNormally: true,
      duplicatePrimaryKeysObserved: false,
      monotonicCursorObserved: true,
    },
  };
}

function createCountOnlyIntegrity(
  preCount: number,
  postCount: number,
): AccountExportCountOnlyIntegrity {
  return {
    preCount,
    exportedCount: 0,
    postCount,
    countStable: true,
    responseShapeValidated: true,
    pagination: {
      strategy: "count_only",
      pagesFetched: 0,
    },
  };
}

async function safeAdapterCall(
  operation: () => Promise<AdapterResponse>,
): Promise<RepositoryResult<AdapterResponse>> {
  try {
    const response: unknown = await operation();
    if (!isAdapterResponse(response)) return failure("invalid_response");
    return { ok: true, data: response };
  } catch (error) {
    return providerFailure(error);
  }
}

function isAdapterResponse(value: unknown): value is AdapterResponse {
  return isRecord(value) &&
    Object.prototype.hasOwnProperty.call(value, "data") &&
    Object.prototype.hasOwnProperty.call(value, "error") &&
    (!Object.prototype.hasOwnProperty.call(value, "status") ||
      typeof value.status === "number");
}

function recordResourceUse(
  row: unknown,
  resourceState: ResourceState,
  limits: AccountExportLimits,
  tableRowCount: number,
): RepositoryResult<true> {
  if (tableRowCount > limits.maxRowsPerTable ||
    resourceState.totalRows >= limits.maxTotalRows) {
    return failure("export_too_large");
  }

  let serializedRow: string;
  try {
    serializedRow = JSON.stringify(row);
  } catch {
    return failure("serialization_failed");
  }

  const nextEstimatedBytes = resourceState.estimatedSerializedBytes +
    getUtf8ByteLength(serializedRow);
  if (nextEstimatedBytes > limits.maxSerializedBytes) {
    return failure("export_too_large");
  }

  resourceState.totalRows += 1;
  resourceState.estimatedSerializedBytes = nextEstimatedBytes;
  return { ok: true, data: true };
}

function getExportRowId(value: unknown): string | null {
  return isRecord(value) && isUuidShapedAccountExportId(value.id)
    ? value.id
    : null;
}

function normalizeExpectedUserId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return isUuidShapedAccountExportId(normalized) ? normalized : null;
}

function providerRowBelongsToExpectedAccount(
  value: unknown,
  ownerColumn: "id" | "user_id",
  expectedUserId: string,
): boolean {
  if (!isRecord(value)) return false;
  return normalizeExpectedUserId(value[ownerColumn]) === expectedUserId;
}

function getLimits(
  overrides: Partial<AccountExportLimits> | undefined,
): AccountExportLimits {
  const limits = { ...ACCOUNT_EXPORT_LIMITS, ...overrides };
  for (const value of Object.values(limits)) {
    if (!Number.isInteger(value) || value <= 0) return { ...ACCOUNT_EXPORT_LIMITS };
  }
  return limits;
}

function getUtf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function isSavedReportsRpcRow(value: unknown): value is SavedReportsRpcRow {
  return isRecord(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidCount(value: unknown): value is number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    Number.isFinite(value) &&
    value >= 0;
}

function providerFailure(
  error: unknown,
  responseStatus?: number,
): RepositoryResult<never> {
  return failure(getProviderErrorCode(error, responseStatus));
}

function getProviderErrorCode(
  error: unknown,
  responseStatus?: number,
): AccountDataErrorCode {
  const providerError = isRecord(error) ? error : null;
  const errorStatus = providerError?.status;
  const status = isUsableProviderStatus(responseStatus)
    ? responseStatus
    : isUsableProviderStatus(errorStatus)
    ? errorStatus
    : null;
  const code = typeof providerError?.code === "string"
    ? providerError.code.toLowerCase()
    : "";
  const name = typeof providerError?.name === "string"
    ? providerError.name.toLowerCase()
    : "";
  const message = typeof providerError?.message === "string"
    ? providerError.message.toLowerCase()
    : "";

  if (status === 401) return "not_authenticated";
  if (status === 403) return "permission_denied";
  if (
    status === 0 ||
    status === 408 ||
    status === 429 ||
    (status !== null && status >= 500)
  ) return "network_failure";

  if (code === "28000") return "not_authenticated";
  if (
    code === "42p01" ||
    code === "pgrst205"
  ) {
    return "schema_unavailable";
  }

  if (
    name.includes("authsessionmissing") ||
    message.includes("auth session missing") ||
    message.includes("jwt expired")
  ) return "not_authenticated";
  if (
    message.includes("row-level security") ||
    message.includes("permission denied")
  ) return "permission_denied";
  if (
    message.includes("schema cache") ||
    message.includes("does not exist") ||
    message.includes("could not find")
  ) return "schema_unavailable";
  if (
    message.includes("network") ||
    message.includes("fetch") ||
    message.includes("timeout")
  ) {
    return "network_failure";
  }
  return "unknown";
}

function isUsableProviderStatus(value: unknown): value is number {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0;
}

function failure<T = never>(code: AccountDataErrorCode): RepositoryResult<T> {
  return {
    ok: false,
    error: createSafeError(code),
  };
}

function createSafeError(code: AccountDataErrorCode): AccountDataRepositoryError {
  const definitions: Record<
    AccountDataErrorCode,
    { message: string; retryable: boolean }
  > = {
    not_authenticated: {
      message: "Sign in again before using account data controls.",
      retryable: false,
    },
    not_configured: {
      message: "Account data controls are not configured right now.",
      retryable: false,
    },
    network_failure: {
      message: "Account data could not be reached. Please try again.",
      retryable: true,
    },
    permission_denied: {
      message: "Account data access was denied. Sign in again before retrying.",
      retryable: false,
    },
    schema_unavailable: {
      message: "Account data controls are temporarily unavailable.",
      retryable: false,
    },
    invalid_response: {
      message: "Account data returned an invalid response, so no export was created.",
      retryable: false,
    },
    cardinality_violation: {
      message: "The account profile data is inconsistent, so no export was created.",
      retryable: false,
    },
    count_mismatch: {
      message: "Account data changed or could not be reconciled, so no export was created.",
      retryable: true,
    },
    duplicate_rows: {
      message: "Duplicate account records were detected, so no export was created.",
      retryable: false,
    },
    pagination_stalled: {
      message: "Account data pagination did not advance safely, so no export was created.",
      retryable: true,
    },
    export_too_large: {
      message: "This account export is too large for the current browser safety limit.",
      retryable: false,
    },
    serialization_failed: {
      message: "Account data could not be serialized safely, so no export was created.",
      retryable: true,
    },
    account_changed: {
      message: "The signed-in account changed during the account data request, so the result was not used.",
      retryable: true,
    },
    unsupported_data_contract: {
      message: "This account contains data whose export contract is not yet supported, so no export was created.",
      retryable: false,
    },
    unknown: {
      message: "The account data request could not be completed. Please try again.",
      retryable: true,
    },
  };

  return { code, ...definitions[code] };
}
