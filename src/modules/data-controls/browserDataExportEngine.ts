import { isValidAccountExportTimestamp } from "@/modules/data-controls/accountDataExportContract";
import {
  BROWSER_DATA_EXPORT_CONTRACT_VERSION,
  getBrowserDataExportContract,
  validateBrowserDataExportContractCoverage,
  type BrowserDataExportPrivacyTransformation,
} from "@/modules/data-controls/browserDataExportContract";
import { readVisibleStoredValue } from "@/lib/storage/ownedSkillMintStorage";
import type {
  BrowserDataOwner,
  BrowserOwnerContext,
  SkillMintStorageDescriptor,
} from "@/lib/storage/skillMintStorageTypes";
import { getBrowserDataOwner } from "@/lib/storage/skillMintStorageTypes";

export const BROWSER_DATA_EXPORT_VERSION =
  "skillmint-browser-export-v2" as const;
export const BROWSER_DATA_EXPORT_MAX_BYTES = 10 * 1024 * 1024;

export type BrowserDataExportErrorCode =
  | "storage_unavailable"
  | "owner_unresolved"
  | "storage_read_failed"
  | "browser_data_changed"
  | "unsupported_storage_version"
  | "corrupt_visible_data"
  | "missing_export_contract"
  | "invalid_export_value"
  | "unsupported_browser_data_contract"
  | "invalid_export_timestamp"
  | "export_too_large"
  | "serialization_failed"
  | "unknown";

export type BrowserDataExportError = {
  code: BrowserDataExportErrorCode;
  message: string;
  retryable: boolean;
};

export type BrowserDataExportRecord = {
  key: string;
  descriptorVersion: number;
  contractVersion: typeof BROWSER_DATA_EXPORT_CONTRACT_VERSION;
  category: SkillMintStorageDescriptor["category"];
  description: string;
  ownerScope: "anonymous" | "account" | "global_preference";
  legacySource: boolean;
  value: unknown;
};

export type BrowserDataExportManifest = {
  exportVersion: typeof BROWSER_DATA_EXPORT_VERSION;
  contractVersion: typeof BROWSER_DATA_EXPORT_CONTRACT_VERSION;
  source: "browser";
  exportedAt: string;
  requestedOwnerScope: "anonymous" | "account";
  visibleRecordCount: number;
  everyVisibleRecordValidated: true;
  rawValuesMatchedDuringFinalVerificationPass: true;
  atomicSnapshot: false;
  consistencyStatement: string;
  privacyTransformations: BrowserDataExportPrivacyTransformation[];
};

export type BrowserDataExportResult =
  | {
      ok: true;
      fileName: string;
      json: string;
      manifest: BrowserDataExportManifest;
    }
  | {
      ok: false;
      error: BrowserDataExportError;
    };

export type BrowserDataExportReadableStorage = {
  getItem(key: string): string | null;
};

export type BrowserDataExportEngineInput = {
  context: BrowserOwnerContext;
  exportedAt: string;
  descriptors: readonly SkillMintStorageDescriptor[];
  storage: BrowserDataExportReadableStorage | null;
  serializer?: (payload: unknown) => unknown;
  maxBytes?: number;
};

const CONSISTENCY_STATEMENT =
  "Records were built from values captured during one sequential browser-storage read pass. Every registered exportable storage key matched its captured raw value during a later sequential verification pass. Browser storage was not locked, so an atomic point-in-time snapshot is not guaranteed.";

const ERROR_DETAILS: Record<
  BrowserDataExportErrorCode,
  { message: string; retryable: boolean }
> = {
  storage_unavailable: {
    message: "Browser storage is unavailable. Try again after reloading this page.",
    retryable: true,
  },
  owner_unresolved: {
    message: "Wait for account status before exporting browser data.",
    retryable: true,
  },
  storage_read_failed: {
    message: "Browser data could not be read safely. Please try again.",
    retryable: true,
  },
  browser_data_changed: {
    message: "Browser data changed during export. Please try again.",
    retryable: true,
  },
  unsupported_storage_version: {
    message: "Some browser data uses an unsupported storage version.",
    retryable: false,
  },
  corrupt_visible_data: {
    message: "Some visible browser data is corrupted and cannot be exported safely.",
    retryable: false,
  },
  missing_export_contract: {
    message: "A required browser export contract is unavailable.",
    retryable: false,
  },
  invalid_export_value: {
    message: "Some visible browser data does not match its export contract.",
    retryable: false,
  },
  unsupported_browser_data_contract: {
    message: "Some browser data uses an unsupported export contract.",
    retryable: false,
  },
  invalid_export_timestamp: {
    message: "The browser export timestamp is invalid.",
    retryable: false,
  },
  export_too_large: {
    message: "The browser export is too large to create safely.",
    retryable: false,
  },
  serialization_failed: {
    message: "The browser export could not be serialized. Please try again.",
    retryable: true,
  },
  unknown: {
    message: "The browser export could not be created. Please try again.",
    retryable: true,
  },
};

