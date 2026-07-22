"use client";

/* eslint-disable react-hooks/refs -- Feedback request identity must update during render so async completions cannot publish across a committed owner transition. */
/* eslint-disable react-hooks/set-state-in-effect -- Private draft and status are deliberately cleared after authentication ownership changes. */

import {
  type FormEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { usePathname } from "next/navigation";

import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import {
  FEEDBACK_ACCOUNT_FALLBACK_COPY,
  FEEDBACK_ACCOUNT_SUCCESS_COPY,
  FEEDBACK_AUTH_UNRESOLVED_COPY,
  FEEDBACK_DUAL_FAILURE_COPY,
  FEEDBACK_SIGNED_OUT_SUCCESS_COPY,
  MAX_FEEDBACK_LENGTH,
  accountFeedbackFailure,
  getFeedbackOwnerContext,
  isCurrentFeedbackRequest,
  isSafePersistedAccountFailureCode,
  isSameFeedbackRequest,
  localFeedbackFailure,
  normalizeFeedbackInput,
  type FeedbackLiveContext,
  type FeedbackOwnerKey,
  type FeedbackRequestIdentity,
} from "@/modules/feedback/feedbackReliability";
import { saveFeedbackLocally } from "@/modules/feedback/services/feedbackLocalStorage";
import { submitBetaFeedback } from "@/modules/feedback/services/feedbackRepository";
import type {
  FeedbackSentiment,
  FeedbackType,
  RepositoryResult,
  PersistedBetaFeedback,
} from "@/modules/feedback/types";
import {
  fireAndForgetAnalytics,
  getAnalyticsSourceScreen,
  getBrowserAnalyticsRuntime,
} from "@/platform/analytics";

type FeedbackStatusTone = "idle" | "loading" | "success" | "warning" | "error";
type FeedbackStatus = {
  ownerKey: FeedbackOwnerKey | null;
  contextEpoch: number;
  tone: FeedbackStatusTone;
  message: string;
};

type FeedbackWidgetLiveContext = FeedbackLiveContext & {
  accountUserId: string | null;
};

type FeedbackCommittedContext = {
  ownerKey: FeedbackOwnerKey | null;
  contextEpoch: number;
};

const feedbackTypeOptions: Array<{ value: FeedbackType; label: string }> = [
  { value: "bug", label: "Bug" },
  { value: "confusion", label: "Confusion" },
  { value: "ui", label: "UI issue" },
  { value: "idea", label: "Feature idea" },
  { value: "other", label: "Other" },
];

const sentimentOptions: Array<{ value: FeedbackSentiment; label: string }> = [
  { value: "negative", label: "Negative" },
  { value: "neutral", label: "Neutral" },
  { value: "positive", label: "Positive" },
];

const IDLE_STATUS: FeedbackStatus = {
  ownerKey: null,
  contextEpoch: 0,
  tone: "idle",
  message: "",
};

export default function FeedbackWidget() {
  const { user, isLoading: isAuthLoading } = useAuthSession();
  const pathname = usePathname();
  const currentUserId = isAuthLoading ? undefined : user?.id ?? null;
  const analytics = getBrowserAnalyticsRuntime({
    isAuthResolved: !isAuthLoading,
    hasAccount: Boolean(user),
  });
  const analyticsSourceScreen = getAnalyticsSourceScreen(pathname);
  const ownerContext = getFeedbackOwnerContext(currentUserId);
  const ownerKey = ownerContext?.ownerKey ?? null;
  const accountUserId = ownerContext?.accountUserId ?? null;
  const committedContextRef = useRef<FeedbackCommittedContext>({
    ownerKey: null,
    contextEpoch: 0,
  });
  const committedContext = committedContextRef.current;
  const contextChanged = committedContext.ownerKey !== ownerKey;
  const contextEpoch = contextChanged
    ? committedContext.contextEpoch + 1
    : committedContext.contextEpoch;
  const liveContextRef = useRef<FeedbackWidgetLiveContext>({
    isMounted: false,
    ownerKey: null,
    contextEpoch: 0,
    accountUserId: null,
  });

  const requestTokenRef = useRef(0);
  const activeRequestRef = useRef<FeedbackRequestIdentity | null>(null);
  const panelId = useId();
  const titleId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<FeedbackType>("bug");
  const [sentiment, setSentiment] = useState<FeedbackSentiment>("neutral");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<FeedbackStatus>(IDLE_STATUS);
  const visibleStatus = status.ownerKey === ownerKey &&
      status.contextEpoch === contextEpoch
    ? status
    : IDLE_STATUS;
  const visibleMessage = contextChanged ? "" : message;
  const visibleIsOpen = isOpen && !contextChanged;
  const isSubmitting = visibleStatus.tone === "loading";
  const remainingCharacters = MAX_FEEDBACK_LENGTH - visibleMessage.length;

  useLayoutEffect(() => {
    liveContextRef.current.isMounted = true;
    return () => {
      liveContextRef.current.isMounted = false;
      activeRequestRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    committedContextRef.current = { ownerKey, contextEpoch };
    liveContextRef.current = {
      isMounted: liveContextRef.current.isMounted,
      ownerKey,
      contextEpoch,
      accountUserId,
    };
  }, [accountUserId, contextEpoch, ownerKey]);

  useLayoutEffect(() => {
    setIsOpen(false);
    setFeedbackType("bug");
    setSentiment("neutral");
    setMessage("");
    setStatus(IDLE_STATUS);
  }, [contextEpoch, ownerKey]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const live = liveContextRef.current;

    if (!live.ownerKey) {
      if (live.isMounted) {
        setStatus({
          ownerKey: null,
          contextEpoch: live.contextEpoch,
          tone: "warning",
          message: FEEDBACK_AUTH_UNRESOLVED_COPY,
        });
      }
      return;
    }

    const normalized = normalizeFeedbackInput({
      feedbackType,
      sentiment,
      message: visibleMessage,
      pagePath: pathname || null,
    });
    if (!normalized.ok) {
      setStatus({
        ownerKey: live.ownerKey,
        contextEpoch: live.contextEpoch,
        tone: "error",
        message: normalized.error.message,
      });
      return;
    }

    const active = activeRequestRef.current;
    if (
      active &&
      active.ownerKey === live.ownerKey &&
      active.contextEpoch === live.contextEpoch
    ) return;

    const request: FeedbackRequestIdentity = {
      ownerKey: live.ownerKey,
      contextEpoch: live.contextEpoch,
      requestToken: requestTokenRef.current + 1,
    };
    requestTokenRef.current = request.requestToken;
    activeRequestRef.current = request;
    const startingUserId = request.ownerKey === "anonymous"
      ? null
      : live.accountUserId;
    if (request.ownerKey !== "anonymous" && !startingUserId) {
      activeRequestRef.current = null;
      setStatus({
        ownerKey: request.ownerKey,
        contextEpoch: request.contextEpoch,
        tone: "warning",
        message: FEEDBACK_AUTH_UNRESOLVED_COPY,
      });
      return;
    }
    setStatus({
      ownerKey: request.ownerKey,
      contextEpoch: request.contextEpoch,
      tone: "loading",
      message: "Saving feedback…",
    });

    try {
      if (startingUserId === null) {
        const localResult = saveFeedbackLocally(
          normalized.data,
          { currentUserId: null },
        );
        publishLocalResult(
          request,
          localResult,
          true,
          normalized.data.feedbackType,
        );
        return;
      }

      let accountResult: RepositoryResult<PersistedBetaFeedback>;
      try {
        accountResult = await submitBetaFeedback(normalized.data, startingUserId);
      } catch {
        accountResult = { ok: false, error: accountFeedbackFailure("unknown") };
      }

      if (accountResult.ok) {
        fireAndForgetAnalytics(() => analytics.feedbackPersisted(
          analyticsSourceScreen,
          {
            persistence_path: "account",
            feedback_type: normalized.data.feedbackType,
          },
        ));
        if (isCurrentFeedbackRequest(
          request,
          liveContextRef.current,
          activeRequestRef.current,
        )) {
          setMessage("");
          setStatus({
            ownerKey: request.ownerKey,
            contextEpoch: request.contextEpoch,
            tone: "success",
            message: FEEDBACK_ACCOUNT_SUCCESS_COPY,
          });
        }
        return;
      }

      const persistedCode = isSafePersistedAccountFailureCode(accountResult.error.code)
        ? accountResult.error.code
        : "unknown";
      const localResult = saveFeedbackLocally(
        normalized.data,
        { currentUserId: startingUserId },
        persistedCode,
      );
      publishLocalResult(
        request,
        localResult,
        false,
        normalized.data.feedbackType,
      );
    } catch {
      fireAndForgetAnalytics(() => analytics.productOperationFailed(
        analyticsSourceScreen,
        {
          operation: "feedback_persistence",
          error_code: "storage_write_failed",
        },
      ));
      if (isCurrentFeedbackRequest(
        request,
        liveContextRef.current,
        activeRequestRef.current,
      )) {
        setStatus({
          ownerKey: request.ownerKey,
          contextEpoch: request.contextEpoch,
          tone: "error",
          message: startingUserId === null
            ? localFeedbackFailure("unknown").message
            : FEEDBACK_DUAL_FAILURE_COPY,
        });
      }
    } finally {
      if (isSameFeedbackRequest(activeRequestRef.current, request)) {
        activeRequestRef.current = null;
      }
    }
  }

  function publishLocalResult(
    request: FeedbackRequestIdentity,
    result: ReturnType<typeof saveFeedbackLocally>,
    signedOut: boolean,
    persistedFeedbackType: FeedbackType,
  ) {
    if (!isCurrentFeedbackRequest(
      request,
      liveContextRef.current,
      activeRequestRef.current,
    )) return;

    if (result.ok) {
      fireAndForgetAnalytics(() => analytics.feedbackPersisted(
        analyticsSourceScreen,
        {
          persistence_path: signedOut ? "browser" : "browser_fallback",
          feedback_type: persistedFeedbackType,
        },
      ));
      setMessage("");
      setStatus({
        ownerKey: request.ownerKey,
        contextEpoch: request.contextEpoch,
        tone: signedOut ? "success" : "warning",
        message: signedOut
          ? FEEDBACK_SIGNED_OUT_SUCCESS_COPY
          : FEEDBACK_ACCOUNT_FALLBACK_COPY,
      });
      return;
    }

    fireAndForgetAnalytics(() => analytics.productOperationFailed(
      analyticsSourceScreen,
      {
        operation: "feedback_persistence",
        error_code: "storage_write_failed",
      },
    ));
    setStatus({
      ownerKey: request.ownerKey,
      contextEpoch: request.contextEpoch,
      tone: "error",
      message: signedOut ? result.error.message : FEEDBACK_DUAL_FAILURE_COPY,
    });
  }

  return (
    <div className="fixed bottom-3 right-3 z-50 sm:bottom-4 sm:right-4">
      {visibleIsOpen && (
        <div
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={titleId}
          className="skillmint-fade-in mb-3 max-h-[calc(100vh-6rem)] w-[calc(100vw-1.5rem)] max-w-md overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-4 text-white shadow-2xl shadow-black/45 sm:w-[calc(100vw-2rem)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p id={titleId} className="text-sm font-bold text-white">
                Beta feedback
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-300">
                Report bugs, confusing moments, UI issues, or ideas.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close beta feedback"
              className="rounded-lg border border-slate-500 px-2 py-1 text-xs font-semibold text-white transition hover:border-slate-300"
            >
              Close
            </button>
          </div>

          <form
            onSubmit={handleSubmit}
            aria-busy={isSubmitting}
            className="mt-4 space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Type</span>
                <select
                  value={feedbackType}
                  onChange={(event) => setFeedbackType(event.target.value as FeedbackType)}
                  className="mt-2 w-full rounded-xl border border-slate-500 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                >
                  {feedbackTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Sentiment</span>
                <select
                  value={sentiment}
                  onChange={(event) => setSentiment(event.target.value as FeedbackSentiment)}
                  className="mt-2 w-full rounded-xl border border-slate-500 bg-slate-900 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400"
                >
                  {sentimentOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">Message</span>
              <textarea
                value={visibleMessage}
                onChange={(event) => setMessage(event.target.value)}
                maxLength={MAX_FEEDBACK_LENGTH}
                rows={5}
                placeholder="What felt broken, confusing, or useful?"
                className="mt-2 w-full resize-none rounded-xl border border-slate-500 bg-slate-900 px-3 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-400 focus:border-emerald-400"
              />
            </label>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-300">{remainingCharacters} characters left</p>
              <button
                type="submit"
                disabled={isSubmitting || ownerKey === null}
                className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-white"
              >
                {isSubmitting ? "Saving..." : "Send feedback"}
              </button>
            </div>

            {visibleStatus.tone !== "idle" && visibleStatus.message && (
              <p
                role={visibleStatus.tone === "error" ? "alert" : "status"}
                aria-live={visibleStatus.tone === "error" ? "assertive" : "polite"}
                className={`rounded-lg border p-3 text-sm leading-6 ${getStatusClassName(visibleStatus.tone)}`}
              >
                {visibleStatus.message}
              </p>
            )}
          </form>
        </div>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((currentValue) => !currentValue)}
        aria-expanded={visibleIsOpen}
        aria-controls={panelId}
        className="rounded-full border border-emerald-500/40 bg-neutral-950/95 px-3.5 py-2.5 text-xs font-bold text-emerald-100 shadow-xl shadow-black/30 transition-colors duration-200 hover:border-emerald-400 hover:bg-neutral-900 hover:text-white sm:px-5 sm:py-3 sm:text-sm"
      >
        Feedback
      </button>
    </div>
  );
}

function getStatusClassName(tone: FeedbackStatusTone): string {
  if (tone === "warning" || tone === "loading") {
    return "border-yellow-500/30 bg-yellow-500/10 text-yellow-100";
  }
  if (tone === "error") {
    return "border-red-500/30 bg-red-500/10 text-red-100";
  }
  return "border-green-500/30 bg-green-500/10 text-green-100";
}
