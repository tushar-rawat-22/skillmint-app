"use client";

/* eslint-disable react-hooks/refs -- Owner epochs read the last committed context during render so stale account state is synchronously masked before layout effects commit the next live context. */

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import {
  premiumCompactSurface,
  premiumEyebrow,
  premiumHeroSurface,
  premiumInsetSurface,
  premiumPageStack,
  premiumPrimaryCta,
  premiumSecondaryCta,
  premiumSurface,
} from "@/components/ui/premium";
import { ROUTES } from "@/constants/routes";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import ResumeComparisonView from "@/modules/resume/components/ResumeComparisonView";
import {
  compareResumeEvidence,
  listCurrentUserResumeAnalysisPage,
  resolveCurrentUserResumeAnalysisPair,
  type ResumeAnalysisPage,
  type ResumeAnalysisPageCursor,
  type ResumeAnalysisPageItem,
  type ResumeComparisonRepositoryErrorCode,
  type ResumeEvidenceComparison,
} from "@/modules/resume";

type ComparisonOwnerContext = {
  ownerKey: string | null;
  contextEpoch: number;
  currentUserId: string | null | undefined;
  isAuthLoading: boolean;
  isConfigured: boolean;
};

type OwnedRequest = {
  ownerKey: string;
  contextEpoch: number;
  requestToken: number;
};

type HistoryState = {
  ownerKey: string | null;
  contextEpoch: number;
  status: "idle" | "loading" | "success" | "error";
  page: ResumeAnalysisPage | null;
  cursor: ResumeAnalysisPageCursor | null;
  backStack: Array<ResumeAnalysisPageCursor | null>;
  errorCode: ResumeComparisonRepositoryErrorCode | null;
};

type SelectionState = {
  ownerKey: string | null;
  contextEpoch: number;
  sourceA: ResumeAnalysisPageItem | null;
  sourceB: ResumeAnalysisPageItem | null;
};

type ComparisonState = {
  ownerKey: string | null;
  contextEpoch: number;
  status: "idle" | "loading" | "success" | "error";
  comparison: ResumeEvidenceComparison | null;
  errorCode: ResumeComparisonRepositoryErrorCode | null;
};

const COMPARISON_ERROR_COPY: Record<
  ResumeComparisonRepositoryErrorCode,
  string
> = {
  unauthenticated: "Sign in again to compare saved reports.",
  invalid_pair: "Choose exactly two valid saved reports.",
  duplicate_source: "Source A and Source B must be different saved reports.",
  invalid_cursor: "This history page is unavailable. Return to the first page.",
  source_missing:
    "One or both selected reports are no longer available. Replace a source and try again.",
  malformed_source:
    "One or both selected reports could not be safely read. Replace a source and try again.",
  owner_changed:
    "The signed-in account changed. Saved report state was cleared.",
  repository_failure:
    "Saved report data is temporarily unavailable. Try again.",
};

