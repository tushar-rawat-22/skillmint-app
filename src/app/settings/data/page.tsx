"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

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
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  buildBrowserDataExport,
  clearSkillMintBrowserData,
  getBrowserStorageSummary,
  getSkillMintStorageDescriptors,
  hasAnonymousBrowserWorkspace,
  importAnonymousBrowserWorkspaceToAccount,
  type BrowserStorageSummary,
} from "@/lib/storage/skillMintStorageRegistry";
import { detachDeletedSavedReportReferences } from "@/lib/storage/reportReferenceCleanup";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import {
  buildCurrentUserAccountDataExport,
  deleteCurrentUserSavedReports,
  getCurrentUserAccountDataCounts,
  type AccountDataCounts,
  type SavedReportsDeletionCounts,
} from "@/modules/data-controls";

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

export default function DataSettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    user,
    session,
    isConfigured,
    isLoading: isAuthLoading,
  } = useAuthSession();
  const currentUserId = isAuthLoading ? undefined : user?.id ?? null;
  const [browserSummary, setBrowserSummary] =
    useState<BrowserStorageSummary | null>(null);
  const [accountCounts, setAccountCounts] = useState<AsyncState<AccountDataCounts>>({
    status: "idle",
    data: null,
    message: null,
    error: null,
  });
  const [browserMessage, setBrowserMessage] = useState<string | null>(null);
  const [browserError, setBrowserError] = useState<string | null>(null);
  const [showBrowserClearDialog, setShowBrowserClearDialog] = useState(false);
  const [showSavedReportsDialog, setShowSavedReportsDialog] = useState(false);
  const [showAccountDeleteDialog, setShowAccountDeleteDialog] = useState(false);
  const [savedReportsDeletion, setSavedReportsDeletion] =
    useState<AsyncState<SavedReportsDeletionCounts>>({
      status: "idle",
      data: null,
      message: null,
      error: null,
    });
  const [accountDeletionState, setAccountDeletionState] =
    useState<AsyncState<null>>({
      status: "idle",
      data: null,
      message: null,
      error: null,
    });
  const [accountDeleteConfirmation, setAccountDeleteConfirmation] =
    useState("");
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importDismissed, setImportDismissed] = useState(false);

  const shouldOfferImport = useMemo(
    () => Boolean(user?.id && !isAuthLoading && !importDismissed && hasAnonymousBrowserWorkspace()),
    [importDismissed, isAuthLoading, user?.id],
  );

  useEffect(() => {
    setBrowserSummary(getBrowserStorageSummary({
      currentUserId,
    }));
  }, [currentUserId]);

  useEffect(() => {
    if (!user?.id || isAuthLoading || !isConfigured) {
      return;
    }

    let isMounted = true;

    setAccountCounts({
      status: "loading",
      data: null,
      message: null,
      error: null,
    });

    void getCurrentUserAccountDataCounts()
      .then((result) => {
        if (!isMounted) {
          return;
        }

        if (!result.ok) {
          setAccountCounts({
            status: "error",
            data: null,
            message: null,
            error: result.error,
          });
          return;
        }

        setAccountCounts({
          status: "success",
          data: result.data,
          message: "Account-synced data counts loaded.",
          error: null,
        });
      })
      .catch(() => {
        if (!isMounted) {
          return;
        }

        setAccountCounts({
          status: "error",
          data: null,
          message: null,
          error: "Account data counts are unavailable right now.",
        });
      });

    return () => {
      isMounted = false;
    };
  }, [isAuthLoading, isConfigured, user?.id]);

  function refreshBrowserSummary() {
    setBrowserSummary(getBrowserStorageSummary({
      currentUserId,
    }));
  }

  function handleBrowserExport() {
    setBrowserMessage(null);
    setBrowserError(null);

    const result = buildBrowserDataExport({
      currentUserId,
    });

    if (!result.ok) {
      setBrowserError(result.error);
      return;
    }

    downloadJson(result.fileName, result.json);
    setBrowserMessage(
      result.omitted.length
        ? `Browser export created. ${result.omitted.length} item(s) were omitted because they were unavailable for this owner or corrupted.`
        : "Browser export created.",
    );
  }

  async function handleAccountExport() {
    setAccountCounts((currentState) => ({
      ...currentState,
      status: "loading",
      error: null,
      message: null,
    }));

    const result = await buildCurrentUserAccountDataExport();

    if (!result.ok) {
      setAccountCounts({
        status: "error",
        data: accountCounts.data,
        message: null,
        error: result.error,
      });
      return;
    }

    downloadJson(result.data.fileName, result.data.json);
    setAccountCounts({
      status: "success",
      data: accountCounts.data ?? createEmptyAccountCounts(),
      message: "Account export created.",
      error: null,
    });
  }

  function handleImportAnonymousWorkspace() {
    if (!user?.id) {
      return;
    }

    setImportMessage(null);
    setImportError(null);
    const result = importAnonymousBrowserWorkspaceToAccount(user.id);

    if (!result.ok) {
      setImportError(result.error);
      refreshBrowserSummary();
      return;
    }

    setImportMessage(
      result.importedKeys.length
        ? `Imported ${result.importedKeys.length} browser item(s) into this account workspace.`
        : "No anonymous browser items needed import.",
    );
    setImportDismissed(true);
    refreshBrowserSummary();
  }

  function handleClearBrowserData() {
    setBrowserMessage(null);
    setBrowserError(null);
    const result = clearSkillMintBrowserData();

    if (result.failedKeys.length) {
      setBrowserError(
        `Removed ${result.removed} item(s), but ${result.failedKeys.length} browser item(s) could not be cleared.`,
      );
    } else {
      setBrowserMessage(
        "SkillMint data was cleared from this browser. Account records were not deleted.",
      );
    }

    setShowBrowserClearDialog(false);
    refreshBrowserSummary();
  }

  async function handleDeleteSavedReports() {
    setSavedReportsDeletion({
      status: "loading",
      data: null,
      message: null,
      error: null,
    });

    const result = await deleteCurrentUserSavedReports();

    if (!result.ok) {
      setSavedReportsDeletion({
        status: "error",
        data: null,
        message: null,
        error: result.error,
      });
      return;
    }

    detachDeletedSavedReportReferences();
    setSavedReportsDeletion({
      status: "success",
      data: result.data,
      message:
        "Saved reports were deleted from your account. Profile and feedback were preserved.",
      error: null,
    });
    setShowSavedReportsDialog(false);
    refreshBrowserSummary();
    const counts = await getCurrentUserAccountDataCounts();

    if (counts.ok) {
      setAccountCounts({
        status: "success",
        data: counts.data,
        message: "Account-synced data counts refreshed.",
        error: null,
      });
    }
  }

  async function handleDeleteAccount() {
    if (!session?.access_token) {
      setAccountDeletionState({
        status: "error",
        data: null,
        message: null,
        error: "Sign in again before deleting your account.",
      });
      return;
    }

    setAccountDeletionState({
      status: "loading",
      data: null,
      message: null,
      error: null,
    });

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          confirmation: ACCOUNT_DELETE_CONFIRMATION,
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.ok) {
        setAccountDeletionState({
          status: "error",
          data: null,
          message: null,
          error: payload?.error ??
            "Account deletion did not finish. Please try again.",
        });
        return;
      }

      const clearResult = clearSkillMintBrowserData();
      const supabase = createSupabaseBrowserClient();

      await supabase?.auth.signOut();
      setAccountDeletionState({
        status: "success",
        data: null,
        message: clearResult.failedKeys.length
          ? "Your account was deleted. Some browser data could not be cleared automatically."
          : "Your account was deleted and SkillMint data was cleared from this browser.",
        error: null,
      });
      setShowAccountDeleteDialog(false);
      router.push("/privacy?accountDeleted=1");
      router.refresh();
    } catch {
      setAccountDeletionState({
        status: "error",
        data: null,
        message: null,
        error: "Account deletion did not finish. Your session and local data were kept.",
      });
    }
  }

  const descriptors = getSkillMintStorageDescriptors();
  const visibleBrowserItems = browserSummary?.items.filter((item) =>
    item.status === "visible"
  ) ?? [];
  const accountCountData = accountCounts.data;

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

        {(importMessage || importError || browserMessage || browserError) && (
          <StatusPanel
            message={importMessage ?? browserMessage}
            error={importError ?? browserError}
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
            detail={user?.email ?? "Browser-local mode available."}
          />

          <OverviewCard
            label="This browser"
            value={`${browserSummary?.visibleCount ?? 0} visible item(s)`}
            detail={`${browserSummary?.hiddenCount ?? 0} hidden for another owner; ${browserSummary?.corruptedCount ?? 0} corrupted.`}
          />

          <OverviewCard
            label="Account sync"
            value={user ? "Available when Supabase responds" : "Sign in required"}
            detail={accountCounts.status === "error"
              ? accountCounts.error
              : "Browser and account data stay separate."}
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
              const summaryItem = browserSummary?.items.find((item) =>
                item.descriptor.key === descriptor.key
              );

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
                      {summaryItem?.status ?? "checking"}
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
              className={premiumSecondaryCta}
            >
              Download browser data
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
              ? "These counts come from your authenticated Supabase session and RLS-scoped account rows."
              : "Sign in to view, download, or delete account-synced data."}
          />

          {user ? (
            <>
              <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <OverviewCard
                  label="Profile"
                  value={(accountCountData?.profile ?? 0).toString()}
                  detail="Preserved by Delete saved reports."
                />

                <OverviewCard
                  label="Resume analyses"
                  value={(accountCountData?.resumeAnalyses ?? 0).toString()}
                  detail="Deleted by Delete saved reports."
                />

                <OverviewCard
                  label="JD matches"
                  value={(accountCountData?.jobMatches ?? 0).toString()}
                  detail="Deleted by Delete saved reports."
                />

                <OverviewCard
                  label="Career snapshots"
                  value={(accountCountData?.careerSnapshots ?? 0).toString()}
                  detail="Deleted by Delete saved reports."
                />

                <OverviewCard
                  label="Feedback"
                  value={(accountCountData?.betaFeedback ?? 0).toString()}
                  detail="Preserved by Delete saved reports."
                />
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleAccountExport}
                  className={premiumSecondaryCta}
                >
                  Download account data
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

          {accountCounts.status === "error" && (
            <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-6 text-amber-900">
              {accountCounts.error}
            </p>
          )}

          {accountCounts.status === "success" && accountCounts.message && (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm leading-6 text-emerald-900">
              {accountCounts.message}
            </p>
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
              body="Deletes synced resume analyses, JD matches, and career snapshots. Keeps your account, profile, feedback, and browser workspace."
              actionLabel="Delete saved reports"
              disabled={!user || savedReportsDeletion.status === "loading"}
              onClick={() => setShowSavedReportsDialog(true)}
            />

            <DangerAction
              title="Delete SkillMint account"
              body="Deletes account access through the server admin boundary. Product rows cascade according to the verified database schema."
              actionLabel="Delete SkillMint account"
              disabled={!user || accountDeletionState.status === "loading"}
              onClick={() => setShowAccountDeleteDialog(true)}
            />
          </div>

          {savedReportsDeletion.status === "success" && (
            <p className="mt-4 rounded-xl border border-emerald-200 bg-white p-3 text-sm leading-6 text-emerald-800">
              {savedReportsDeletion.message} Resume analyses deleted:
              {" "}{savedReportsDeletion.data.resumeAnalysesDeleted}; JD matches
              deleted: {savedReportsDeletion.data.jobMatchesDeleted}; career
              snapshots deleted: {savedReportsDeletion.data.careerSnapshotsDeleted}.
            </p>
          )}

          {savedReportsDeletion.status === "error" && (
            <p className="mt-4 rounded-xl border border-rose-200 bg-white p-3 text-sm leading-6 text-rose-800">
              {savedReportsDeletion.error}
            </p>
          )}

          {accountDeletionState.status === "error" && (
            <p className="mt-4 rounded-xl border border-rose-200 bg-white p-3 text-sm leading-6 text-rose-800">
              {accountDeletionState.error}
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
            This removes SkillMint locally stored data from this browser,
            including visible browser resume, JD, Active Target, mission,
            setup, feedback, and preference state.
          </p>
          <p className="mt-3 font-semibold">
            It does not delete your SkillMint account or records saved to your
            account.
          </p>
        </ConfirmDialog>

        <ConfirmDialog
          isOpen={showSavedReportsDialog}
          title="Delete saved reports"
          confirmLabel="Delete saved reports"
          isProcessing={savedReportsDeletion.status === "loading"}
          onConfirm={handleDeleteSavedReports}
          onClose={() => setShowSavedReportsDialog(false)}
        >
          <ul className="list-disc space-y-2 pl-5">
            <li>Deletes synced resume analyses.</li>
            <li>Deletes synced JD matches.</li>
            <li>Deletes synced career snapshots.</li>
            <li>Preserves your account, profile, feedback, and browser data.</li>
            <li>Detaches broken synced references from this browser.</li>
          </ul>
        </ConfirmDialog>

        <ConfirmDialog
          isOpen={showAccountDeleteDialog}
          title="Delete SkillMint account"
          confirmLabel="Delete SkillMint account"
          isProcessing={accountDeletionState.status === "loading"}
          confirmDisabled={
            accountDeleteConfirmation !== ACCOUNT_DELETE_CONFIRMATION
          }
          onConfirm={handleDeleteAccount}
          onClose={() => setShowAccountDeleteDialog(false)}
        >
          <ul className="list-disc space-y-2 pl-5">
            <li>Account access will be removed.</li>
            <li>Saved reports and profile data will be removed by cascade.</li>
            <li>Account-owned feedback will be removed by cascade.</li>
            <li>SkillMint data in this browser will be cleared after success.</li>
            <li>This action cannot be undone through the UI.</li>
          </ul>

          <label
            htmlFor="account-delete-confirmation"
            className="mt-5 block text-sm font-bold text-slate-950"
          >
            Type DELETE MY ACCOUNT
          </label>

          <input
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
  message,
  error,
}: {
  message: string | null;
  error: string | null;
}) {
  return (
    <section
      role="status"
      className={error ? premiumDangerSurface : premiumCompactSurface}
    >
      <p className="text-sm font-semibold">
        {error ?? message}
      </p>
    </section>
  );
}

function createEmptyAccountCounts(): AccountDataCounts {
  return {
    profile: 0,
    resumeAnalyses: 0,
    jobMatches: 0,
    careerSnapshots: 0,
    betaFeedback: 0,
  };
}

function downloadJson(fileName: string, json: string) {
  const blob = new Blob([json], {
    type: "application/json",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
