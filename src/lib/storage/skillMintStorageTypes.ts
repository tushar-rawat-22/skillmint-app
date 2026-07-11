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

export type SkillMintStorageDescriptor = {
  key: string;
  version: number;
  category: SkillMintStorageCategory;
  ownerScope: SkillMintStorageOwnerScope;
  containsPersonalData: boolean;
  clearWithBrowserReset: boolean;
  exportable: boolean;
  exportPolicy?: SkillMintExportPolicy;
  description: string;
};

export type BrowserDataOwner =
  | {
      kind: "anonymous";
    }
  | {
      kind: "account";
      userId: string;
    };

export type OwnedBrowserValue<T> = {
  version: number;
  owner: BrowserDataOwner;
  value: T;
  updatedAt: string;
};

export type BrowserOwnerContext = {
  currentUserId: string | null | undefined;
};

export function getBrowserDataOwner(
  currentUserId: string | null | undefined,
): BrowserDataOwner | null {
  if (currentUserId === undefined) {
    return null;
  }

  const trimmedUserId = currentUserId?.trim();

  return trimmedUserId
    ? {
        kind: "account",
        userId: trimmedUserId,
      }
    : {
        kind: "anonymous",
      };
}

export function areBrowserDataOwnersEqual(
  leftOwner: BrowserDataOwner,
  rightOwner: BrowserDataOwner,
): boolean {
  if (leftOwner.kind !== rightOwner.kind) {
    return false;
  }

  if (leftOwner.kind === "anonymous" && rightOwner.kind === "anonymous") {
    return true;
  }

  if (leftOwner.kind === "account" && rightOwner.kind === "account") {
    return leftOwner.userId === rightOwner.userId;
  }

  return false;
}

export function getOwnerScopeLabel(owner: BrowserDataOwner | null): string {
  if (!owner) {
    return "unknown";
  }

  return owner.kind === "anonymous" ? "anonymous" : "account";
}