export function buildBrowserDataExportWithEngine(
  input: BrowserDataExportEngineInput,
): BrowserDataExportResult {
  try {
    return buildBrowserDataExportWithEngineUnchecked(input);
  } catch {
    return failure("unknown");
  }
}

function buildBrowserDataExportWithEngineUnchecked(
  input: BrowserDataExportEngineInput,
): BrowserDataExportResult {
  if (!input || typeof input !== "object") return failure("unknown");
  if (!isValidAccountExportTimestamp(input.exportedAt)) {
    return failure("invalid_export_timestamp");
  }

  const owner = getBrowserDataOwner(input.context?.currentUserId);
  if (!owner) return failure("owner_unresolved");

  const coverage = validateBrowserDataExportContractCoverage(input.descriptors);
  if (!coverage.ok) {
    return failure(
      coverage.issues.some((issue) => issue.code === "missing_contract")
        ? "missing_export_contract"
        : "unsupported_browser_data_contract",
    );
  }

  if (!input.storage || typeof input.storage.getItem !== "function") {
    return failure("storage_unavailable");
  }

  const maxBytes = input.maxBytes ?? BROWSER_DATA_EXPORT_MAX_BYTES;
  if (!Number.isFinite(maxBytes) || !Number.isInteger(maxBytes) || maxBytes <= 0) {
    return failure("unknown");
  }

  const descriptors = input.descriptors
    .filter((descriptor) => descriptor.exportable)
    .slice()
    .sort((left, right) => codePointCompare(left.key, right.key));
  const capturedRawValues = new Map<string, string | null>();

  for (const descriptor of descriptors) {
    const read = readRawValue(input.storage, descriptor.key);
    if (!read.ok) return failure("storage_read_failed");
    capturedRawValues.set(descriptor.key, read.value);
  }

  const records: BrowserDataExportRecord[] = [];
  const privacyTransformations: BrowserDataExportPrivacyTransformation[] = [];
  const seenTransformations = new Set<BrowserDataExportPrivacyTransformation>();

  for (const descriptor of descriptors) {
    const raw = capturedRawValues.get(descriptor.key) ?? null;
    const visible = readVisibleStoredValue(raw, descriptor, input.context);

    if (visible.status === "missing" || visible.status === "hidden_for_owner") {
      continue;
    }
    if (visible.status === "owner_unknown") return failure("owner_unresolved");
    if (visible.status === "corrupted") {
      return failure(
        visible.classification === "unsupported_future_version" ||
            visible.classification === "descriptor_version_mismatch"
          ? "unsupported_storage_version"
          : "corrupt_visible_data",
      );
    }
    if (visible.status !== "visible" || visible.serializedValue === null) {
      return failure("corrupt_visible_data");
    }

    const contract = getBrowserDataExportContract(descriptor.key);
    if (!contract) return failure("missing_export_contract");

    const decoded = decodeVisibleValue(visible.serializedValue, descriptor);
    if (!decoded.ok) return failure(decoded.code);

    let reconstructed: ReturnType<typeof contract.reconstruct>;
    try {
      reconstructed = contract.reconstruct(decoded.value);
    } catch {
      return failure("unknown");
    }
    if (!isContractResult(reconstructed)) return failure("unknown");
    if (!reconstructed.ok) return failure(reconstructed.code);

    const recordOwnerScope = resolveRecordOwnerScope(descriptor, owner);
    if (!recordOwnerScope) return failure("unsupported_browser_data_contract");

    records.push({
      key: descriptor.key,
      descriptorVersion: descriptor.version,
      contractVersion: contract.browserContractVersion,
      category: descriptor.category,
      description: descriptor.description,
      ownerScope: recordOwnerScope,
      legacySource: visible.legacy,
      value: reconstructed.value,
    });

    for (const transformation of reconstructed.privacyTransformations) {
      if (!seenTransformations.has(transformation)) {
        seenTransformations.add(transformation);
        privacyTransformations.push(transformation);
      }
    }
  }

  const requestedOwnerScope = owner.kind;
  const manifest: BrowserDataExportManifest = {
    exportVersion: BROWSER_DATA_EXPORT_VERSION,
    contractVersion: BROWSER_DATA_EXPORT_CONTRACT_VERSION,
    source: "browser",
    exportedAt: input.exportedAt,
    requestedOwnerScope,
    visibleRecordCount: records.length,
    everyVisibleRecordValidated: true,
    rawValuesMatchedDuringFinalVerificationPass: true,
    atomicSnapshot: false,
    consistencyStatement: CONSISTENCY_STATEMENT,
    privacyTransformations,
  };
  const payload = { manifest, records };
  const serializer = input.serializer ?? ((value: unknown) =>
    JSON.stringify(value, null, 2));

  let serialized: unknown;
  try {
    serialized = serializer(payload);
  } catch {
    return failure("serialization_failed");
  }
  if (typeof serialized !== "string") return failure("serialization_failed");

  const json = `${serialized}\n`;
  let byteLength: number;
  try {
    byteLength = new TextEncoder().encode(json).byteLength;
  } catch {
    return failure("unknown");
  }
  if (byteLength > maxBytes) return failure("export_too_large");

  for (const descriptor of descriptors) {
    const read = readRawValue(input.storage, descriptor.key);
    if (!read.ok) return failure("storage_read_failed");
    if (read.value !== capturedRawValues.get(descriptor.key)) {
      return failure("browser_data_changed");
    }
  }

  return {
    ok: true,
    fileName: `skillmint-browser-${requestedOwnerScope}-${input.exportedAt.slice(0, 10)}.json`,
    json,
    manifest,
  };
}

