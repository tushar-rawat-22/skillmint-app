"use client";

/* eslint-disable react-hooks/set-state-in-effect -- Owner-bound state is deliberately invalidated in effects when authentication/configuration context changes. */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  premiumBadge,
  premiumCompactSurface,
  premiumDangerCta,
  premiumDangerSurface,
  premiumEyebrow,
  premiumHeroSurface,
  premiumMutedText,
  premiumPageStack,
  premiumPrimaryCta,
  premiumSecondaryCta,
  premiumSurface,
  premiumWarningSurface,
} from "@/components/ui/premium";
import {
  buildBrowserDataExport,
  clearSkillMintBrowserData,
  formatOtherWorkspaceSummary,
  getBrowserStorageSummary,
  getSkillMintStorageDescriptors,
  importAnonymousBrowserWorkspaceToAccount,
  removeSkillMintOwnerData,
} from "@/lib/storage/skillMintStorageRegistry";
import { subscribeToSkillMintWorkspaceUpdates } from "@/lib/storage/skillMintStorageEvents";
import { detachDeletedSavedReportReferences } from "@/lib/storage/reportReferenceCleanup";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  buildCurrentUserAccountDataExport,
  deleteCurrentUserSavedReports,
  getCurrentUserAccountDataCounts,
  type SavedReportsDeletionCounts,
} from "@/modules/data-controls";
import { parseAccountDeletionResponse } from "@/modules/data-controls/accountDeletionClientContract";
import { requestJsonDownload } from "@/modules/data-controls/jsonDownload";
import {
  getAccountCountsPresentation,
  getBrowserSummaryOwnerKey,
  getVisibleBrowserSummaryState,
  isCurrentOwnedRequest,
  type AccountCountsLoadState,
  type BrowserSummaryLoadState,
  type OwnedRequestIdentity,
  type TrustCenterOwnerKey,
} from "@/modules/data-controls/trustCenterState";

const ACCOUNT_DELETE_CONFIRMATION = "DELETE MY ACCOUNT";

type AsyncState<T> =
  | {
      status: "idle" | "loading";
      data: T | null;
      message: string | null;
      error: string | null;
    }
  | {
      status: "success";
      data: T;
      message: string;
      error: null;
    }
  | {
      status: "error";
      data: T | null;
      message: null;
      error: string;
    };

type ActionNotice = {
  status: "idle" | "loading" | "success" | "error";
  message: string | null;
  error: string | null;
};

type AccountExportState = ActionNotice & {
  ownerKey: TrustCenterOwnerKey | null;
  contextEpoch: number;
};

type BrowserActionState = ActionNotice & {
  ownerKey: TrustCenterOwnerKey | null;
  contextEpoch: number;
};

type OwnedAsyncState<T> = AsyncState<T> & {
  ownerKey: TrustCenterOwnerKey | null;
  contextEpoch: number;
};

type LiveRequestContext = {
  ownerKey: TrustCenterOwnerKey | null;
  contextEpoch: number;
  currentUserId: string | null | undefined;
  isAuthLoading: boolean;
  isConfigured: boolean;
};

const IDLE_NOTICE: ActionNotice = {
  status: "idle",
  message: null,
  error: null,
};

const IDLE_BROWSER_SUMMARY: BrowserSummaryLoadState = {
  ownerKey: null,
  contextEpoch: 0,
  status: "idle",
  data: null,
  error: null,
};

const IDLE_ACCOUNT_COUNTS: AccountCountsLoadState = {
  ownerKey: null,
  request: null,
  status: "idle",
  data: null,
  error: null,
};

