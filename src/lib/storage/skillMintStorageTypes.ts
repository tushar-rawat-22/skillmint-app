export type SkillMintStorageOwnerScope =
  | "global_preference"
  | "anonymous_or_account"
  | "account_only"
  | "non_sensitive_product_state";

export type SkillMintStorageCategory =
  | "active_target"
  | "activation"
  | "feedback"
  | "job_match"
  | "mission"
  | "onboarding"
  | "resume"
  | "sync_status";

export type SkillMintExportPolicy =
  | "json_value"
  | "boolean_string"
  | "string_value";

export type BrowserDataOwner =
  | { kind: "anonymous" }
  | { kind: "account"; userId: string };

export type LegacyOwnerEnvelopeClassification =
  | { status: "not_applicable" }
  | { status: "valid"; owner: BrowserDataOwner; value: unknown; updatedAt: string }
  | { status: "invalid" }
  | { status: "unsupported_version" };

export type AnonymousImportPreparation =
  | { ok: true; value: unknown }
  | { ok: false; reason: string };

export type SkillMintStorageDescriptor = {
  key: string;
  version: number;
  category: SkillMintStorageCategory;
  ownerScope: SkillMintStorageOwnerScope;
  containsPersonalData: boolean;
  clearWithBrowserReset: boolean;
  exportable: boolean;
  importable: boolean;
  exportPolicy?: SkillMintExportPolicy;
  description: string;
  validateValue: (value: unknown) => boolean;
  /**
   * Converts a validated anonymous value into a value that can truthfully live
   * in an account partition. Descriptors with no account-linked metadata keep
   * their validated value unchanged through the registry's identity fallback.
   */
  prepareAnonymousImport?: (value: unknown) => AnonymousImportPreparation;
  classifyLegacyOwnerEnvelope?: (
    value: unknown,
  ) => LegacyOwnerEnvelopeClassification;
};

export type OwnedBrowserValue<T> = {
  version: 1;
  owner: BrowserDataOwner;
  value: T;
  updatedAt: string;
};

export type BrowserOwnerContext = {
  currentUserId: string | null | undefined;
};

export type BrowserWorkspaceWriteResolution =
  | { status: "checking"; owner: null }
  | { status: "ready"; owner: BrowserDataOwner };

export function normalizeAccountOwnerId(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  const reserved = normalized.toLowerCase();

  if (
    !normalized ||
    reserved === "undefined" ||
    reserved === "null" ||
    reserved === "__proto__" ||
    reserved === "prototype" ||
    reserved === "constructor"
  ) {
    return null;
  }

  return normalized;
}

export function isUuidShapedIdentifier(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    .test(value);
}

export function getBrowserDataOwner(
  currentUserId: string | null | undefined,
): BrowserDataOwner | null {
  if (currentUserId === null) {
    return { kind: "anonymous" };
  }

  const userId = normalizeAccountOwnerId(currentUserId);

  return userId ? { kind: "account", userId } : null;
}

export function resolveBrowserWorkspaceWriteOwner(
  currentUserId: string | null | undefined,
): BrowserWorkspaceWriteResolution {
  if (currentUserId === undefined) {
    return { status: "checking", owner: null };
  }

  const owner = getBrowserDataOwner(currentUserId);
  return owner
    ? { status: "ready", owner }
    : { status: "checking", owner: null };
}

export function areBrowserDataOwnersEqual(
  leftOwner: BrowserDataOwner,
  rightOwner: BrowserDataOwner,
): boolean {
  return leftOwner.kind === rightOwner.kind && (
    leftOwner.kind === "anonymous" ||
    (
      leftOwner.kind === "account" &&
      rightOwner.kind === "account" &&
      leftOwner.userId === rightOwner.userId
    )
  );
}

export function getOwnerScopeLabel(owner: BrowserDataOwner | null): string {
  if (!owner) {
    return "unknown";
  }

  return owner.kind === "anonymous" ? "anonymous" : "account";
}