function decodeVisibleValue(
  serializedValue: string,
  descriptor: SkillMintStorageDescriptor,
):
  | { ok: true; value: unknown }
  | { ok: false; code: "corrupt_visible_data" | "invalid_export_value" | "unsupported_browser_data_contract" } {
  if (descriptor.exportPolicy === "json_value") {
    try {
      return { ok: true, value: JSON.parse(serializedValue) };
    } catch {
      return { ok: false, code: "corrupt_visible_data" };
    }
  }

  if (descriptor.exportPolicy === "boolean_string") {
    try {
      const value: unknown = JSON.parse(serializedValue);
      return typeof value === "boolean"
        ? { ok: true, value }
        : { ok: false, code: "invalid_export_value" };
    } catch {
      return { ok: false, code: "corrupt_visible_data" };
    }
  }

  if (descriptor.exportPolicy === "string_value") {
    try {
      const value: unknown = JSON.parse(serializedValue);
      if (typeof value === "string") return { ok: true, value };
    } catch {
      try {
        if (descriptor.validateValue(serializedValue)) {
          return { ok: true, value: serializedValue };
        }
      } catch {
        return { ok: false, code: "unsupported_browser_data_contract" };
      }
      return { ok: false, code: "invalid_export_value" };
    }
    return { ok: false, code: "invalid_export_value" };
  }

  return { ok: false, code: "unsupported_browser_data_contract" };
}

function resolveRecordOwnerScope(
  descriptor: SkillMintStorageDescriptor,
  owner: BrowserDataOwner,
): BrowserDataExportRecord["ownerScope"] | null {
  if (descriptor.ownerScope === "global_preference") return "global_preference";
  if (descriptor.ownerScope === "anonymous_or_account") return owner.kind;
  if (descriptor.ownerScope === "account_only") {
    return owner.kind === "account" ? "account" : null;
  }
  return null;
}

function readRawValue(
  storage: BrowserDataExportReadableStorage,
  key: string,
): { ok: true; value: string | null } | { ok: false } {
  try {
    const value: unknown = storage.getItem(key);
    return typeof value === "string" || value === null
      ? { ok: true, value }
      : { ok: false };
  } catch {
    return { ok: false };
  }
}

function isContractResult(
  value: unknown,
): value is ReturnType<NonNullable<ReturnType<typeof getBrowserDataExportContract>>["reconstruct"]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const result = value as Record<string, unknown>;
  if (result.ok === true) {
    return "value" in result && Array.isArray(result.privacyTransformations) &&
      result.privacyTransformations.every((item) => typeof item === "string");
  }
  return result.ok === false && (
    result.code === "invalid_export_value" ||
    result.code === "invalid_export_timestamp" ||
    result.code === "unsupported_browser_data_contract"
  );
}

function failure(code: BrowserDataExportErrorCode): BrowserDataExportResult {
  return { ok: false, error: { code, ...ERROR_DETAILS[code] } };
}

function codePointCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
