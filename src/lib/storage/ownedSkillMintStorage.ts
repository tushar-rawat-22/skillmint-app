import type {
  BrowserDataOwner,
  BrowserOwnerContext,
  OwnedBrowserValue,
  SkillMintStorageDescriptor,
} from "@/lib/storage/skillMintStorageTypes";
import {
  getBrowserDataOwner,
  normalizeAccountOwnerId,
} from "@/lib/storage/skillMintStorageTypes";

export const OWNER_PARTITION_CONTAINER_VERSION = 2;
export const LEGACY_OWNER_PARTITION_CONTAINER_VERSION = 1;
export const OWNER_PARTITION_CONTAINER_FORMAT =
  "skillmint-owner-partitions" as const;

export type OwnerPartition = {
  value: unknown;
  updatedAt: string;
};

export type OwnerPartitionContainer = {
  format: typeof OWNER_PARTITION_CONTAINER_FORMAT;
  version: typeof OWNER_PARTITION_CONTAINER_VERSION;
  descriptorVersion: number;
  partitions: {
    anonymous?: OwnerPartition;
    accounts: Record<string, OwnerPartition>;
  };
};

export type StoredValueClassification =
  | { status: "missing" }
  | { status: "current_container"; container: OwnerPartitionContainer }
  | { status: "previous_container"; container: OwnerPartitionContainer }
  | { status: "previous_owner_envelope"; owner: BrowserDataOwner; partition: OwnerPartition }
  | { status: "legacy_raw_anonymous"; partition: OwnerPartition }
  | { status: "corrupt_json" }
  | { status: "invalid_primitive" }
  | { status: "partial_envelope" }
  | { status: "partial_container" }
  | { status: "unsupported_future_version" }
  | { status: "descriptor_version_mismatch" }
  | { status: "ambiguous_object" }
  | { status: "invalid_descriptor_value" };

export type VisibleStoredValueResult = {
  status:
    | "visible"
    | "hidden_for_owner"
    | "corrupted"
    | "missing"
    | "owner_unknown";
  serializedValue: string | null;
  owner: BrowserDataOwner | null;
  legacy: boolean;
  classification: StoredValueClassification["status"];
};

export type OwnerStorageMutationResult = {
  ok: boolean;
  changed: boolean;
  status:
    | "success"
    | "no_change"
    | "storage_unavailable"
    | "storage_read_failed"
    | "storage_write_failed"
    | "owner_invalid"
    | "owner_scope_rejected"
    | "value_invalid"
    | "unrecognized_existing_data";
};

type StorageOptions = {
  storage?: Storage | null;
  updatedAt?: string;
};

export function isOwnerAwareDescriptor(
  descriptor: SkillMintStorageDescriptor,
): boolean {
  return descriptor.ownerScope === "anonymous_or_account" ||
    descriptor.ownerScope === "account_only";
}

export function classifyStoredValue(
  storedValue: string | null,
  descriptor: SkillMintStorageDescriptor,
): StoredValueClassification {
  if (storedValue === null) {
    return { status: "missing" };
  }

  const parsed = parseJson(storedValue);

  if (!parsed.ok) {
    if (
      descriptor.exportPolicy === "string_value" &&
      descriptor.validateValue(storedValue)
    ) {
      return {
        status: "legacy_raw_anonymous",
        partition: { value: storedValue, updatedAt: legacyTimestamp() },
      };
    }

    return { status: "corrupt_json" };
  }

  const value = parsed.value;

  if (hasExactPartitionContainerMarker(value)) {
    return classifyPartitionContainer(value, descriptor);
  }

  const descriptorLegacy = descriptor.classifyLegacyOwnerEnvelope?.(value);

  if (descriptorLegacy && descriptorLegacy.status !== "not_applicable") {
    if (descriptorLegacy.status === "unsupported_version") {
      return { status: "unsupported_future_version" };
    }

    if (descriptorLegacy.status === "invalid") {
      return { status: "partial_envelope" };
    }

    if (!isOwnerAllowed(descriptor, descriptorLegacy.owner) ||
      !descriptor.validateValue(descriptorLegacy.value)) {
      return { status: "invalid_descriptor_value" };
    }

    return {
      status: "previous_owner_envelope",
      owner: descriptorLegacy.owner,
      partition: {
        value: descriptorLegacy.value,
        updatedAt: descriptorLegacy.updatedAt,
      },
    };
  }

  if (hasCompletePreviousOwnerEnvelopeSignature(value)) {
    return classifyPreviousOwnerEnvelope(value, descriptor);
  }

  if (
    descriptor.ownerScope === "anonymous_or_account" &&
    descriptor.validateValue(value)
  ) {
    return {
      status: "legacy_raw_anonymous",
      partition: { value, updatedAt: legacyTimestamp() },
    };
  }

  if (looksLikePartialPreviousOwnerEnvelope(value)) {
    return { status: "partial_envelope" };
  }

  if (!descriptor.validateValue(value)) {
    return isPrimitive(value)
      ? { status: "invalid_primitive" }
      : Array.isArray(value)
        ? { status: "invalid_descriptor_value" }
        : { status: "ambiguous_object" };
  }

  return { status: "invalid_descriptor_value" };
}