export default function ResumeComparisonPage() {
  const {
    user,
    isConfigured,
    isLoading: isAuthLoading,
  } = useAuthSession();
  const currentUserId = isAuthLoading ? undefined : user?.id ?? null;
  const ownerKey = typeof currentUserId === "string"
    ? `resume-comparison:account:${currentUserId}`
    : null;
  const committedOwnerContextRef = useRef<ComparisonOwnerContext>({
    ownerKey: null,
    contextEpoch: 0,
    currentUserId: undefined,
    isAuthLoading: true,
    isConfigured,
  });
  const previousOwnerContext = committedOwnerContextRef.current;
  const ownerContextChanged =
    previousOwnerContext.ownerKey !== ownerKey ||
    previousOwnerContext.isAuthLoading !== isAuthLoading ||
    previousOwnerContext.isConfigured !== isConfigured;
  const currentContextEpoch = ownerContextChanged
    ? previousOwnerContext.contextEpoch + 1
    : previousOwnerContext.contextEpoch;
  const liveOwnerContextRef = useRef<ComparisonOwnerContext>({
    ownerKey: null,
    contextEpoch: 0,
    currentUserId: undefined,
    isAuthLoading: true,
    isConfigured,
  });
  const isMountedRef = useRef(true);
  const historyTokenRef = useRef(0);
  const comparisonTokenRef = useRef(0);
  const activeHistoryRequestRef = useRef<OwnedRequest | null>(null);
  const activeComparisonRequestRef = useRef<OwnedRequest | null>(null);
  const comparisonResultRef = useRef<HTMLDivElement | null>(null);
  const comparisonErrorRef = useRef<HTMLDivElement | null>(null);

  const [historyState, setHistoryState] = useState<HistoryState>(
    createIdleHistoryState(null, 0),
  );
  const [selectionState, setSelectionState] = useState<SelectionState>(
    createEmptySelectionState(null, 0),
  );
  const [comparisonState, setComparisonState] = useState<ComparisonState>(
    createIdleComparisonState(null, 0),
  );

  useLayoutEffect(() => {
    const nextContext: ComparisonOwnerContext = {
      ownerKey,
      contextEpoch: currentContextEpoch,
      currentUserId,
      isAuthLoading,
      isConfigured,
    };
    committedOwnerContextRef.current = nextContext;
    liveOwnerContextRef.current = nextContext;

    if (ownerContextChanged) {
      historyTokenRef.current += 1;
      comparisonTokenRef.current += 1;
      activeHistoryRequestRef.current = null;
      activeComparisonRequestRef.current = null;
    }
  }, [
    currentContextEpoch,
    currentUserId,
    isAuthLoading,
    isConfigured,
    ownerContextChanged,
    ownerKey,
  ]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      historyTokenRef.current += 1;
      comparisonTokenRef.current += 1;
      activeHistoryRequestRef.current = null;
      activeComparisonRequestRef.current = null;
    };
  }, []);

  const visibleHistoryState =
    historyState.ownerKey === ownerKey &&
      historyState.contextEpoch === currentContextEpoch
      ? historyState
      : createIdleHistoryState(ownerKey, currentContextEpoch);
  const visibleSelectionState =
    selectionState.ownerKey === ownerKey &&
      selectionState.contextEpoch === currentContextEpoch
      ? selectionState
      : createEmptySelectionState(ownerKey, currentContextEpoch);
  const visibleComparisonState =
    comparisonState.ownerKey === ownerKey &&
      comparisonState.contextEpoch === currentContextEpoch
      ? comparisonState
      : createIdleComparisonState(ownerKey, currentContextEpoch);

  const loadHistoryPage = useCallback(async (
    cursor: ResumeAnalysisPageCursor | null,
    backStack: Array<ResumeAnalysisPageCursor | null>,
  ) => {
    const live = liveOwnerContextRef.current;
    if (
      !live.isConfigured ||
      live.isAuthLoading ||
      !live.ownerKey ||
      typeof live.currentUserId !== "string"
    ) {
      return;
    }

    const request: OwnedRequest = {
      ownerKey: live.ownerKey,
      contextEpoch: live.contextEpoch,
      requestToken: historyTokenRef.current + 1,
    };
    historyTokenRef.current = request.requestToken;
    activeHistoryRequestRef.current = request;
    setHistoryState({
      ownerKey: request.ownerKey,
      contextEpoch: request.contextEpoch,
      status: "loading",
      page: null,
      cursor,
      backStack,
      errorCode: null,
    });

    try {
      const result = await listCurrentUserResumeAnalysisPage(cursor, {
        expectedUserId: live.currentUserId,
      });
      if (
        !isMountedRef.current ||
        !isCurrentRequest(
          request,
          liveOwnerContextRef.current,
          activeHistoryRequestRef.current,
        )
      ) {
        return;
      }

      if (!result.ok) {
        setHistoryState({
          ownerKey: request.ownerKey,
          contextEpoch: request.contextEpoch,
          status: "error",
          page: null,
          cursor,
          backStack,
          errorCode: result.code,
        });
        return;
      }

      setHistoryState({
        ownerKey: request.ownerKey,
        contextEpoch: request.contextEpoch,
        status: "success",
        page: result.data,
        cursor,
        backStack,
        errorCode: null,
      });
    } catch {
      if (
        !isMountedRef.current ||
        !isCurrentRequest(
          request,
          liveOwnerContextRef.current,
          activeHistoryRequestRef.current,
        )
      ) {
        return;
      }
      setHistoryState({
        ownerKey: request.ownerKey,
        contextEpoch: request.contextEpoch,
        status: "error",
        page: null,
        cursor,
        backStack,
        errorCode: "repository_failure",
      });
    } finally {
      if (isSameRequest(activeHistoryRequestRef.current, request)) {
        activeHistoryRequestRef.current = null;
      }
    }
  }, []);

  useEffect(() => {
    if (
      !isConfigured ||
      isAuthLoading ||
      !ownerKey ||
      typeof currentUserId !== "string"
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadHistoryPage(null, []);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [
    currentContextEpoch,
    currentUserId,
    isAuthLoading,
    isConfigured,
    loadHistoryPage,
    ownerKey,
  ]);

  useEffect(() => {
    if (visibleComparisonState.status === "success") {
      comparisonResultRef.current?.focus();
    } else if (visibleComparisonState.status === "error") {
      comparisonErrorRef.current?.focus();
    }
  }, [visibleComparisonState.status]);

  function clearPublishedComparison(
    live: ComparisonOwnerContext,
  ) {
    comparisonTokenRef.current += 1;
    activeComparisonRequestRef.current = null;
    setComparisonState(
      createIdleComparisonState(live.ownerKey, live.contextEpoch),
    );
  }

  function assignSource(
    slot: "sourceA" | "sourceB",
    item: ResumeAnalysisPageItem,
  ) {
    const live = liveOwnerContextRef.current;
    if (!live.ownerKey || live.ownerKey !== ownerKey) {
      return;
    }

    const current = visibleSelectionState;
    const other = slot === "sourceA" ? current.sourceB : current.sourceA;
    if (other?.id === item.id) {
      return;
    }

    setSelectionState({
      ownerKey: live.ownerKey,
      contextEpoch: live.contextEpoch,
      sourceA: slot === "sourceA" ? item : current.sourceA,
      sourceB: slot === "sourceB" ? item : current.sourceB,
    });
    clearPublishedComparison(live);
  }

  function clearSource(slot: "sourceA" | "sourceB") {
    const live = liveOwnerContextRef.current;
    if (!live.ownerKey || live.ownerKey !== ownerKey) {
      return;
    }
    setSelectionState({
      ...visibleSelectionState,
      ownerKey: live.ownerKey,
      contextEpoch: live.contextEpoch,
      [slot]: null,
    });
    clearPublishedComparison(live);
  }

  async function runComparison() {
    const live = liveOwnerContextRef.current;
    const { sourceA, sourceB } = visibleSelectionState;
    if (
      !live.ownerKey ||
      typeof live.currentUserId !== "string" ||
      !sourceA ||
      !sourceB ||
      sourceA.id === sourceB.id
    ) {
      return;
    }

    const request: OwnedRequest = {
      ownerKey: live.ownerKey,
      contextEpoch: live.contextEpoch,
      requestToken: comparisonTokenRef.current + 1,
    };
    comparisonTokenRef.current = request.requestToken;
    activeComparisonRequestRef.current = request;
    setComparisonState({
      ownerKey: request.ownerKey,
      contextEpoch: request.contextEpoch,
      status: "loading",
      comparison: null,
      errorCode: null,
    });

    try {
      const result = await resolveCurrentUserResumeAnalysisPair(
        [sourceA.id, sourceB.id],
        {
          expectedUserId: live.currentUserId,
        },
      );
      if (
        !isMountedRef.current ||
        !isCurrentRequest(
          request,
          liveOwnerContextRef.current,
          activeComparisonRequestRef.current,
        )
      ) {
        return;
      }

      if (!result.ok) {
        setComparisonState({
          ownerKey: request.ownerKey,
          contextEpoch: request.contextEpoch,
          status: "error",
          comparison: null,
          errorCode: result.code,
        });
        return;
      }

      const comparison = compareResumeEvidence(
        result.data.sourceA,
        result.data.sourceB,
      );
      if (
        !isMountedRef.current ||
        !isCurrentRequest(
          request,
          liveOwnerContextRef.current,
          activeComparisonRequestRef.current,
        )
      ) {
        return;
      }

      setComparisonState({
        ownerKey: request.ownerKey,
        contextEpoch: request.contextEpoch,
        status: "success",
        comparison,
        errorCode: null,
      });
    } catch {
      if (
        !isMountedRef.current ||
        !isCurrentRequest(
          request,
          liveOwnerContextRef.current,
          activeComparisonRequestRef.current,
        )
      ) {
        return;
      }
      setComparisonState({
        ownerKey: request.ownerKey,
        contextEpoch: request.contextEpoch,
        status: "error",
        comparison: null,
        errorCode: "repository_failure",
      });
    } finally {
      if (isSameRequest(activeComparisonRequestRef.current, request)) {
        activeComparisonRequestRef.current = null;
      }
    }
  }

  const selectedCount = Number(Boolean(visibleSelectionState.sourceA)) +
    Number(Boolean(visibleSelectionState.sourceB));
  const canCompare =
    selectedCount === 2 &&
    visibleSelectionState.sourceA?.id !==
      visibleSelectionState.sourceB?.id &&
    visibleComparisonState.status !== "loading";

  return (
    <DashboardLayout>
      <div className={premiumPageStack}>
        <header className={premiumHeroSurface}>
          <p className={premiumEyebrow}>Resume comparison</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Compare saved report evidence
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
            Compare what was detected in two saved reports. This view does not
            predict hiring outcomes.
          </p>
        </header>

        {isAuthLoading ? (
          <StatePanel
            role="status"
            title="Checking your account"
            message="Saved report history will appear after authentication resolves."
          />
        ) : !isConfigured ? (
          <StatePanel
            role="alert"
            title="Saved reports are unavailable"
            message="Account sync is not configured in this environment."
          />
        ) : !user ? (
          <section className={premiumSurface}>
            <h2 className="text-2xl font-black text-slate-950">
              Sign in to compare saved reports
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Personal report history is hidden while signed out.
            </p>
            <Link href={ROUTES.LOGIN} className={`mt-5 ${premiumPrimaryCta}`}>
              Sign in
            </Link>
          </section>
        ) : (
          <>
            <SourceSelectionPanel
              selection={visibleSelectionState}
              selectedCount={selectedCount}
              onClear={clearSource}
            />

            <HistoryPanel
              history={visibleHistoryState}
              selection={visibleSelectionState}
              onAssign={assignSource}
              onBack={() => {
                const previousCursor =
                  visibleHistoryState.backStack.at(-1) ?? null;
                void loadHistoryPage(
                  previousCursor,
                  visibleHistoryState.backStack.slice(0, -1),
                );
              }}
              onNext={() => {
                const nextCursor =
                  visibleHistoryState.page?.nextCursor ?? null;
                if (!nextCursor) {
                  return;
                }
                void loadHistoryPage(nextCursor, [
                  ...visibleHistoryState.backStack,
                  visibleHistoryState.cursor,
                ]);
              }}
              onRetry={() => {
                void loadHistoryPage(
                  visibleHistoryState.cursor,
                  visibleHistoryState.backStack,
                );
              }}
            />

            <section className={premiumCompactSurface}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">
                    Compare the selected reports
                  </h2>
                  <p
                    id="compare-disabled-explanation"
                    className="mt-1 text-sm leading-6 text-slate-600"
                  >
                    {canCompare
                      ? "Both source slots are ready."
                      : "Assign two different saved reports before comparing."}
                  </p>
                </div>
                <button
                  type="button"
                  className={premiumPrimaryCta}
                  disabled={!canCompare}
                  aria-describedby="compare-disabled-explanation"
                  onClick={() => void runComparison()}
                >
                  {visibleComparisonState.status === "loading"
                    ? "Comparing reports"
                    : "Compare"}
                </button>
              </div>
            </section>

            {visibleComparisonState.status === "loading" && (
              <StatePanel
                role="status"
                title="Comparing saved evidence"
                message="The two selected reports are being safely refetched."
              />
            )}

            {visibleComparisonState.status === "error" && (
              <div
                ref={comparisonErrorRef}
                tabIndex={-1}
                role="alert"
                className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-950 outline-none focus-visible:ring-4 focus-visible:ring-rose-200"
              >
                <h2 className="text-xl font-black">Comparison unavailable</h2>
                <p className="mt-2 text-sm leading-6">
                  {COMPARISON_ERROR_COPY[
                    visibleComparisonState.errorCode ??
                      "repository_failure"
                  ]}
                </p>
              </div>
            )}

            {visibleComparisonState.status === "success" &&
              visibleComparisonState.comparison && (
                <div
                  ref={comparisonResultRef}
                  tabIndex={-1}
                  aria-live="polite"
                  className="outline-none focus-visible:ring-4 focus-visible:ring-emerald-200"
                >
                  <ResumeComparisonView
                    comparison={visibleComparisonState.comparison}
                    isRefreshing={false}
                    onRefresh={() => void runComparison()}
                  />
                </div>
              )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function SourceSelectionPanel({
  selection,
  selectedCount,
  onClear,
}: {
  selection: SelectionState;
  selectedCount: number;
  onClear: (slot: "sourceA" | "sourceB") => void;
}) {
  return (
    <fieldset className={premiumSurface}>
      <legend className="px-1 text-xl font-black text-slate-950">
        Choose two sources
      </legend>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-6 text-slate-600">
          Explicitly assign one saved report to each slot.
        </p>
        <p
          role="status"
          aria-live="polite"
          className="text-sm font-bold text-emerald-800"
        >
          {selectedCount} of 2 selected
        </p>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <SelectedSourceCard
          item={selection.sourceA}
          label="Source A"
          onClear={() => onClear("sourceA")}
        />
        <SelectedSourceCard
          item={selection.sourceB}
          label="Source B"
          onClear={() => onClear("sourceB")}
        />
      </div>
    </fieldset>
  );
}

function SelectedSourceCard({
  item,
  label,
  onClear,
}: {
  item: ResumeAnalysisPageItem | null;
  label: "Source A" | "Source B";
  onClear: () => void;
}) {
  return (
    <article className={premiumInsetSurface}>
      <h3 className="font-black text-slate-950">{label}</h3>
      {item ? (
        <>
          <p className="mt-2 break-words text-sm font-bold text-slate-800">
            {item.fileName}
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Saved date:{" "}
            <time dateTime={item.savedAt}>{formatSavedDate(item.savedAt)}</time>
          </p>
          <p className="mt-1 text-sm text-slate-600">
            Analysis version was not recorded.
          </p>
          <button
            type="button"
            className={`mt-4 ${premiumSecondaryCta}`}
            onClick={onClear}
          >
            Clear {label}
          </button>
        </>
      ) : (
        <p className="mt-2 text-sm leading-6 text-slate-500">
          No saved report assigned.
        </p>
      )}
    </article>
  );
}

function HistoryPanel({
  history,
  selection,
  onAssign,
  onBack,
  onNext,
  onRetry,
}: {
  history: HistoryState;
  selection: SelectionState;
  onAssign: (
    slot: "sourceA" | "sourceB",
    item: ResumeAnalysisPageItem,
  ) => void;
  onBack: () => void;
  onNext: () => void;
  onRetry: () => void;
}) {
  if (history.status === "idle" || history.status === "loading") {
    return (
      <StatePanel
        role="status"
        title="Loading saved report history"
        message="Loading one bounded history page."
      />
    );
  }

  if (history.status === "error") {
    return (
      <section role="alert" className={premiumSurface}>
        <h2 className="text-xl font-black text-slate-950">
          Saved report history unavailable
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          {COMPARISON_ERROR_COPY[
            history.errorCode ?? "repository_failure"
          ]}
        </p>
        <button
          type="button"
          className={`mt-4 ${premiumSecondaryCta}`}
          onClick={onRetry}
        >
          Retry this page
        </button>
      </section>
    );
  }

  const items = history.page?.items ?? [];
  if (items.length === 0 && history.backStack.length === 0) {
    return (
      <StatePanel
        role="status"
        title="No saved reports"
        message="There are no saved resume analyses available to compare."
      />
    );
  }

  return (
    <section aria-labelledby="history-heading" className={premiumSurface}>
      <div>
        <p className={premiumEyebrow}>Resume History</p>
        <h2 id="history-heading" className="mt-2 text-2xl font-black">
          Saved resume analyses
        </h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          This page shows at most ten saved reports. Assign sources explicitly;
          Workspace and browser-active reports are not selected automatically.
        </p>
      </div>

      {items.length === 1 && history.backStack.length === 0 && (
        <p
          role="status"
          className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
        >
          One saved report is available. A comparison requires two different
          saved reports.
        </p>
      )}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {items.map((item) => {
          const isSourceA = selection.sourceA?.id === item.id;
          const isSourceB = selection.sourceB?.id === item.id;
          return (
            <article key={item.id} className={premiumInsetSurface}>
              <h3 className="break-words font-bold text-slate-950">
                {item.fileName}
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Saved date:{" "}
                <time dateTime={item.savedAt}>
                  {formatSavedDate(item.savedAt)}
                </time>
              </p>
              <p className="mt-1 text-sm text-slate-600">
                Analysis version was not recorded.
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  className={premiumSecondaryCta}
                  disabled={isSourceB}
                  aria-pressed={isSourceA}
                  onClick={() => onAssign("sourceA", item)}
                >
                  {isSourceA
                    ? "Assigned to Source A"
                    : isSourceB
                      ? "Already Source B"
                      : "Assign to Source A"}
                </button>
                <button
                  type="button"
                  className={premiumSecondaryCta}
                  disabled={isSourceA}
                  aria-pressed={isSourceB}
                  onClick={() => onAssign("sourceB", item)}
                >
                  {isSourceB
                    ? "Assigned to Source B"
                    : isSourceA
                      ? "Already Source A"
                      : "Assign to Source B"}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <nav
        aria-label="Saved report history pages"
        className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <button
          type="button"
          className={premiumSecondaryCta}
          disabled={history.backStack.length === 0}
          onClick={onBack}
        >
          Back
        </button>
        <p className="text-center text-sm text-slate-500">
          {items.length} report{items.length === 1 ? "" : "s"} on this page
        </p>
        <button
          type="button"
          className={premiumSecondaryCta}
          disabled={!history.page?.hasNext}
          onClick={onNext}
        >
          Next
        </button>
      </nav>
    </section>
  );
}

function StatePanel({
  role,
  title,
  message,
}: {
  role: "alert" | "status";
  title: string;
  message: string;
}) {
  return (
    <section
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      className={premiumSurface}
    >
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{message}</p>
    </section>
  );
}

function createIdleHistoryState(
  ownerKey: string | null,
  contextEpoch: number,
): HistoryState {
  return {
    ownerKey,
    contextEpoch,
    status: "idle",
    page: null,
    cursor: null,
    backStack: [],
    errorCode: null,
  };
}

function createEmptySelectionState(
  ownerKey: string | null,
  contextEpoch: number,
): SelectionState {
  return {
    ownerKey,
    contextEpoch,
    sourceA: null,
    sourceB: null,
  };
}

function createIdleComparisonState(
  ownerKey: string | null,
  contextEpoch: number,
): ComparisonState {
  return {
    ownerKey,
    contextEpoch,
    status: "idle",
    comparison: null,
    errorCode: null,
  };
}

function isCurrentRequest(
  request: OwnedRequest,
  live: ComparisonOwnerContext,
  active: OwnedRequest | null,
): boolean {
  return live.ownerKey === request.ownerKey &&
    live.contextEpoch === request.contextEpoch &&
    isSameRequest(active, request);
}

function isSameRequest(
  left: OwnedRequest | null,
  right: OwnedRequest,
): boolean {
  return Boolean(left) &&
    left?.ownerKey === right.ownerKey &&
    left.contextEpoch === right.contextEpoch &&
    left.requestToken === right.requestToken;
}

function formatSavedDate(value: string): string {
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) {
    return "Unavailable";
  }
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(parsed);
}
