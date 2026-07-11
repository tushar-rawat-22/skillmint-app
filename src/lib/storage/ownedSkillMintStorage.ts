import type {
  BrowserDataOwner,
  BrowserOwnerContext,
  OwnedBrowserValue,
  SkillMintStorageDescriptor,
} from "@/lib/storage/skillMintStorageTypes";
import {
  areBrowserDataOwnersEqual,
  getBrowserDataOwner,
} from "@/lib/storage/skillMintStorageTypes";

const OWNED_BROWSER_VALUE_VERSION = 1;

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
};

export function isOwnerAwareDescriptor(
  descriptor: SkillMintStorageDescriptor,
): boolean {
  return descriptor.ownerScope === "anonymous_or_account" ||
    descriptor.ownerScope === "account_only";
}

export function readVisibleStoredValue(
  storedValue: string | null,
  descriptor: SkillMintStorageDescriptor,
  context: BrowserOwnerContext,
): VisibleStoredValueResult {
  if (!storedValue) {
    return {
      status: "missing",
      serializedValue: null,
      owner: null,
      legacy: false,
    };
  }

  if (!isOwnerAwareDescriptor(descriptor)) {
    return {
      status: "visible",
      serializedValue: storedValue,
      owner: null,
      legacy: false,
    };
  }

  const currentOwner = getBrowserDataOwner(context.currentUserId);

  if (!currentOwner) {
    return {
      status: "owner_unknown",
      serializedValue: null,
      owner: null,
      legacy: false,
    };
  }

  const parsedValue = safeJsonParse(storedValue);

  const activeTargetEnvelope = getActiveTargetEnvelope(
    parsedValue,
    descriptor,
  );

  if (activeTargetEnvelope) {
    const activeTargetOwner = activeTargetEnvelope.ownerUserId
      ? {
          kind: "account" as const,
          userId: activeTargetEnvelope.ownerUserId,
        }
      : {
          kind: "anonymous" as const,
        };

    if (!areBrowserDataOwnersEqual(activeTargetOwner, currentOwner)) {
      return {
        status: "hidden_for_owner",
        serializedValue: null,
        owner: activeTargetOwner,
        legacy: false,
      };
    }

    return {
      status: "visible",
      serializedValue: JSON.stringify(activeTargetEnvelope.target),
      owner: activeTargetOwner,
      legacy: false,
    };
  }

  if (isOwnedBrowserValue(parsedValue)) {
    if (!areBrowserDataOwnersEqual(parsedValue.owner, currentOwner)) {
      return {
        status: "hidden_for_owner",
        serializedValue: null,
        owner: parsedValue.owner,
        legacy: false,
      };
    }

    return {
      status: "visible",
      serializedValue: JSON.stringify(parsedValue.value),
      owner: parsedValue.owner,
      legacy: false,
    };
  }

  if (parsedValue === undefined && descriptor.exportPolicy === "string_value") {
    return getLegacyVisibleStoredValue(storedValue, currentOwner);
  }

  if (parsedValue === undefined) {
    return {
      status: "corrupted",
      serializedValue: null,
      owner: null,
      legacy: false,
    };
  }

  return getLegacyVisibleStoredValue(storedValue, currentOwner);
}

export function createOwnedBrowserValue<T>(
  value: T,
  owner: BrowserDataOwner,
  updatedAt = new Date().toISOString(),
): OwnedBrowserValue<T> {
  return {
    version: OWNED_BROWSER_VALUE_VERSION,
    owner,
    value,
    updatedAt,
  };
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
    const storedValue = storage.getItem(descriptor.key);
    const result = readVisibleStoredValue(storedValue, descriptor, context);

    return result.status === "visible" ? result.serializedValue : null;
  } catch {
    return null;
  }
}

export function writeOwnedJsonStorageValue<T>(
  descriptor: SkillMintStorageDescriptor,
  value: T,
  context: BrowserOwnerContext,
): boolean {
  const storage = getBrowserStorage();
  const owner = getBrowserDataOwner(context.currentUserId);

  if (!storage || !owner) {
    return false;
  }

  try {
    const serializedValue = isOwnerAwareDescriptor(descriptor)
      ? serializeOwnedBrowserValue(value, owner)
      : JSON.stringify(value);

    storage.setItem(descriptor.key, serializedValue);
    return true;
  } catch {
    return false;
  }
}

export function writeOwnedStringStorageValue(
  descriptor: SkillMintStorageDescriptor,
  value: string,
  context: BrowserOwnerContext,
): boolean {
  const storage = getBrowserStorage();
  const owner = getBrowserDataOwner(context.currentUserId);

  if (!storage || !owner) {
    return false;
  }

  try {
    const serializedValue = isOwnerAwareDescriptor(descriptor)
      ? serializeOwnedBrowserValue(value, owner)
      : value;

    storage.setItem(descriptor.key, serializedValue);
    return true;
  } catch {
    return false;
  }
}

export function getVisibleJsonValue(
  storedValue: string | null,
  descriptor: SkillMintStorageDescriptor,
  context: BrowserOwnerContext,
): unknown {
  const result = readVisibleStoredValue(storedValue, descriptor, context);

  if (result.status !== "visible" || result.serializedValue === null) {
    return undefined;
  }

  return safeJsonParse(result.serializedValue);
}

export function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

export function isOwnedBrowserValue(value: unknown): value is OwnedBrowserValue<unknown> {
  if (!isRecord(value)) {
    return false;
  }

  return value.version === OWNED_BROWSER_VALUE_VERSION &&
    isBrowserDataOwner(value.owner) &&
    "value" in value &&
    typeof value.updatedAt === "string" &&
    Number.isFinite(Date.parse(value.updatedAt));
}

function getActiveTargetEnvelope(
  value: unknown,
  descriptor: SkillMintStorageDescriptor,
): {
  ownerUserId: string | null;
  target: unknown;
} | null {
  if (descriptor.key !== "skillmint:active-target:v1" || !isRecord(value)) {
    return null;
  }

  if (
    !("target" in value) ||
    !(value.ownerUserId === null || typeof value.ownerUserId === "string")
  ) {
    return null;
  }

  return {
    ownerUserId: value.ownerUserId,
    target: value.target,
  };
}

function getLegacyVisibleStoredValue(
  storedValue: string,
  currentOwner: BrowserDataOwner,
): VisibleStoredValueResult {
  const anonymousOwner: BrowserDataOwner = {
    kind: "anonymous",
  };

  if (!areBrowserDataOwnersEqual(anonymousOwner, currentOwner)) {
    return {
      status: "hidden_for_owner",
      serializedValue: null,
      owner: anonymousOwner,
      legacy: true,
    };
  }

  return {
    status: "visible",
    serializedValue: storedValue,
    owner: anonymousOwner,
    legacy: true,
  };
}

function isBrowserDataOwner(value: unknown): value is BrowserDataOwner {
  if (!isRecord(value)) {
    return false;
  }

  if (value.kind === "anonymous") {
    return true;
  }

  return value.kind === "account" &&
    typeof value.userId === "string" &&
    value.userId.trim().length > 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