export function readVisibleStoredValue(
  storedValue: string | null,
  descriptor: SkillMintStorageDescriptor,
  context: BrowserOwnerContext,
): VisibleStoredValueResult {
  if (!isOwnerAwareDescriptor(descriptor)) {
    if (storedValue === null) {
      return visibleResult("missing", null, null, false, "missing");
    }

    const parsed = parseDescriptorValue(storedValue, descriptor);
    return parsed.ok
      ? visibleResult("visible", storedValue, null, false, "legacy_raw_anonymous")
      : visibleResult("corrupted", null, null, false, "invalid_descriptor_value");
  }

  const owner = getBrowserDataOwner(context.currentUserId);

  if (!owner) {
    return visibleResult("owner_unknown", null, null, false, "missing");
  }

  const classification = classifyStoredValue(storedValue, descriptor);

  if (classification.status === "missing") {
    return visibleResult("missing", null, null, false, classification.status);
  }

  const partition = getClassifiedOwnerPartition(classification, owner);

  if (partition) {
    const serializedValue = JSON.stringify(partition.value);

    if (typeof serializedValue !== "string") {
      return visibleResult(
        "corrupted",
        null,
        null,
        false,
        "invalid_descriptor_value",
      );
    }

    return visibleResult(
      "visible",
      serializedValue,
      owner,
      classification.status !== "current_container",
      classification.status,
    );
  }

  if (hasAnyValidPartition(classification)) {
    return visibleResult(
      "hidden_for_owner",
      null,
      null,
      classification.status !== "current_container",
      classification.status,
    );
  }

  if (
    classification.status === "current_container" ||
    classification.status === "previous_container"
  ) {
    return visibleResult("missing", null, null, false, classification.status);
  }

  return visibleResult("corrupted", null, null, false, classification.status);
}

export function createOwnedBrowserValue<T>(
  value: T,
  owner: BrowserDataOwner,
  updatedAt = new Date().toISOString(),
): OwnedBrowserValue<T> {
  return { version: 1, owner, value, updatedAt };
}

export function serializeOwnedBrowserValue<T>(
  value: T,
  owner: BrowserDataOwner,
): string {
  return JSON.stringify(createOwnedBrowserValue(value, owner));
}

export function readVisibleStorageValue(
  descriptor: SkillMintStorageDescriptor,
  context: BrowserOwnerContext,
): string | null {
  const storage = getBrowserStorage();

  if (!storage) {
    return null;
  }

  try {
    const result = readVisibleStoredValue(
      storage.getItem(descriptor.key),
      descriptor,
      context,
    );
    return result.status === "visible" ? result.serializedValue : null;
  } catch {
    return null;
  }
}