export default function DataSettingsPage() {
  const {
    user,
    isConfigured,
    isLoading: isAuthLoading,
  } = useAuthSession();
  const currentUserId = isAuthLoading ? undefined : user?.id ?? null;
  const ownerKey = getBrowserSummaryOwnerKey(currentUserId);
  const committedRequestContextRef = useRef<LiveRequestContext>({
    ownerKey: null,
    contextEpoch: 0,
    currentUserId: undefined,
    isAuthLoading: true,
    isConfigured,
  });
  const previousContext = committedRequestContextRef.current;
  const contextChanged = previousContext.ownerKey !== ownerKey ||
    previousContext.isAuthLoading !== isAuthLoading ||
    previousContext.isConfigured !== isConfigured;
  const currentContextEpoch = contextChanged
    ? previousContext.contextEpoch + 1
    : previousContext.contextEpoch;
  const liveRequestContextRef = useRef<LiveRequestContext>({
    ownerKey: null,
    contextEpoch: 0,
    currentUserId: undefined,
    isAuthLoading: true,
    isConfigured,
  });
  useLayoutEffect(() => {
    const committedContext: LiveRequestContext = {
      ownerKey,
      contextEpoch: currentContextEpoch,
      currentUserId,
      isAuthLoading,
      isConfigured,
    };
    committedRequestContextRef.current = committedContext;
    liveRequestContextRef.current = committedContext;
  }, [
    currentContextEpoch,
    currentUserId,
    isAuthLoading,
    isConfigured,
    ownerKey,
  ]);

  const [browserSummaryState, setBrowserSummaryState] =
    useState<BrowserSummaryLoadState>(IDLE_BROWSER_SUMMARY);
  const browserSummaryReloadRef = useRef<() => void>(() => undefined);
  const [accountCountsState, setAccountCountsState] =
    useState<AccountCountsLoadState>(IDLE_ACCOUNT_COUNTS);
  const countRequestTokenRef = useRef(0);
  const activeCountRequestRef = useRef<OwnedRequestIdentity | null>(null);
  const [browserNotice, setBrowserNotice] =
    useState<BrowserActionState>({
      ownerKey: null,
      contextEpoch: 0,
      ...IDLE_NOTICE,
    });
  const browserExportTokenRef = useRef(0);
  const activeBrowserExportRef = useRef<OwnedRequestIdentity | null>(null);
  const browserActionLockRef = useRef(false);
  const [accountExportState, setAccountExportState] =
    useState<AccountExportState>({
      ownerKey: null,
      contextEpoch: 0,
      ...IDLE_NOTICE,
    });
  const accountExportTokenRef = useRef(0);
  const activeAccountExportRef = useRef<OwnedRequestIdentity | null>(null);
  const isTrustCenterMountedRef = useRef(true);
  const [showBrowserClearDialog, setShowBrowserClearDialog] = useState(false);
  const [showSavedReportsDialog, setShowSavedReportsDialog] = useState(false);
  const [showAccountDeleteDialog, setShowAccountDeleteDialog] = useState(false);
  const [savedReportsDeletion, setSavedReportsDeletion] =
    useState<OwnedAsyncState<SavedReportsDeletionCounts>>({
      ownerKey: null,
      contextEpoch: 0,
      status: "idle",
      data: null,
      message: null,
      error: null,
    });
  const savedReportsDeletionTokenRef = useRef(0);
  const activeSavedReportsDeletionRef =
    useRef<OwnedRequestIdentity | null>(null);
  const [accountDeletionState, setAccountDeletionState] =
    useState<OwnedAsyncState<null>>({
      ownerKey: null,
      contextEpoch: 0,
      status: "idle",
      data: null,
      message: null,
      error: null,
    });
  const [accountDeleteConfirmation, setAccountDeleteConfirmation] =
    useState("");
  const [accountDeletePassword, setAccountDeletePassword] = useState("");
  const accountDeletePasswordValueRef = useRef("");
  const accountDeleteConfirmationInputRef = useRef<HTMLInputElement>(null);
  const accountDeletionTokenRef = useRef(0);
  const activeAccountDeletionRef = useRef<OwnedRequestIdentity | null>(null);
  const [importDismissed, setImportDismissed] = useState(false);

  useEffect(() => {
    isTrustCenterMountedRef.current = true;
    return () => {
      isTrustCenterMountedRef.current = false;
      activeCountRequestRef.current = null;
      activeBrowserExportRef.current = null;
      activeAccountExportRef.current = null;
      activeSavedReportsDeletionRef.current = null;
      activeAccountDeletionRef.current = null;
      accountDeletePasswordValueRef.current = "";
      browserSummaryReloadRef.current = () => undefined;
    };
  }, []);

  const loadAccountCounts = useCallback(async () => {
    const live = liveRequestContextRef.current;
    if (
      !live.ownerKey ||
      live.isAuthLoading ||
      !live.isConfigured ||
      typeof live.currentUserId !== "string"
    ) {
      return;
    }

    const request: OwnedRequestIdentity = {
      ownerKey: live.ownerKey,
      contextEpoch: live.contextEpoch,
      requestToken: countRequestTokenRef.current + 1,
    };
    countRequestTokenRef.current = request.requestToken;
    activeCountRequestRef.current = request;
    setAccountCountsState({
      ownerKey: request.ownerKey,
      request,
      status: "loading",
      data: null,
      error: null,
    });

    try {
      const result = await getCurrentUserAccountDataCounts(live.currentUserId);
      if (
        !isTrustCenterMountedRef.current ||
        !isCurrentOwnedRequest(
          request,
          liveRequestContextRef.current,
          activeCountRequestRef.current,
        )
      ) return;

      setAccountCountsState({
        ownerKey: request.ownerKey,
        request,
        status: result.ok ? "ready" : "error",
        data: result.ok ? result.data : null,
        error: result.ok ? null : result.error.message,
      });
    } catch {
      if (
        !isTrustCenterMountedRef.current ||
        !isCurrentOwnedRequest(
          request,
          liveRequestContextRef.current,
          activeCountRequestRef.current,
        )
      ) return;
      setAccountCountsState({
        ownerKey: request.ownerKey,
        request,
        status: "error",
        data: null,
        error: "Account data counts are unavailable right now.",
      });
    } finally {
      if (
        isTrustCenterMountedRef.current &&
        isCurrentOwnedRequest(
          request,
          liveRequestContextRef.current,
          activeCountRequestRef.current,
        )
      ) {
        activeCountRequestRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    if (!ownerKey) {
      setBrowserSummaryState(IDLE_BROWSER_SUMMARY);
      browserSummaryReloadRef.current = () => undefined;
      return;
    }

    let active = true;
    const requestOwnerKey = ownerKey;
    const requestContextEpoch = currentContextEpoch;
    const requestUserId = currentUserId;
    const loadSummary = () => {
      try {
        const data = getBrowserStorageSummary({
          currentUserId: requestUserId,
        });
        if (!active) return;
        setBrowserSummaryState({
          ownerKey: requestOwnerKey,
          contextEpoch: requestContextEpoch,
          status: "ready",
          data,
          error: null,
        });
      } catch {
        if (!active) return;
        setBrowserSummaryState({
          ownerKey: requestOwnerKey,
          contextEpoch: requestContextEpoch,
          status: "error",
          data: null,
          error: "Browser data status is unavailable right now.",
        });
      }
    };

    setBrowserSummaryState((current) =>
      current.ownerKey === requestOwnerKey &&
          current.contextEpoch === requestContextEpoch &&
          current.status === "ready"
        ? current
        : {
            ownerKey: requestOwnerKey,
            contextEpoch: requestContextEpoch,
            status: "loading",
            data: null,
            error: null,
          }
    );
    browserSummaryReloadRef.current = loadSummary;
    loadSummary();
    const unsubscribe = subscribeToSkillMintWorkspaceUpdates(loadSummary);

    return () => {
      active = false;
      unsubscribe();
      if (browserSummaryReloadRef.current === loadSummary) {
        browserSummaryReloadRef.current = () => undefined;
      }
    };
  }, [currentContextEpoch, currentUserId, ownerKey]);

  useEffect(() => {
    activeCountRequestRef.current = null;
    activeBrowserExportRef.current = null;
    browserActionLockRef.current = false;
    setBrowserNotice({
      ownerKey,
      contextEpoch: currentContextEpoch,
      ...IDLE_NOTICE,
    });
    setAccountExportState({
      ownerKey,
      contextEpoch: currentContextEpoch,
      ...IDLE_NOTICE,
    });
    activeSavedReportsDeletionRef.current = null;
    activeAccountDeletionRef.current = null;
    setSavedReportsDeletion({
      ownerKey,
      contextEpoch: currentContextEpoch,
      status: "idle",
      data: null,
      message: null,
      error: null,
    });
    setAccountDeletionState({
      ownerKey,
      contextEpoch: currentContextEpoch,
      status: "idle",
      data: null,
      message: null,
      error: null,
    });
    setImportDismissed(false);
    setShowSavedReportsDialog(false);
    setShowAccountDeleteDialog(false);
    accountDeletePasswordValueRef.current = "";
    setAccountDeletePassword("");
    setAccountDeleteConfirmation("");

    const live = liveRequestContextRef.current;
    if (
      live.ownerKey &&
      !live.isAuthLoading &&
      live.isConfigured &&
      typeof live.currentUserId === "string"
    ) {
      void loadAccountCounts();
    } else {
      setAccountCountsState({
        ownerKey: live.ownerKey,
        request: null,
        status: "idle",
        data: null,
        error: null,
      });
    }
  }, [currentContextEpoch, loadAccountCounts, ownerKey]);

  const browserPresentation = getVisibleBrowserSummaryState(
    ownerKey,
    currentContextEpoch,
    browserSummaryState,
  );
  const accountCountsPresentation = getAccountCountsPresentation({
    isAuthLoading,
    isConfigured,
    currentUserId,
    currentOwnerKey: ownerKey,
    currentContextEpoch,
    state: accountCountsState,
  });
  const visibleBrowserNotice = browserNotice.ownerKey === ownerKey &&
      browserNotice.contextEpoch === currentContextEpoch
    ? browserNotice
    : IDLE_NOTICE;
  const visibleAccountExportState = accountExportState.ownerKey === ownerKey &&
      accountExportState.contextEpoch === currentContextEpoch
    ? accountExportState
    : { ownerKey, contextEpoch: currentContextEpoch, ...IDLE_NOTICE };
  const visibleSavedReportsDeletion =
    savedReportsDeletion.ownerKey === ownerKey &&
      savedReportsDeletion.contextEpoch === currentContextEpoch
      ? savedReportsDeletion
      : {
          ownerKey,
          contextEpoch: currentContextEpoch,
          status: "idle" as const,
          data: null,
          message: null,
          error: null,
        };
  const visibleAccountDeletionState =
    accountDeletionState.ownerKey === ownerKey &&
      accountDeletionState.contextEpoch === currentContextEpoch
      ? accountDeletionState
      : {
          ownerKey,
          contextEpoch: currentContextEpoch,
          status: "idle" as const,
          data: null,
          message: null,
          error: null,
        };
  const visibleShowSavedReportsDialog = showSavedReportsDialog &&
    !contextChanged;
  const visibleShowAccountDeleteDialog = showAccountDeleteDialog &&
    !contextChanged;
  const shouldOfferImport = Boolean(
    typeof currentUserId === "string" &&
    !isAuthLoading &&
    !importDismissed &&
    browserPresentation.status === "ready" &&
    browserPresentation.summary.anonymousWorkspaceDataExists
  );

  function publishBrowserNotice(notice: ActionNotice) {
    const live = liveRequestContextRef.current;
    setBrowserNotice({
      ownerKey: live.ownerKey,
      contextEpoch: live.contextEpoch,
      ...notice,
    });
  }

  function handleBrowserExport() {
    const live = liveRequestContextRef.current;
    if (
      browserActionLockRef.current ||
      !live.ownerKey ||
      !browserPresentation.canExport
    ) return;

    const request: OwnedRequestIdentity = {
      ownerKey: live.ownerKey,
      contextEpoch: live.contextEpoch,
      requestToken: browserExportTokenRef.current + 1,
    };
    browserExportTokenRef.current = request.requestToken;
    activeBrowserExportRef.current = request;
    browserActionLockRef.current = true;
    publishBrowserNotice({
      status: "loading",
      message: "Preparing browser export…",
      error: null,
    });
    try {
      const result = buildBrowserDataExport({
        currentUserId: live.currentUserId,
      });
      if (
        !isTrustCenterMountedRef.current ||
        !isCurrentOwnedRequest(
          request,
          liveRequestContextRef.current,
          activeBrowserExportRef.current,
        )
      ) return;
      if (!result.ok) {
        publishBrowserNotice({
          status: "error",
          message: null,
          error: result.error.message,
        });
        return;
      }
      const downloadResult = requestJsonDownload(result.fileName, result.json);
      if (
        !isTrustCenterMountedRef.current ||
        !isCurrentOwnedRequest(
          request,
          liveRequestContextRef.current,
          activeBrowserExportRef.current,
        )
      ) return;
      if (!downloadResult.ok) {
        publishBrowserNotice({
          status: "error",
          message: null,
          error: downloadResult.error.message,
        });
        return;
      }
      publishBrowserNotice({
        status: "success",
        message: "Browser download was requested. Check your browser’s downloads.",
        error: null,
      });
    } catch {
      publishBrowserNotice({
        status: "error",
        message: null,
        error: "Browser export could not be prepared right now.",
      });
    } finally {
      browserActionLockRef.current = false;
      if (
        isTrustCenterMountedRef.current &&
        isCurrentOwnedRequest(
          request,
          liveRequestContextRef.current,
          activeBrowserExportRef.current,
        )
      ) {
        activeBrowserExportRef.current = null;
      }
    }
  }

  async function handleAccountExport() {
    const live = liveRequestContextRef.current;
    const activeRequest = activeAccountExportRef.current;
    if (
      !accountCountsPresentation.canExport ||
      !live.ownerKey ||
      typeof live.currentUserId !== "string"
    ) return;
    if (activeRequest && isCurrentOwnedRequest(
      activeRequest,
      live,
      activeRequest,
    )) return;

    const request: OwnedRequestIdentity = {
      ownerKey: live.ownerKey,
      contextEpoch: live.contextEpoch,
      requestToken: accountExportTokenRef.current + 1,
    };
    accountExportTokenRef.current = request.requestToken;
    activeAccountExportRef.current = request;
    setAccountExportState({
      ownerKey: request.ownerKey,
      contextEpoch: request.contextEpoch,
      status: "loading",
      message: "Preparing account export…",
      error: null,
    });

    try {
      const result = await buildCurrentUserAccountDataExport({
        expectedUserId: live.currentUserId,
      });
      if (
        !isTrustCenterMountedRef.current ||
        !isCurrentOwnedRequest(
          request,
          liveRequestContextRef.current,
          activeAccountExportRef.current,
        )
      ) return;
      if (!result.ok) {
        setAccountExportState({
          ownerKey: request.ownerKey,
          contextEpoch: request.contextEpoch,
          status: "error",
          message: null,
          error: result.error.message,
        });
        return;
      }

      const downloadResult = requestJsonDownload(
        result.data.fileName,
        result.data.json,
      );
      if (
        !isTrustCenterMountedRef.current ||
        !isCurrentOwnedRequest(
          request,
          liveRequestContextRef.current,
          activeAccountExportRef.current,
        )
      ) return;
      setAccountExportState({
        ownerKey: request.ownerKey,
        contextEpoch: request.contextEpoch,
        status: downloadResult.ok ? "success" : "error",
        message: downloadResult.ok
          ? "Account download was requested. Check your browser’s downloads."
          : null,
        error: downloadResult.ok ? null : downloadResult.error.message,
      });
    } catch {
      if (
        !isTrustCenterMountedRef.current ||
        !isCurrentOwnedRequest(
          request,
          liveRequestContextRef.current,
          activeAccountExportRef.current,
        )
      ) return;
      setAccountExportState({
        ownerKey: request.ownerKey,
        contextEpoch: request.contextEpoch,
        status: "error",
        message: null,
        error: "Account export could not be prepared right now.",
      });
    } finally {
      if (
        isTrustCenterMountedRef.current &&
        isCurrentOwnedRequest(
          request,
          liveRequestContextRef.current,
          activeAccountExportRef.current,
        )
      ) {
        activeAccountExportRef.current = null;
      }
    }
  }

  function handleImportAnonymousWorkspace() {
    const live = liveRequestContextRef.current;
    if (typeof live.currentUserId !== "string") return;
    publishBrowserNotice({
      status: "loading",
      message: "Importing browser workspace…",
      error: null,
    });
    const result = importAnonymousBrowserWorkspaceToAccount(live.currentUserId);
    if (!result.ok) {
      publishBrowserNotice({
        status: "error",
        message: null,
        error: result.error ?? "Browser workspace import failed.",
      });
      browserSummaryReloadRef.current();
      return;
    }
    publishBrowserNotice({
      status: "success",
      message: result.importedKeys.length
        ? `Imported ${result.importedKeys.length} browser item(s) into this account workspace.`
        : "No anonymous browser items needed import.",
      error: null,
    });
    setImportDismissed(true);
    browserSummaryReloadRef.current();
  }

  function handleClearBrowserData() {
    publishBrowserNotice({
      status: "loading",
      message: "Clearing SkillMint browser data…",
      error: null,
    });
    const result = clearSkillMintBrowserData();
    publishBrowserNotice(result.failedKeys.length
      ? {
          status: "error",
          message: null,
          error: `Removed ${result.removed} item(s), but ${result.failedKeys.length} browser item(s) could not be cleared.`,
        }
      : {
          status: "success",
          message: "SkillMint data was cleared from this browser. Account records were not deleted.",
          error: null,
        });
    setShowBrowserClearDialog(false);
    browserSummaryReloadRef.current();
  }

  async function handleDeleteSavedReports() {
    const live = liveRequestContextRef.current;
    if (!live.ownerKey || typeof live.currentUserId !== "string") return;
    const activeRequest = activeSavedReportsDeletionRef.current;
    if (activeRequest && isCurrentOwnedRequest(activeRequest, live, activeRequest)) {
      return;
    }

    const request: OwnedRequestIdentity = {
      ownerKey: live.ownerKey,
      contextEpoch: live.contextEpoch,
      requestToken: savedReportsDeletionTokenRef.current + 1,
    };
    savedReportsDeletionTokenRef.current = request.requestToken;
    activeSavedReportsDeletionRef.current = request;
    setSavedReportsDeletion({
      ownerKey: request.ownerKey,
      contextEpoch: request.contextEpoch,
      status: "loading",
      data: null,
      message: null,
      error: null,
    });

    try {
      const result = await deleteCurrentUserSavedReports(live.currentUserId);
      if (
        !isTrustCenterMountedRef.current ||
        !isCurrentOwnedRequest(
          request,
          liveRequestContextRef.current,
          activeSavedReportsDeletionRef.current,
        )
      ) return;

      if (!result.ok) {
        setSavedReportsDeletion({
          ownerKey: request.ownerKey,
          contextEpoch: request.contextEpoch,
          status: "error",
          data: null,
          message: null,
          error: result.error.message,
        });
        return;
      }

      const cleanupResult = detachDeletedSavedReportReferences({
        currentUserId: live.currentUserId,
      });
      setSavedReportsDeletion({
        ownerKey: request.ownerKey,
        contextEpoch: request.contextEpoch,
        status: "success",
        data: result.data,
        message: cleanupResult.failedKeys.length
          ? "Saved reports were deleted from your account. Profile and feedback were preserved, but some local synced references could not be cleaned automatically."
          : "Saved reports were deleted from your account. Profile and feedback were preserved.",
        error: null,
      });
      setShowSavedReportsDialog(false);
      browserSummaryReloadRef.current();
      void loadAccountCounts();
    } catch {
      if (
        isTrustCenterMountedRef.current &&
        isCurrentOwnedRequest(
          request,
          liveRequestContextRef.current,
          activeSavedReportsDeletionRef.current,
        )
      ) {
        setSavedReportsDeletion({
          ownerKey: request.ownerKey,
          contextEpoch: request.contextEpoch,
          status: "error",
          data: null,
          message: null,
          error: "Saved reports could not be deleted right now.",
        });
      }
    } finally {
      if (isSameOwnedRequest(activeSavedReportsDeletionRef.current, request)) {
        activeSavedReportsDeletionRef.current = null;
      }
    }
  }

  async function handleDeleteAccount() {
    const live = liveRequestContextRef.current;
    const activeRequest = activeAccountDeletionRef.current;
    if (activeRequest && isCurrentOwnedRequest(activeRequest, live, activeRequest)) {
      return;
    }

    if (accountDeleteConfirmation !== ACCOUNT_DELETE_CONFIRMATION) {
      publishAccountDeletionState({
        status: "error",
        data: null,
        message: null,
        error: "Type DELETE MY ACCOUNT to confirm.",
      });
      return;
    }

    if (
      !live.ownerKey ||
      typeof live.currentUserId !== "string" ||
      !user?.email ||
      user.id !== live.currentUserId
    ) {
      publishAccountDeletionState({
        status: "error",
        data: null,
        message: null,
        error: "Sign in again before deleting your account.",
      });
      return;
    }

    if (!accountDeletePassword) {
      publishAccountDeletionState({
        status: "error",
        data: null,
        message: null,
        error: "Enter your current password to reauthenticate.",
      });
      return;
    }

    const request: OwnedRequestIdentity = {
      ownerKey: live.ownerKey,
      contextEpoch: live.contextEpoch,
      requestToken: accountDeletionTokenRef.current + 1,
    };
    accountDeletionTokenRef.current = request.requestToken;
    activeAccountDeletionRef.current = request;
    const deletionOwnerId = live.currentUserId;
    const deletionEmail = user.email;
    const password = accountDeletePasswordValueRef.current;
    setAccountDeletionState({
      ownerKey: request.ownerKey,
      contextEpoch: request.contextEpoch,
      status: "loading",
      data: null,
      message: null,
      error: null,
    });

    try {
      const supabase = createSupabaseBrowserClient();
      if (!supabase) {
        if (isCurrentAccountDeletionRequest(request)) {
          publishAccountDeletionState({
            status: "error",
            data: null,
            message: null,
            error: "Account reauthentication is unavailable right now.",
          });
        }
        return;
      }

      const reauthentication = await supabase.auth.signInWithPassword({
        email: deletionEmail,
        password,
      });
      clearAccountDeletePassword();

      if (!isCurrentAccountDeletionRequest(request)) return;
      if (
        reauthentication.error ||
        !reauthentication.data.session?.access_token ||
        reauthentication.data.user?.id !== deletionOwnerId
      ) {
        publishAccountDeletionState({
          status: "error",
          data: null,
          message: null,
          error: "Reauthentication failed. Check your current password and try again.",
        });
        return;
      }

      const accessToken = reauthentication.data.session.access_token;
      let response: Response;
      let payload: unknown;

      try {
        response = await fetch("/api/account/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            confirmation: accountDeleteConfirmation,
          }),
        });
        payload = await response.json().catch(() => null);
      } catch {
        if (isCurrentAccountDeletionRequest(request)) {
          publishAccountDeletionState({
            status: "error",
            data: null,
            message: null,
            error: "Account deletion did not finish. Your session and local data were kept.",
          });
        }
        return;
      }

      const parsedResponse = parseAccountDeletionResponse(response.ok, payload);
      if (!parsedResponse.ok) {
        if (isCurrentAccountDeletionRequest(request)) {
          publishAccountDeletionState({
            status: "error",
            data: null,
            message: null,
            error: parsedResponse.message,
          });
        }
        return;
      }

      const ownerCleanupResult = removeSkillMintOwnerData({
        currentUserId: deletionOwnerId,
      });
      if (!isCurrentAccountDeletionRequest(request)) return;

      const cleanupWarnings = [
        ...(ownerCleanupResult.failedKeys.length
          ? ["Some browser data for the deleted account could not be removed automatically."]
          : []),
        "Automatic local sign-out was skipped so a different provider session could not be signed out by this old request. Review the currently active account and sign out manually before another person uses this browser.",
      ];

      setAccountDeletionState({
        ownerKey: request.ownerKey,
        contextEpoch: request.contextEpoch,
        status: "success",
        data: null,
        message: "Account access was deleted. " +
          `${cleanupWarnings.join(" ")} Anonymous and other-account browser workspaces were intentionally preserved.`,
        error: null,
      });
      setShowAccountDeleteDialog(false);
    } catch {
      if (isCurrentAccountDeletionRequest(request)) {
        publishAccountDeletionState({
          status: "error",
          data: null,
          message: null,
          error: "Account deletion did not finish. Your session and local data were kept.",
        });
      }
    } finally {
      clearAccountDeletePassword();
      if (isSameOwnedRequest(activeAccountDeletionRef.current, request)) {
        activeAccountDeletionRef.current = null;
      }
    }
  }

  function clearAccountDeletePassword() {
    accountDeletePasswordValueRef.current = "";
    setAccountDeletePassword("");
  }

  function isCurrentAccountDeletionRequest(
    request: OwnedRequestIdentity,
  ): boolean {
    return isTrustCenterMountedRef.current && isCurrentOwnedRequest(
      request,
      liveRequestContextRef.current,
      activeAccountDeletionRef.current,
    );
  }

  function publishAccountDeletionState(state: AsyncState<null>) {
    const live = liveRequestContextRef.current;
    setAccountDeletionState({
      ownerKey: live.ownerKey,
      contextEpoch: live.contextEpoch,
      ...state,
    });
  }

  const descriptors = getSkillMintStorageDescriptors();
  const browserSummary = browserPresentation.summary;
  const browserOverviewDetail = browserSummary
    ? `${formatOtherWorkspaceSummary(
        browserSummary.anonymousWorkspaceDataExists,
        browserSummary.otherWorkspaceDataExists,
      )} ${browserSummary.corruptedCount} unreadable item${
        browserSummary.corruptedCount === 1 ? "" : "s"
      }.`
    : browserPresentation.overviewDetail;
  const accountExportLoading = visibleAccountExportState.status === "loading";
  const browserExportPreparing = visibleBrowserNotice.status === "loading" &&
    visibleBrowserNotice.message === "Preparing browser export…";

  return (
    <DashboardLayout>
      <main className={premiumPageStack}>
        <section className={premiumHeroSurface}>
          <p className={premiumEyebrow}>
            Data controls
          </p>

          <h1 className="mt-3 text-4xl font-black md:text-5xl">
            Your data & privacy
          </h1>

          <p className="mt-4 max-w-3xl text-slate-600">
            See what SkillMint stores in this browser and your account.
            Download or remove data without changing Career IQ, Proof
            Confidence, Profile-fit roles, missions, or JD scoring.
          </p>
        </section>

        {shouldOfferImport && (
          <section className={premiumWarningSurface}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <h2 className="text-xl font-black text-amber-950">
                  Anonymous browser workspace found
                </h2>

                <p className="mt-2 max-w-3xl text-sm leading-6 text-amber-900">
                  This browser has anonymous SkillMint data. Keep your account
                  workspace separate, or explicitly import the anonymous data
                  into this signed-in browser workspace.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setImportDismissed(true)}
                  className={premiumSecondaryCta}
                >
                  Keep account workspace
                </button>

                <button
                  type="button"
                  onClick={handleImportAnonymousWorkspace}
                  className={premiumPrimaryCta}
                >
                  Import browser workspace
                </button>
              </div>
            </div>
          </section>
        )}

        {visibleBrowserNotice.status !== "idle" && (
          <StatusPanel
            status={visibleBrowserNotice.status}
            message={visibleBrowserNotice.message}
            error={visibleBrowserNotice.error}
          />
        )}

        <section className="grid gap-5 lg:grid-cols-3">
          <OverviewCard
            label="Authentication"
            value={isAuthLoading
              ? "Checking"
              : user
                ? "Signed in"
                : "Signed out"}
            detail={isAuthLoading
              ? "Checking account session."
              : user?.email ?? "Browser-local mode available."}
          />

          <OverviewCard
            label="This browser"
            value={browserPresentation.overviewValue}
            detail={browserOverviewDetail}
          />

          <OverviewCard
            label="Account sync"
            value={accountCountsPresentation.overviewValue}
            detail="Browser and account data stay separate."
          />
        </section>

        <section className={premiumSurface}>
          <SectionHeader
            eyebrow="This browser"
            title="SkillMint data in this browser"
            body="This list is based on registered SkillMint storage keys only. It never clears unrelated website data."
          />

          <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {descriptors.map((descriptor) => {
              const summaryItem = browserPresentation.status === "ready"
                ? browserPresentation.summary.items.find((item) =>
                    item.descriptor.key === descriptor.key
                  )
                : null;

              return (
                <article
                  key={descriptor.key}
                  className={premiumCompactSurface}
                >
                  <div className="flex flex-wrap gap-2">
                    <span className={premiumBadge}>
                      {descriptor.category}
                    </span>

                    <span className={premiumBadge}>
                      {summaryItem?.status ?? browserPresentation.descriptorStatus}
                    </span>
                  </div>

                  <h3 className="mt-3 break-words text-sm font-black text-slate-950">
                    {descriptor.key}
                  </h3>

                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {descriptor.description}
                  </p>
                </article>
              );
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleBrowserExport}
              disabled={
                !browserPresentation.canExport ||
                visibleBrowserNotice.status === "loading"
              }
              aria-busy={browserExportPreparing}
              className={premiumSecondaryCta}
            >
              {browserExportPreparing
                ? "Preparing browser export…"
                : "Download browser data"}
            </button>

            <button
              type="button"
              onClick={() => setShowBrowserClearDialog(true)}
              className={premiumDangerCta}
            >
              Clear SkillMint data from this browser
            </button>
          </div>
        </section>

        <section className={premiumSurface}>
          <SectionHeader
            eyebrow="Your SkillMint account"
            title="Account-synced data"
            body={user
              ? "These counts are requested through your authenticated account session. They are shown only when the request succeeds."
              : "Sign in to view, download, or delete account-synced data."}
          />

          {accountCountsPresentation.status !== "signed_out" ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <OverviewCard
                  label="Profile"
                  value={accountCountsPresentation.countDisplay.profile}
                  detail="Preserved by Delete saved reports."
                />

                <OverviewCard
                  label="Resume analyses"
                  value={accountCountsPresentation.countDisplay.resumeAnalyses}
                  detail="Deleted by Delete saved reports."
                />

                <OverviewCard
                  label="JD matches"
                  value={accountCountsPresentation.countDisplay.jobMatches}
                  detail="Deleted by Delete saved reports."
                />

                <OverviewCard
                  label="Career snapshots"
                  value={accountCountsPresentation.countDisplay.careerSnapshots}
                  detail="Deleted by Delete saved reports."
                />

                <OverviewCard
                  label="Feedback"
                  value={accountCountsPresentation.countDisplay.betaFeedback}
                  detail="Preserved by Delete saved reports."
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleAccountExport}
                  disabled={!accountCountsPresentation.canExport || accountExportLoading}
                  aria-busy={accountExportLoading}
                  className={premiumSecondaryCta}
                >
                  {accountExportLoading
                    ? "Preparing account export…"
                    : "Download account data"}
                </button>

                <Link
                  href="/resume"
                  className={premiumSecondaryCta}
                >
                  Manage saved resumes
                </Link>

                <Link
                  href="/ats"
                  className={premiumSecondaryCta}
                >
                  Manage saved JD matches
                </Link>
              </div>
            </>
          ) : (
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/login"
                className={premiumPrimaryCta}
              >
                Log in
              </Link>

              <Link
                href="/signup"
                className={premiumSecondaryCta}
              >
                Create account
              </Link>
            </div>
          )}

          {accountCountsPresentation.status === "error" && (
            <StatusPanel
              status="error"
              message={null}
              error={accountCountsPresentation.error}
            />
          )}

          {visibleAccountExportState.status !== "idle" && (
            <StatusPanel
              status={visibleAccountExportState.status}
              message={visibleAccountExportState.message}
              error={visibleAccountExportState.error}
            />
          )}
        </section>

        <section className={premiumSurface}>
          <SectionHeader
            eyebrow="Career information"
            title="How SkillMint uses career data"
            body="SkillMint interprets resume, JD, proof, target, and mission data to show gaps and next actions. It does not use data controls as a scoring shortcut."
          />

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {[
              "Resume content is interpreted to generate career signals.",
              "Evidence links are evidence candidates unless independently validated.",
              "Active Target focuses recommendations and does not change core scores.",
              "Latest JD Match applies to one JD and one resume context.",
              "Career IQ is not a hiring guarantee or placement probability.",
              "Exporting, clearing, or deleting data does not improve scores.",
            ].map((item) => (
              <p
                key={item}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700"
              >
                {item}
              </p>
            ))}
          </div>
        </section>

        <section className={premiumDangerSurface}>
          <SectionHeader
            eyebrow="Danger zone"
            title="Remove account-synced data"
            body="These actions are separate from ordinary browser clearing. Use them only when you want to remove saved account records."
          />

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <DangerAction
              title="Delete saved reports"
              body="Deletes synced resume analyses, JD matches, and career snapshots. Keeps your account, profile, and feedback; only broken synced browser references are detached."
              actionLabel="Delete saved reports"
              disabled={!user || visibleSavedReportsDeletion.status === "loading"}
              onClick={() => setShowSavedReportsDialog(true)}
            />

            <DangerAction
              title="Delete SkillMint account"
              body="Requests account-access deletion through the server admin boundary. Live database cascades, feedback deletion, backups, and logs still require operational verification."
              actionLabel="Delete SkillMint account"
              disabled={!user || visibleAccountDeletionState.status === "loading"}
              onClick={() => {
                accountDeletePasswordValueRef.current = "";
                setAccountDeletePassword("");
                setAccountDeleteConfirmation("");
                setShowAccountDeleteDialog(true);
              }}
            />
          </div>

          {visibleSavedReportsDeletion.status === "success" && (
            <p role="status" className="mt-4 rounded-xl border border-emerald-200 bg-white p-3 text-sm leading-6 text-emerald-800">
              {visibleSavedReportsDeletion.message} Resume analyses deleted:
              {" "}{visibleSavedReportsDeletion.data.resumeAnalysesDeleted}; JD matches
              deleted: {visibleSavedReportsDeletion.data.jobMatchesDeleted}; career
              snapshots deleted: {visibleSavedReportsDeletion.data.careerSnapshotsDeleted}.
            </p>
          )}

          {visibleSavedReportsDeletion.status === "error" && (
            <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-white p-3 text-sm leading-6 text-rose-800">
              {visibleSavedReportsDeletion.error}
            </p>
          )}

          {visibleAccountDeletionState.status === "error" && (
            <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-white p-3 text-sm leading-6 text-rose-800">
              {visibleAccountDeletionState.error}
            </p>
          )}

          {visibleAccountDeletionState.status === "success" && (
            <p
              role="status"
              className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-950"
            >
              {visibleAccountDeletionState.message}
            </p>
          )}
        </section>

        <ConfirmDialog
          isOpen={showBrowserClearDialog}
          title="Clear SkillMint data from this browser"
          confirmLabel="Clear browser data"
          onConfirm={handleClearBrowserData}
          onClose={() => setShowBrowserClearDialog(false)}
        >
          <p>
            This removes the current local workspace, signed-out or unassigned
            SkillMint workspace data, and other SkillMint account workspaces
            stored in this browser. It includes browser resume, JD, Active Target,
            mission, setup, feedback, and preference state.
          </p>
          <p className="mt-3 font-semibold">
            It does not delete your SkillMint account or account-synced
            records.
          </p>
        </ConfirmDialog>

        <ConfirmDialog
          isOpen={visibleShowSavedReportsDialog}
          title="Delete saved reports"
          confirmLabel="Delete saved reports"
          isProcessing={visibleSavedReportsDeletion.status === "loading"}
          onConfirm={handleDeleteSavedReports}
          onClose={() => setShowSavedReportsDialog(false)}
        >
          <ul className="list-disc space-y-2 pl-5">
            <li>Deletes synced resume analyses.</li>
            <li>Deletes synced JD matches.</li>
            <li>Deletes synced career snapshots.</li>
            <li>Preserves your account, profile, feedback, and browser data except broken synced references.</li>
            <li>Detaches broken synced references from this browser.</li>
          </ul>
        </ConfirmDialog>

        <ConfirmDialog
          isOpen={visibleShowAccountDeleteDialog}
          title="Delete SkillMint account"
          confirmLabel="Delete SkillMint account"
          isProcessing={visibleAccountDeletionState.status === "loading"}
          confirmDisabled={
            accountDeleteConfirmation !== ACCOUNT_DELETE_CONFIRMATION
          }
          onConfirm={handleDeleteAccount}
          initialFocusRef={accountDeleteConfirmationInputRef}
          onClose={() => {
            clearAccountDeletePassword();
            setAccountDeleteConfirmation("");
            setShowAccountDeleteDialog(false);
          }}
        >
          <ul className="list-disc space-y-2 pl-5">
            <li>Your current password is sent directly to the authentication provider for a fresh sign-in and is never sent to SkillMint’s deletion API.</li>
            <li>SkillMint will request removal of account access through its server boundary.</li>
            <li>Profile, saved-report, and feedback cascade behavior is declared in local schema files but is not yet verified against live infrastructure.</li>
            <li>Only this account’s SkillMint browser partitions will be removed after success.</li>
            <li>Anonymous and other-account browser workspaces will be preserved.</li>
            <li>Automatic local sign-out is skipped after success; review the active account and sign out manually.</li>
            <li>Provider backups and service logs may retain data under their own policies.</li>
            <li>This action cannot be undone through the UI.</li>
          </ul>

          <label
            htmlFor="account-delete-password"
            className="mt-5 block text-sm font-bold text-slate-950"
          >
            Current password
          </label>

          <input
            id="account-delete-password"
            type="password"
            autoComplete="current-password"
            value={accountDeletePassword}
            onChange={(event) => {
              accountDeletePasswordValueRef.current = event.target.value;
              setAccountDeletePassword(event.target.value);
            }}
            className="mt-2 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
          />

          <label
            htmlFor="account-delete-confirmation"
            className="mt-5 block text-sm font-bold text-slate-950"
          >
            Type DELETE MY ACCOUNT
          </label>

          <input
            ref={accountDeleteConfirmationInputRef}
            id="account-delete-confirmation"
            value={accountDeleteConfirmation}
            onChange={(event) => setAccountDeleteConfirmation(event.target.value)}
            className="mt-2 w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-rose-500 focus:ring-4 focus:ring-rose-100"
          />
        </ConfirmDialog>
      </main>
    </DashboardLayout>
  );
}

