import { getBrowserDataOwner } from "@/lib/storage/skillMintStorageTypes";
import type { BrowserStorageSummary } from "@/lib/storage/skillMintStorageRegistry";
import type { AccountDataCounts } from "@/modules/data-controls/types";

export type TrustCenterOwnerKey = string;

export type BrowserSummaryLoadState = {
  ownerKey: TrustCenterOwnerKey | null;
  contextEpoch: number;
  status: "idle" | "loading" | "ready" | "error";
  data: BrowserStorageSummary | null;
  error: string | null;
};

export type BrowserSummaryPresentation =
  | {
      status: "checking";
      summary: null;
      canExport: false;
      overviewValue: "Checking…";
      overviewDetail: "Checking this browser’s SkillMint data.";
      descriptorStatus: "checking";
    }
  | {
      status: "unavailable";
      summary: null;
      canExport: false;
      overviewValue: "Unavailable";
      overviewDetail: "Browser data status is unavailable right now.";
      descriptorStatus: "unavailable";
    }
  | {
      status: "ready";
      summary: BrowserStorageSummary;
      canExport: true;
      overviewValue: string;
      overviewDetail: string;
      descriptorStatus: "ready";
    };

export type AccountCountsLoadState = {
  ownerKey: TrustCenterOwnerKey | null;
  request: OwnedRequestIdentity | null;
  status: "idle" | "loading" | "ready" | "error";
  data: AccountDataCounts | null;
  error: string | null;
};

export type AccountCountsPresentationStatus =
  | "checking_auth"
  | "signed_out"
  | "not_configured"
  | "loading"
  | "ready"
  | "error";

export type AccountCountsPresentation = {
  status: AccountCountsPresentationStatus;
  overviewValue: string;
  countDisplay: {
    profile: string;
    resumeAnalyses: string;
    jobMatches: string;
    careerSnapshots: string;
    betaFeedback: string;
  };
  counts: AccountDataCounts | null;
  error: string | null;
  canExport: boolean;
};

export type OwnedRequestIdentity = {
  ownerKey: TrustCenterOwnerKey;
  contextEpoch: number;
  requestToken: number;
};

export type LiveOwnedRequestContext = {
  ownerKey: TrustCenterOwnerKey | null;
  contextEpoch: number;
};

export function getBrowserSummaryOwnerKey(
  currentUserId: string | null | undefined,
): TrustCenterOwnerKey | null {
  const owner = getBrowserDataOwner(currentUserId);
  if (!owner) return null;
  return owner.kind === "anonymous"
    ? "trust-center:anonymous"
    : `trust-center:account:${owner.userId}`;
}

export function getVisibleBrowserSummaryState(
  currentOwnerKey: TrustCenterOwnerKey | null,
  currentContextEpoch: number,
  state: BrowserSummaryLoadState,
): BrowserSummaryPresentation {
  if (
    !currentOwnerKey ||
    state.ownerKey !== currentOwnerKey ||
    state.contextEpoch !== currentContextEpoch ||
    state.status === "idle" ||
    state.status === "loading"
  ) {
    return {
      status: "checking",
      summary: null,
      canExport: false,
      overviewValue: "Checking…",
      overviewDetail: "Checking this browser’s SkillMint data.",
      descriptorStatus: "checking",
    };
  }

  if (
    state.status === "error" ||
    !state.data ||
    state.data.items.some((item) => item.issue === "storage_unavailable")
  ) {
    return {
      status: "unavailable",
      summary: null,
      canExport: false,
      overviewValue: "Unavailable",
      overviewDetail: "Browser data status is unavailable right now.",
      descriptorStatus: "unavailable",
    };
  }

  return {
    status: "ready",
    summary: state.data,
    canExport: true,
    overviewValue: `${state.data.visibleCount} visible item${
      state.data.visibleCount === 1 ? "" : "s"
    }`,
    overviewDetail: `${state.data.corruptedCount} unreadable item${
      state.data.corruptedCount === 1 ? "" : "s"
    }.`,
    descriptorStatus: "ready",
  };
}