export function writeOwnedStorageValue(
  descriptor: SkillMintStorageDescriptor,
  value: unknown,
  context: BrowserOwnerContext,
  options: StorageOptions = {},
): OwnerStorageMutationResult {
  const storage = options.storage === undefined
    ? getBrowserStorage()
    : options.storage;
  const owner = getBrowserDataOwner(context.currentUserId);

  if (!storage) return mutationFailure("storage_unavailable");
  if (!owner) return mutationFailure("owner_invalid");
  if (!isOwnerAllowed(descriptor, owner)) return mutationFailure("owner_scope_rejected");
  if (value === undefined || !descriptor.validateValue(value)) {
    return mutationFailure("value_invalid");
  }

  let raw: string | null;
  try {
    raw = storage.getItem(descriptor.key);
  } catch {
    return mutationFailure("storage_read_failed");
  }

  const classification = classifyStoredValue(raw, descriptor);
  const container = migrateClassificationToContainer(classification, descriptor);

  if (!container) {
    return mutationFailure("unrecognized_existing_data");
  }

  const updatedAt = getValidTimestamp(options.updatedAt) ?? new Date().toISOString();
  const nextContainer = setOwnerPartition(container, owner, { value, updatedAt });
  const serialized = serializeValidatedContainer(nextContainer, descriptor);

  if (!serialized) {
    return mutationFailure("value_invalid");
  }

  try {
    storage.setItem(descriptor.key, serialized);
    return { ok: true, changed: true, status: "success" };
  } catch {
    return mutationFailure("storage_write_failed");
  }
}

export function writeOwnedJsonStorageValue<T>(
  descriptor: SkillMintStorageDescriptor,
  value: T,
  context: BrowserOwnerContext,
): boolean {
  return writeOwnedStorageValue(descriptor, value, context).ok;
}

export function writeOwnedStringStorageValue(
  descriptor: SkillMintStorageDescriptor,
  value: string,
  context: BrowserOwnerContext,
): boolean {
  return writeOwnedStorageValue(descriptor, value, context).ok;
}

export function updateOwnedStorageValue(
  descriptor: SkillMintStorageDescriptor,
  context: BrowserOwnerContext,
  transform: (value: unknown) => { value: unknown; changed: boolean },
  options: StorageOptions = {},
): OwnerStorageMutationResult {
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const owner = getBrowserDataOwner(context.currentUserId);
  if (!storage) return mutationFailure("storage_unavailable");
  if (!owner) return mutationFailure("owner_invalid");
  if (!isOwnerAllowed(descriptor, owner)) return mutationFailure("owner_scope_rejected");

  let raw: string | null;
  try {
    raw = storage.getItem(descriptor.key);
  } catch {
    return mutationFailure("storage_read_failed");
  }

  const classification = classifyStoredValue(raw, descriptor);
  const partition = getClassifiedOwnerPartition(classification, owner);
  if (!partition) {
    return hasAnyValidPartition(classification) ||
      classification.status === "missing" ||
      classification.status === "current_container" ||
      classification.status === "previous_container"
      ? { ok: true, changed: false, status: "no_change" }
      : mutationFailure("unrecognized_existing_data");
  }

  const transformed = transform(partition.value);
  if (!transformed.changed) {
    return { ok: true, changed: false, status: "no_change" };
  }

  return writeOwnedStorageValue(descriptor, transformed.value, context, {
    storage,
    updatedAt: options.updatedAt,
  });
}

export function removeOwnedStoragePartition(
  descriptor: SkillMintStorageDescriptor,
  context: BrowserOwnerContext,
  options: Pick<StorageOptions, "storage"> = {},
): OwnerStorageMutationResult {
  const storage = options.storage === undefined ? getBrowserStorage() : options.storage;
  const owner = getBrowserDataOwner(context.currentUserId);
  if (!storage) return mutationFailure("storage_unavailable");
  if (!owner) return mutationFailure("owner_invalid");
  if (!isOwnerAllowed(descriptor, owner)) return mutationFailure("owner_scope_rejected");

  let raw: string | null;
  try {
    raw = storage.getItem(descriptor.key);
  } catch {
    return mutationFailure("storage_read_failed");
  }

  const classification = classifyStoredValue(raw, descriptor);
  const partition = getClassifiedOwnerPartition(classification, owner);
  if (!partition) {
    return hasAnyValidPartition(classification) ||
      classification.status === "missing" ||
      classification.status === "current_container" ||
      classification.status === "previous_container"
      ? { ok: true, changed: false, status: "no_change" }
      : mutationFailure("unrecognized_existing_data");
  }

  const container = migrateClassificationToContainer(classification, descriptor);
  if (!container) return mutationFailure("unrecognized_existing_data");
  const nextContainer = deleteOwnerPartition(container, owner);

  try {
    if (isContainerEmpty(nextContainer)) {
      storage.removeItem(descriptor.key);
    } else {
      const serialized = serializeValidatedContainer(nextContainer, descriptor);
      if (!serialized) return mutationFailure("value_invalid");
      storage.setItem(descriptor.key, serialized);
    }
    return { ok: true, changed: true, status: "success" };
  } catch {
    return mutationFailure("storage_write_failed");
  }
}

