"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getAccountOverview } from "@/modules/account/services/accountRepository";
import type { AccountOverview } from "@/modules/account/types";

type AccountOverviewState =
  | {
      status: "loading";
      overview: null;
      error: null;
    }
  | {
      status: "ready";
      overview: AccountOverview;
      error: null;
    }
  | {
      status: "error";
      overview: null;
      error: string;
    };

export default function AccountOverviewCard() {
  const [state, setState] = useState<AccountOverviewState>({
    status: "loading",
    overview: null,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function loadAccountOverview() {
      try {
        const result = await getAccountOverview();

        if (!isMounted) {
          return;
        }

        if (!result.ok) {
          setState({
            status: "error",
            overview: null,
            error: result.error,
          });
          return;
        }

        setState({
          status: "ready",
          overview: result.data,
          error: null,
        });
      } catch {
        if (!isMounted) {
          return;
        }

        setState({
          status: "error",
          overview: null,
          error: "Account overview is unavailable right now.",
        });
      }
    }

    void loadAccountOverview();

    return () => {
      isMounted = false;
    };
  }, []);

  if (state.status === "loading") {
    return (
      <article className="rounded-lg border border-gray-800 bg-neutral-900 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
          Account Overview
        </p>

        <h2 className="mt-4 text-xl font-bold text-white">
          Checking account sync...
        </h2>
      </article>
    );
  }

  if (state.status === "error") {
    return (
      <article className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-6">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-yellow-200/80">
          Account Overview
        </p>

        <h2 className="mt-4 text-xl font-bold text-yellow-50">
          Account data unavailable
        </h2>

        <p className="mt-3 text-sm leading-6 text-yellow-50/80">
          {state.error}
        </p>
      </article>
    );
  }

  const { overview } = state;

  if (!overview.isConfigured) {
    return (
      <article className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-6">
        <AccountOverviewHeader
          eyebrow="Account Overview"
          title="Account sync is unavailable"
          body={overview.message}
        />

        <p className="mt-4 text-sm leading-6 text-yellow-50/80">
          Local resume, ATS, and roadmap workflows still work in this browser.
        </p>
      </article>
    );
  }

  if (!overview.isSignedIn) {
    return (
      <article className="rounded-lg border border-gray-800 bg-neutral-900 p-6">
        <AccountOverviewHeader
          eyebrow="Account Overview"
          title="Sign in to sync your account."
          body={overview.message}
        />

        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-500"
          >
            Log in
          </Link>

          <Link
            href="/signup"
            className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold text-gray-100 transition hover:border-green-500 hover:text-green-300"
          >
            Create account
          </Link>
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-lg border border-gray-800 bg-neutral-900 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <AccountOverviewHeader
          eyebrow="Account Overview"
          title="Persistent account data"
          body={overview.message}
        />

        <span className="w-fit rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-green-200">
          Signed in
        </span>
      </div>

      <p className="mt-4 break-words text-sm leading-6 text-gray-300">
        {overview.email ?? "No email available"}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <OverviewMetric
          label="Profile"
          value={formatProfileStatus(overview.profileStatus)}
        />

        <OverviewMetric
          label="Resume Analyses"
          value={overview.resumeAnalysisCount.toString()}
          detail={overview.latestResumeFileName ?? "No synced resume yet"}
        />

        <OverviewMetric
          label="Job Matches"
          value={overview.jobMatchCount.toString()}
          detail={formatLatestJobMatch(overview)}
        />

        <OverviewMetric
          label="Fallback"
          value="Local active"
          detail="Browser storage still works."
        />
      </div>
    </article>
  );
}

type AccountOverviewHeaderProps = {
  eyebrow: string;
  title: string;
  body: string;
};

function AccountOverviewHeader({
  eyebrow,
  title,
  body,
}: AccountOverviewHeaderProps) {
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-green-400">
        {eyebrow}
      </p>

      <h2 className="mt-4 text-xl font-bold text-white">
        {title}
      </h2>

      <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-400">
        {body}
      </p>
    </div>
  );
}

type OverviewMetricProps = {
  label: string;
  value: string;
  detail?: string;
};

function OverviewMetric({
  label,
  value,
  detail,
}: OverviewMetricProps) {
  return (
    <div className="min-w-0 rounded-lg border border-gray-800 bg-black/30 p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
        {label}
      </p>

      <p className="mt-3 break-words text-lg font-bold text-white">
        {value}
      </p>

      {detail && (
        <p className="mt-2 break-words text-xs leading-5 text-gray-500">
          {detail}
        </p>
      )}
    </div>
  );
}

function formatProfileStatus(
  status: AccountOverview["profileStatus"],
): string {
  if (status === "saved") {
    return "Saved";
  }

  if (status === "missing") {
    return "Missing";
  }

  return "Unavailable";
}

function formatLatestJobMatch(overview: AccountOverview): string {
  if (!overview.latestJobTitle && !overview.latestCompanyName) {
    return "No synced match yet";
  }

  if (overview.latestJobTitle && overview.latestCompanyName) {
    return `${overview.latestJobTitle} at ${overview.latestCompanyName}`;
  }

  return overview.latestJobTitle ?? overview.latestCompanyName ??
    "No synced match yet";
}