export function getAccountCountsPresentation(input: {
  isAuthLoading: boolean;
  isConfigured: boolean;
  currentUserId: string | null | undefined;
  currentOwnerKey: TrustCenterOwnerKey | null;
  currentContextEpoch: number;
  state: AccountCountsLoadState;
}): AccountCountsPresentation {
  const exportEligible = Boolean(
    !input.isAuthLoading &&
    input.isConfigured &&
    input.currentUserId !== null &&
    input.currentUserId !== undefined &&
    input.currentOwnerKey,
  );

  if (input.isAuthLoading || !input.currentOwnerKey) {
    return accountPresentation("checking_auth", "Checking account", "Checking…", false);
  }
  if (input.currentUserId === null) {
    return accountPresentation(
      "signed_out",
      "Sign in required",
      "Not available while signed out",
      false,
    );
  }
  if (!input.isConfigured) {
    return accountPresentation(
      "not_configured",
      "Account connection unavailable",
      "Unavailable",
      false,
    );
  }
  if (
    input.state.ownerKey !== input.currentOwnerKey ||
    !input.state.request ||
    input.state.request.contextEpoch !== input.currentContextEpoch ||
    input.state.status === "idle" ||
    input.state.status === "loading"
  ) {
    return accountPresentation("loading", "Loading counts", "Checking…", true);
  }
  if (input.state.status === "error") {
    return accountPresentation(
      "error",
      "Account counts unavailable",
      "Unavailable",
      exportEligible,
      input.state.error ?? "Account data counts are unavailable right now.",
    );
  }
  if (!isValidAccountDataCounts(input.state.data)) {
    return accountPresentation(
      "error",
      "Account counts unavailable",
      "Unavailable",
      exportEligible,
      "Account data counts are unavailable right now.",
    );
  }

  return {
    status: "ready",
    overviewValue: "Account data available",
    countDisplay: mapCountDisplay(input.state.data),
    counts: input.state.data,
    error: null,
    canExport: true,
  };
}

export function isCurrentOwnedRequest(
  request: OwnedRequestIdentity,
  liveContext: LiveOwnedRequestContext,
  activeRequest: OwnedRequestIdentity | null,
): boolean {
  return Boolean(
    activeRequest &&
    request.ownerKey === liveContext.ownerKey &&
    request.contextEpoch === liveContext.contextEpoch &&
    request.ownerKey === activeRequest.ownerKey &&
    request.contextEpoch === activeRequest.contextEpoch &&
    request.requestToken === activeRequest.requestToken,
  );
}

function accountPresentation(
  status: Exclude<AccountCountsPresentationStatus, "ready">,
  overviewValue: string,
  countValue: string,
  canExport: boolean,
  error: string | null = null,
): AccountCountsPresentation {
  return {
    status,
    overviewValue,
    countDisplay: {
      profile: countValue,
      resumeAnalyses: countValue,
      jobMatches: countValue,
      careerSnapshots: countValue,
      betaFeedback: countValue,
    },
    counts: null,
    error,
    canExport,
  };
}

function isValidAccountDataCounts(
  value: AccountDataCounts | null,
): value is AccountDataCounts {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as unknown as Record<string, unknown>;
  const keys = [
    "profile",
    "resumeAnalyses",
    "jobMatches",
    "careerSnapshots",
    "betaFeedback",
  ] as const;
  return Object.keys(record).length === keys.length && keys.every((key) =>
    Object.prototype.hasOwnProperty.call(record, key) &&
    typeof record[key] === "number" &&
    Number.isSafeInteger(record[key]) &&
    (record[key] as number) >= 0
  );
}

function mapCountDisplay(data: AccountDataCounts) {
  return {
    profile: data.profile.toString(),
    resumeAnalyses: data.resumeAnalyses.toString(),
    jobMatches: data.jobMatches.toString(),
    careerSnapshots: data.careerSnapshots.toString(),
    betaFeedback: data.betaFeedback.toString(),
  };
}