export function getVisibleJsonValue(
  storedValue: string | null,
  descriptor: SkillMintStorageDescriptor,
  context: BrowserOwnerContext,
): unknown {
  const result = readVisibleStoredValue(storedValue, descriptor, context);
  return result.status === "visible" && result.serializedValue !== null
    ? safeJsonParse(result.serializedValue)
    : undefined;
}

export function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function safeJsonParse(value: string): unknown {
  const parsed = parseJson(value);
  return parsed.ok ? parsed.value : undefined;
}

export function isOwnedBrowserValue(value: unknown): value is OwnedBrowserValue<unknown> {
  if (!isRecord(value) || value.version !== 1 || !("value" in value)) return false;
  return parseBrowserOwner(value.owner) !== null && isValidTimestamp(value.updatedAt);
}

export function getOwnerPartitionFromContainer(
  container: OwnerPartitionContainer,
  owner: BrowserDataOwner,
): OwnerPartition | null {
  if (owner.kind === "anonymous") {
    return container.partitions.anonymous ?? null;
  }

  return Object.prototype.hasOwnProperty.call(
    container.partitions.accounts,
    owner.userId,
  )
    ? container.partitions.accounts[owner.userId]
    : null;
}

function classifyPartitionContainer(
  value: Record<string, unknown>,
  descriptor: SkillMintStorageDescriptor,
): StoredValueClassification {
  if (typeof value.version !== "number") {
    return { status: "partial_container" };
  }

  if (
    value.version !== OWNER_PARTITION_CONTAINER_VERSION &&
    value.version !== LEGACY_OWNER_PARTITION_CONTAINER_VERSION
  ) {
    return { status: "unsupported_future_version" };
  }

  const isLegacyContainer =
    value.version === LEGACY_OWNER_PARTITION_CONTAINER_VERSION;
  const expectedKeys = isLegacyContainer
    ? ["format", "version", "partitions"]
    : ["format", "version", "descriptorVersion", "partitions"];

  if (!hasOnlyKeys(value, expectedKeys)) {
    return { status: "partial_container" };
  }

  if (
    !isLegacyContainer &&
    (
      !Number.isInteger(value.descriptorVersion) ||
      value.descriptorVersion !== descriptor.version
    )
  ) {
    return { status: "descriptor_version_mismatch" };
  }

  if (value.format !== OWNER_PARTITION_CONTAINER_FORMAT || !isRecord(value.partitions)) {
    return { status: "partial_container" };
  }
  const partitions = value.partitions;
  if (!hasOnlyKeys(partitions, ["anonymous", "accounts"])) {
    return { status: "partial_container" };
  }
  if (!isRecord(partitions.accounts)) return { status: "partial_container" };
  const accounts: Record<string, OwnerPartition> = Object.create(null) as
    Record<string, OwnerPartition>;
  const normalizedOwnerIds = new Set<string>();
  for (const [rawUserId, rawPartition] of Object.entries(partitions.accounts)) {
    const userId = normalizeAccountOwnerId(rawUserId);
    const partition = parsePartition(rawPartition, descriptor);
    if (
      !userId ||
      userId !== rawUserId ||
      normalizedOwnerIds.has(userId) ||
      !partition
    ) {
      return { status: "partial_container" };
    }
    normalizedOwnerIds.add(userId);
    accounts[userId] = partition;
  }
  let anonymous: OwnerPartition | undefined;
  if ("anonymous" in partitions) {
    anonymous = parsePartition(partitions.anonymous, descriptor) ?? undefined;
    if (!anonymous || descriptor.ownerScope !== "anonymous_or_account") {
      return { status: "partial_container" };
    }
  }
  const container: OwnerPartitionContainer = {
    format: OWNER_PARTITION_CONTAINER_FORMAT,
    version: OWNER_PARTITION_CONTAINER_VERSION,
    descriptorVersion: descriptor.version,
    partitions: { ...(anonymous ? { anonymous } : {}), accounts },
  };

  return isLegacyContainer
    ? { status: "previous_container", container }
    : { status: "current_container", container };
}

