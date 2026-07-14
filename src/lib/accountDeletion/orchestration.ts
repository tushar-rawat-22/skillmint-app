export type AccountDeletionOrchestrationErrorCode =
  | "account_data_cleanup_failed"
  | "storage_deletion_failed"
  | "auth_deletion_failed";

type AdapterResult = { ok: boolean; [key: string]: unknown };

export type AccountDeletionAdapters = {
  deleteAccountData: () => Promise<AdapterResult>;
  deleteAccountStorage: () => Promise<AdapterResult>;
  deleteAuthUser: () => Promise<AdapterResult>;
};

export async function runAccountDeletionOrchestration(
  adapters: AccountDeletionAdapters,
): Promise<
  | { ok: true }
  | { ok: false; code: AccountDeletionOrchestrationErrorCode }
> {
  const database = await safeAdapterCall(adapters.deleteAccountData);
  if (!isConfirmedDatabaseCleanup(database)) {
    return { ok: false, code: "account_data_cleanup_failed" };
  }

  const storage = await safeAdapterCall(adapters.deleteAccountStorage);
  if (!isConfirmedStorageCleanup(storage)) {
    return { ok: false, code: "storage_deletion_failed" };
  }

  const auth = await safeAdapterCall(adapters.deleteAuthUser);
  if (!isRecord(auth) || auth.ok !== true || auth.deleted !== true) {
    return { ok: false, code: "auth_deletion_failed" };
  }

  return { ok: true };
}

async function safeAdapterCall(
  adapter: () => Promise<AdapterResult>,
): Promise<unknown> {
  try {
    return await adapter();
  } catch {
    return null;
  }
}

function isConfirmedDatabaseCleanup(value: unknown): boolean {
  if (!isRecord(value) || value.ok !== true || value.verifiedAbsent !== true) {
    return false;
  }
  if (!isRecord(value.counts)) return false;
  const counts = value.counts;
  const expected = [
    "profiles",
    "resumeAnalyses",
    "jobMatches",
    "careerSnapshots",
    "betaFeedback",
  ];
  if (
    Object.keys(value.counts).length !== expected.length ||
    !expected.every((key) => isSafeCount(counts[key]))
  ) return false;
  return true;
}

function isConfirmedStorageCleanup(value: unknown): boolean {
  return isRecord(value) &&
    value.ok === true &&
    typeof value.applicable === "boolean" &&
    value.verified === true;
}

function isSafeCount(value: unknown): boolean {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