function SectionHeader({
  eyebrow,
  title,
  body,
}: {
  eyebrow: string;
  title: string;
  body: string;
}) {
  return (
    <div>
      <p className={premiumEyebrow}>
        {eyebrow}
      </p>

      <h2 className="mt-2 text-2xl font-black text-slate-950">
        {title}
      </h2>

      <p className={`mt-3 max-w-3xl ${premiumMutedText}`}>
        {body}
      </p>
    </div>
  );
}

function OverviewCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <article className={premiumCompactSurface}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-xl font-black text-slate-950">
        {value}
      </p>

      <p className="mt-2 break-words text-sm leading-6 text-slate-600">
        {detail}
      </p>
    </article>
  );
}

function DangerAction({
  title,
  body,
  actionLabel,
  disabled,
  onClick,
}: {
  title: string;
  body: string;
  actionLabel: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <article className="rounded-2xl border border-rose-200 bg-white p-5">
      <h3 className="text-lg font-black text-slate-950">
        {title}
      </h3>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {body}
      </p>

      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={`${premiumDangerCta} mt-4`}
      >
        {actionLabel}
      </button>
    </article>
  );
}

function StatusPanel({
  status,
  message,
  error,
}: {
  status: ActionNotice["status"];
  message: string | null;
  error: string | null;
}) {
  const content = error ?? message;
  if (!content || status === "idle") return null;

  return (
    <section
      role={status === "error" ? "alert" : "status"}
      aria-live={status === "error" ? "assertive" : "polite"}
      className={error ? premiumDangerSurface : premiumCompactSurface}
    >
      <p className="text-sm font-semibold">
        {error ?? message}
      </p>
    </section>
  );
}

function isSameOwnedRequest(
  left: OwnedRequestIdentity | null,
  right: OwnedRequestIdentity,
): boolean {
  return left !== null &&
    left.ownerKey === right.ownerKey &&
    left.contextEpoch === right.contextEpoch &&
    left.requestToken === right.requestToken;
}