function classifyPreviousOwnerEnvelope(
  value: Record<string, unknown>,
  descriptor: SkillMintStorageDescriptor,
): StoredValueClassification {
  if (!hasOnlyKeys(value, ["version", "owner", "value", "updatedAt"])) {
    return { status: "partial_envelope" };
  }
  if (value.version !== 1) return { status: "unsupported_future_version" };
  const owner = parseBrowserOwner(value.owner);
  if (!owner || !("value" in value) || !isValidTimestamp(value.updatedAt)) {
    return { status: "partial_envelope" };
  }
  if (!isOwnerAllowed(descriptor, owner) || !descriptor.validateValue(value.value)) {
    return { status: "invalid_descriptor_value" };
  }
  return {
    status: "previous_owner_envelope",
    owner,
    partition: { value: value.value, updatedAt: value.updatedAt },
  };
}

function parsePartition(
  value: unknown,
  descriptor: SkillMintStorageDescriptor,
): OwnerPartition | null {
  if (!isRecord(value) || !("value" in value) || !isValidTimestamp(value.updatedAt)) {
    return null;
  }
  if (!hasOnlyKeys(value, ["value", "updatedAt"])) return null;
  return descriptor.validateValue(value.value)
    ? { value: value.value, updatedAt: value.updatedAt }
    : null;
}

function parseBrowserOwner(value: unknown): BrowserDataOwner | null {
  if (!isRecord(value)) return null;
  if (value.kind === "anonymous" && Object.keys(value).length === 1) {
    return { kind: "anonymous" };
  }
  if (value.kind === "account" && Object.keys(value).length === 2) {
    const userId = normalizeAccountOwnerId(value.userId);
    return userId ? { kind: "account", userId } : null;
  }
  return null;
}

function isOwnerAllowed(
  descriptor: SkillMintStorageDescriptor,
  owner: BrowserDataOwner,
): boolean {
  if (!isOwnerAwareDescriptor(descriptor)) return false;
  return owner.kind === "account" || descriptor.ownerScope === "anonymous_or_account";
}

export function migrateClassificationToContainer(
  classification: StoredValueClassification,
  descriptor: SkillMintStorageDescriptor,
): OwnerPartitionContainer | null {
  if (classification.status === "current_container") return classification.container;
  if (classification.status === "previous_container") return classification.container;
  const container = emptyContainer(descriptor.version);
  if (classification.status === "missing") return container;
  if (classification.status === "legacy_raw_anonymous") {
    container.partitions.anonymous = classification.partition;
    return container;
  }
  if (classification.status === "previous_owner_envelope") {
    return setOwnerPartition(container, classification.owner, classification.partition);
  }
  return null;
}

export function getClassifiedOwnerPartition(
  classification: StoredValueClassification,
  owner: BrowserDataOwner,
): OwnerPartition | null {
  if (
    classification.status === "current_container" ||
    classification.status === "previous_container"
  ) {
    return getOwnerPartitionFromContainer(classification.container, owner);
  }
  if (classification.status === "legacy_raw_anonymous") {
    return owner.kind === "anonymous" ? classification.partition : null;
  }
  if (classification.status === "previous_owner_envelope") {
    if (classification.owner.kind !== owner.kind) return null;
    if (owner.kind === "account" && classification.owner.kind === "account" &&
      classification.owner.userId !== owner.userId) return null;
    return classification.partition;
  }
  return null;
}

function hasAnyValidPartition(classification: StoredValueClassification): boolean {
  if (
    classification.status === "current_container" ||
    classification.status === "previous_container"
  ) {
    return Boolean(classification.container.partitions.anonymous) ||
      Object.keys(classification.container.partitions.accounts).length > 0;
  }
  return classification.status === "previous_owner_envelope" ||
    classification.status === "legacy_raw_anonymous";
}

