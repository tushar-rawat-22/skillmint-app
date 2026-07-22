"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import {
  premiumBadge,
  premiumCompactSurface,
  premiumEyebrow,
  premiumHeroSurface,
  premiumMutedText,
  premiumPageStack,
  premiumSecondaryCta,
  premiumSurface,
  premiumWarningSurface,
} from "@/components/ui/premium";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import {
  FOUNDER_ANALYTICS_WINDOWS,
  parseFounderAnalyticsHttpResponse,
  type FounderAnalyticsSummary,
  type FounderAnalyticsWindow,
  type ObservedEventRatio,
} from "@/modules/analytics/founderDashboardContract";
import {
  ANALYTICS_EVENT_NAMES,
  ANALYTICS_FEEDBACK_PERSISTENCE_PATHS,
  ANALYTICS_OPERATION_ERROR_CODES,
  ANALYTICS_PRODUCT_OPERATIONS,
} from "@/platform/analytics";

type ViewStatus =
  | "loading"
  | "signed_out"
  | "unauthorized"
  | "disabled"
  | "rate_limited"
  | "unavailable"
  | "empty"
  | "ready";

type DashboardState = {
  readonly status: ViewStatus;
  readonly summary: FounderAnalyticsSummary | null;
};

const WINDOW_LABELS: Readonly<Record<FounderAnalyticsWindow, string>> = {
  "24h": "Last 24 hours",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

const EVENT_LABELS: Readonly<Record<string, string>> = {
  career_setup_started: "Career setup started",
  resume_analysis_started: "Resume analysis started",
  resume_analysis_failed: "Resume analysis failed",
  active_target_selected: "Active Target selected",
  active_target_cleared: "Active Target cleared",
  jd_match_started: "JD Match started",
  jd_match_completed: "JD Match completed",
  roadmap_reached: "Roadmap reached",
  mission_started: "Mission started",
  mission_marked_done: "Mission marked done",
  analysis_restored: "Analysis restored",
  feedback_persisted: "Feedback persisted",
  product_operation_failed: "Product operation failed",
};

const OPERATION_LABELS: Readonly<Record<string, string>> = {
  career_setup: "Career setup",
  resume_analysis: "Resume analysis",
  active_target_selection: "Active Target selection",
  active_target_clear: "Active Target clear",
  jd_match: "JD Match",
  roadmap_load: "Roadmap load",
  mission_status: "Mission status",
  analysis_restore: "Analysis restore",
  feedback_persistence: "Feedback persistence",
};

export default function FounderAnalyticsDashboard() {
  const { session, isLoading: authLoading, isConfigured } = useAuthSession();
  const [selectedWindow, setSelectedWindow] =
    useState<FounderAnalyticsWindow>("24h");
  const [state, setState] = useState<DashboardState>({
    status: "loading",
    summary: null,
  });
  const requestSequence = useRef(0);
  const initialSessionToken = useRef<string | null>(null);

  const load = useCallback(async (
    window: FounderAnalyticsWindow,
    accessToken: string,
  ) => {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;
    setState({ status: "loading", summary: null });

    try {
      const response = await fetch(
        `/api/founder/analytics/summary?window=${window}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        },
      );
      const body: unknown = await response.json();
      if (requestSequence.current !== sequence) return;

      const parsed = parseFounderAnalyticsHttpResponse(response.status, body);
      if (parsed.kind === "success") {
        setState({
          status: parsed.summary.total_event_count === 0 ? "empty" : "ready",
          summary: parsed.summary,
        });
        return;
      }
      if (parsed.kind === "invalid") {
        setState({ status: "unavailable", summary: null });
        return;
      }
      setState({
        status: parsed.code === "not_authenticated"
          ? "signed_out"
          : parsed.code === "not_authorized"
            ? "unauthorized"
            : parsed.code === "dashboard_disabled"
              ? "disabled"
              : parsed.code === "rate_limited"
                ? "rate_limited"
                : "unavailable",
        summary: null,
      });
    } catch {
      if (requestSequence.current === sequence) {
        setState({ status: "unavailable", summary: null });
      }
    }
  }, []);

  useEffect(() => {
    const accessToken = session?.access_token ?? null;
    if (!accessToken) {
      initialSessionToken.current = null;
      return;
    }
    if (authLoading || !isConfigured) return;
    if (initialSessionToken.current === accessToken) return;
    initialSessionToken.current = accessToken;
    void load(selectedWindow, accessToken);
  }, [authLoading, isConfigured, load, selectedWindow, session?.access_token]);

  const chooseWindow = (window: FounderAnalyticsWindow) => {
    setSelectedWindow(window);
    const accessToken = session?.access_token;
    if (accessToken) void load(window, accessToken);
  };

  const visibleState: DashboardState = authLoading
    ? { status: "loading", summary: null }
    : !isConfigured
      ? { status: "unavailable", summary: null }
      : !session?.access_token
        ? { status: "signed_out", summary: null }
        : state;

  return (
    <main className="min-h-screen bg-[#f7f8f4] px-4 py-8 text-slate-950 sm:px-6 lg:px-8 lg:py-12">
      <div className={premiumPageStack}>
        <section className={premiumHeroSurface} aria-labelledby="event-health-heading">
          <p className={premiumEyebrow}>Founder analytics</p>
          <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 id="event-health-heading" className="text-3xl font-black tracking-tight sm:text-4xl">
                Product Event Health
              </h1>
              <p className={`mt-3 ${premiumMutedText}`}>
                Privacy-safe operational aggregates for the current server environment.
              </p>
            </div>
            <span className={premiumBadge}>Aggregate query status: {statusLabel(visibleState.status)}</span>
          </div>
          <div className={`mt-6 ${premiumWarningSurface}`}>
            <p className="font-bold">Counts describe events, not people.</p>
            <p className="mt-1 text-sm leading-6">
              These totals contain no direct user, account, or session identifier
              and do not support unique-person, session, cohort, or per-account metrics.
            </p>
          </div>
        </section>

        <section className={premiumSurface} aria-labelledby="window-heading">
          <h2 id="window-heading" className="text-lg font-black">Observation window</h2>
          <div className="mt-4 flex flex-wrap gap-3" role="group" aria-label="Select observation window">
            {FOUNDER_ANALYTICS_WINDOWS.map((window) => (
              <button
                key={window}
                type="button"
                onClick={() => chooseWindow(window)}
                aria-pressed={selectedWindow === window}
                disabled={visibleState.status === "loading" || !session?.access_token}
                className={`${premiumSecondaryCta} ${selectedWindow === window ? "border-emerald-600 bg-emerald-50 text-emerald-950" : ""}`}
              >
                {WINDOW_LABELS[window]}
              </button>
            ))}
          </div>
        </section>

        <StatusRegion status={visibleState.status} />
        {visibleState.summary ? <SummaryContent summary={visibleState.summary} /> : null}
      </div>
    </main>
  );
}

function StatusRegion({ status }: { status: ViewStatus }) {
  if (status === "ready" || status === "empty") {
    return status === "empty" ? (
      <div className={premiumCompactSurface} role="status" aria-live="polite">
        <h2 className="font-black">Empty observation window</h2>
        <p className={`mt-2 ${premiumMutedText}`}>
          The aggregate query completed and found no received events in this window.
        </p>
      </div>
    ) : (
      <p className="sr-only" role="status" aria-live="polite">Aggregate summary ready.</p>
    );
  }

  const content: Record<Exclude<ViewStatus, "ready" | "empty">, {
    title: string;
    message: string;
  }> = {
    loading: {
      title: "Loading aggregate query",
      message: "Authenticating this request and requesting the selected event window.",
    },
    signed_out: {
      title: "Signed out",
      message: "Sign in before requesting the protected founder summary.",
    },
    unauthorized: {
      title: "Access not authorized",
      message: "This signed-in account is not authorized for the founder summary.",
    },
    disabled: {
      title: "Dashboard disabled",
      message: "Founder dashboard authorization is not configured on this server.",
    },
    rate_limited: {
      title: "Request limit reached",
      message: "Wait briefly before requesting the summary again.",
    },
    unavailable: {
      title: "Aggregate query unavailable",
      message: "The protected aggregate summary cannot be loaded right now.",
    },
  };
  const current = content[status];
  return (
    <div className={premiumCompactSurface} role="status" aria-live="polite">
      <h2 className="font-black">{current.title}</h2>
      <p className={`mt-2 ${premiumMutedText}`}>{current.message}</p>
      {status === "signed_out" ? (
        <Link href="/login" className={`mt-4 ${premiumSecondaryCta}`}>Open sign in</Link>
      ) : null}
    </div>
  );
}

function SummaryContent({ summary }: { summary: FounderAnalyticsSummary }) {
  return (
    <>
      <section className={premiumSurface} aria-labelledby="overview-heading">
        <h2 id="overview-heading" className="text-xl font-black">Aggregate overview</h2>
        <dl className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Metric label="Canonical environment" value={summary.canonical_environment} />
          <Metric label="Selected window" value={WINDOW_LABELS[summary.window_name]} />
          <Metric label="As of" value={formatTimestamp(summary.as_of)} />
          <Metric label="Total events" value={formatCount(summary.total_event_count)} />
          <Metric label="Last received event" value={formatTimestamp(summary.last_received_at)} />
          <Metric label="Events overdue for 45-day deletion" value={formatCount(summary.retention_overdue_count)} />
        </dl>
      </section>

      <section className={premiumSurface} aria-labelledby="event-counts-heading">
        <h2 id="event-counts-heading" className="text-xl font-black">Event-name counts</h2>
        <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ANALYTICS_EVENT_NAMES.map((eventName) => (
            <Metric key={eventName} label={EVENT_LABELS[eventName]} value={formatCount(summary.event_counts[eventName])} compact />
          ))}
        </dl>
      </section>

      <section className={premiumSurface} aria-labelledby="ratios-heading">
        <h2 id="ratios-heading" className="text-xl font-black">Observed event ratios</h2>
        <p className={`mt-2 ${premiumMutedText}`}>
          Ratios compare event counts inside the selected received-at window. They are not person-level outcomes and may exceed 100% when event attempts differ.
        </p>
        <dl className="mt-5 grid gap-4 lg:grid-cols-3">
          <RatioMetric label="Resume analysis failure / started" ratio={summary.observed_event_ratios.resume_analysis_failure} />
          <RatioMetric label="JD Match completed / started" ratio={summary.observed_event_ratios.jd_match_completion} />
          <RatioMetric label="Feedback persistence failure / persistence outcome" ratio={summary.observed_event_ratios.feedback_persistence_failure} />
        </dl>
      </section>

      <section className={premiumSurface} aria-labelledby="operation-heading">
        <h2 id="operation-heading" className="text-xl font-black">Operation and error failure counts</h2>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
          <table className="min-w-full border-collapse text-left text-sm">
            <caption className="sr-only">Product operation failure event counts by operation and approved error code</caption>
            <thead className="bg-slate-50">
              <tr>
                <th scope="col" className="sticky left-0 bg-slate-50 px-4 py-3 font-bold">Operation</th>
                {ANALYTICS_OPERATION_ERROR_CODES.map((errorCode) => (
                  <th scope="col" key={errorCode} className="whitespace-nowrap px-4 py-3 font-bold">{humanize(errorCode)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ANALYTICS_PRODUCT_OPERATIONS.map((operation) => (
                <tr key={operation} className="border-t border-slate-200">
                  <th scope="row" className="sticky left-0 whitespace-nowrap bg-white px-4 py-3 font-bold">{OPERATION_LABELS[operation]}</th>
                  {ANALYTICS_OPERATION_ERROR_CODES.map((errorCode) => (
                    <td key={errorCode} className="px-4 py-3 tabular-nums">{formatCount(summary.operation_error_counts[operation][errorCode])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={premiumSurface} aria-labelledby="feedback-heading">
        <h2 id="feedback-heading" className="text-xl font-black">Feedback persistence-path counts</h2>
        <dl className="mt-5 grid gap-3 sm:grid-cols-3">
          {ANALYTICS_FEEDBACK_PERSISTENCE_PATHS.map((path) => (
            <Metric key={path} label={humanize(path)} value={formatCount(summary.feedback_persistence_counts[path])} compact />
          ))}
        </dl>
      </section>
    </>
  );
}

function Metric({ label, value, compact = false }: {
  label: string;
  value: string;
  compact?: boolean;
}) {
  return (
    <div className={compact ? "rounded-2xl bg-slate-50 p-4" : premiumCompactSurface}>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-2 break-words text-lg font-black tabular-nums text-slate-950">{value}</dd>
    </div>
  );
}

function RatioMetric({ label, ratio }: { label: string; ratio: ObservedEventRatio }) {
  return (
    <div className={premiumCompactSurface}>
      <dt className="font-bold">{label}</dt>
      <dd className="mt-3 text-2xl font-black tabular-nums">
        {ratio.ratio === null ? "Not available" : `${(ratio.ratio * 100).toFixed(1)}%`}
      </dd>
      <dd className="mt-2 text-sm tabular-nums text-slate-600">
        {formatCount(ratio.numerator)} / {formatCount(ratio.denominator)} observed events
      </dd>
    </div>
  );
}

function formatTimestamp(value: string | null): string {
  if (value === null) return "No event received in window";
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(value)) + " UTC";
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en-IN").format(value);
}

function humanize(value: string): string {
  return value.replaceAll("_", " ");
}

function statusLabel(status: ViewStatus): string {
  return status.replaceAll("_", " ");
}