export function setOwnerPartition(
  container: OwnerPartitionContainer,
  owner: BrowserDataOwner,
  partition: OwnerPartition,
): OwnerPartitionContainer {
  return owner.kind === "anonymous"
    ? {
        ...container,
        partitions: { ...container.partitions, anonymous: partition },
      }
    : {
        ...container,
        partitions: {
          ...container.partitions,
          accounts: { ...container.partitions.accounts, [owner.userId]: partition },
        },
      };
}

export function deleteOwnerPartition(
  container: OwnerPartitionContainer,
  owner: BrowserDataOwner,
): OwnerPartitionContainer {
  if (owner.kind === "anonymous") {
    const partitions = { ...container.partitions };
    delete partitions.anonymous;
    return { ...container, partitions };
  }
  const accounts = { ...container.partitions.accounts };
  delete accounts[owner.userId];
  return { ...container, partitions: { ...container.partitions, accounts } };
}

function emptyContainer(descriptorVersion: number): OwnerPartitionContainer {
  return {
    format: OWNER_PARTITION_CONTAINER_FORMAT,
    version: OWNER_PARTITION_CONTAINER_VERSION,
    descriptorVersion,
    partitions: { accounts: {} },
  };
}

export function isContainerEmpty(container: OwnerPartitionContainer): boolean {
  return !container.partitions.anonymous &&
    Object.keys(container.partitions.accounts).length === 0;
}

export function serializeValidatedContainer(
  container: OwnerPartitionContainer,
  descriptor: SkillMintStorageDescriptor,
): string | null {
  try {
    const serialized = JSON.stringify(container);
    return classifyStoredValue(serialized, descriptor).status === "current_container"
      ? serialized
      : null;
  } catch {
    return null;
  }
}

function hasExactPartitionContainerMarker(
  value: unknown,
): value is Record<string, unknown> {
  return isRecord(value) && value.format === OWNER_PARTITION_CONTAINER_FORMAT;
}

function hasCompletePreviousOwnerEnvelopeSignature(
  value: unknown,
): value is Record<string, unknown> {
  return isRecord(value) &&
    "version" in value &&
    "owner" in value &&
    "value" in value &&
    "updatedAt" in value;
}

function looksLikePartialPreviousOwnerEnvelope(value: unknown): boolean {
  if (!isRecord(value)) return false;

  const reservedKeys = ["version", "owner", "value", "updatedAt"];
  const presentKeys = reservedKeys.filter((key) => key in value);

  return (
    presentKeys.length >= 3 ||
    ("owner" in value && presentKeys.length >= 2)
  );
}

function parseDescriptorValue(
  storedValue: string,
  descriptor: SkillMintStorageDescriptor,
): { ok: true; value: unknown } | { ok: false } {
  if (descriptor.exportPolicy === "string_value") {
    const parsed = parseJson(storedValue);
    const value = parsed.ok && typeof parsed.value === "string"
      ? parsed.value
      : storedValue;
    return descriptor.validateValue(value) ? { ok: true, value } : { ok: false };
  }
  const parsed = parseJson(storedValue);
  return parsed.ok && descriptor.validateValue(parsed.value)
    ? { ok: true, value: parsed.value }
    : { ok: false };
}

function visibleResult(
  status: VisibleStoredValueResult["status"],
  serializedValue: string | null,
  owner: BrowserDataOwner | null,
  legacy: boolean,
  classification: StoredValueClassification["status"],
): VisibleStoredValueResult {
  return { status, serializedValue, owner, legacy, classification };
}

function mutationFailure(
  status: Exclude<OwnerStorageMutationResult["status"], "success" | "no_change">,
): OwnerStorageMutationResult {
  return { ok: false, changed: false, status };
}

function parseJson(value: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(value) };
  } catch {
    return { ok: false };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isPrimitive(value: unknown): boolean {
  return value === null || typeof value !== "object";
}

function isValidTimestamp(value: unknown): value is string {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)
  ) {
    return false;
  }

  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString() === value;
}

function hasOnlyKeys(
  value: Record<string, unknown>,
  allowedKeys: string[],
): boolean {
  return Object.keys(value).every((key) => allowedKeys.includes(key));
}

function getValidTimestamp(value: string | undefined): string | null {
  return isValidTimestamp(value) ? value : null;
}

function legacyTimestamp(): string {
  return "1970-01-01T00:00:00.000Z";
}
