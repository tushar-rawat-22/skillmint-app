"use client";

import { useEffect, useState } from "react";

import {
  premiumEyebrow,
  premiumPrimaryCta,
  premiumSecondaryCta,
  premiumSurface,
} from "@/components/ui/premium";
import type { CandidateProofBrief } from "@/modules/proofBrief/types";
import {
  createOrRefreshPrivateProofBrief,
  getProofBriefForSource,
  publishProofBrief,
  revokeProofBrief,
} from "@/modules/proofBrief/proofBriefRepository";

type Status = { readonly tone: "idle" | "loading" | "success" | "error"; readonly message: string };

export default function ProofBriefControlCard({
  currentUserId,
  sourceResumeAnalysisId,
}: {
  currentUserId: string | null | undefined;
  sourceResumeAnalysisId: string | null;
}) {
  const stateBoundaryKey = `${currentUserId ?? "signed-out"}:${sourceResumeAnalysisId ?? "browser-only"}`;

  return (
    <ProofBriefControlCardForSource
      key={stateBoundaryKey}
      currentUserId={currentUserId}
      sourceResumeAnalysisId={sourceResumeAnalysisId}
    />
  );
}

function ProofBriefControlCardForSource({
  currentUserId,
  sourceResumeAnalysisId,
}: {
  currentUserId: string | null | undefined;
  sourceResumeAnalysisId: string | null;
}) {
  const [brief, setBrief] = useState<CandidateProofBrief | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareConfirmed, setShareConfirmed] = useState(false);
  const [status, setStatus] = useState<Status>(
    currentUserId && sourceResumeAnalysisId
      ? { tone: "loading", message: "Checking your private Proof Brief…" }
      : { tone: "idle", message: "" },
  );

  useEffect(() => {
    let active = true;
    if (!currentUserId || !sourceResumeAnalysisId) {
      return () => { active = false; };
    }

    void (async () => {
      try {
        const result = await getProofBriefForSource(
          sourceResumeAnalysisId,
          currentUserId,
        );
        if (!active) return;
        if (result.ok) {
          setBrief(result.data);
          setStatus({ tone: "idle", message: "" });
        } else {
          setStatus({ tone: "error", message: result.message });
        }
      } catch {
        if (!active) return;
        setStatus({
          tone: "error",
          message: "Could not check your Proof Brief right now. Try again after the connection recovers.",
        });
      }
    })();

    return () => { active = false; };
  }, [currentUserId, sourceResumeAnalysisId]);

  async function handleCreatePrivate() {
    if (!currentUserId || !sourceResumeAnalysisId) return;
    setStatus({ tone: "loading", message: brief ? "Refreshing the private brief and revoking its old link…" : "Creating a private Proof Brief…" });
    setShareUrl(null);
    setShareConfirmed(false);

    try {
      const result = await createOrRefreshPrivateProofBrief(
        sourceResumeAnalysisId,
        currentUserId,
      );
      if (result.ok) {
        setBrief(result.data);
        setStatus({ tone: "success", message: "Private Proof Brief ready. Nothing is shared yet." });
      } else {
        setStatus({ tone: "error", message: result.message });
      }
    } catch {
      setStatus({
        tone: "error",
        message: "Could not create or refresh the Proof Brief right now. Your existing sharing state was not changed in this browser.",
      });
    }
  }

  async function handlePublish() {
    if (!currentUserId || !brief || !shareConfirmed) return;
    setStatus({ tone: "loading", message: "Creating a new link-only share…" });
    setShareUrl(null);

    try {
      const result = await publishProofBrief(brief.id, currentUserId);
      if (result.ok) {
        const url = `${window.location.origin}/brief/${result.data.shareToken}`;
        setBrief(result.data.brief);
        setShareUrl(url);
        setShareConfirmed(false);
        setStatus({ tone: "success", message: "Link created. Copy it now; the raw link token is not stored in your account." });
      } else {
        setStatus({ tone: "error", message: result.message });
      }
    } catch {
      setStatus({
        tone: "error",
        message: "Could not create the sharing link right now. Refresh this Proof Brief before trying again so its current sharing state is confirmed.",
      });
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setStatus({ tone: "success", message: "Proof Brief link copied." });
    } catch {
      setStatus({ tone: "error", message: "Copy failed. Select and copy the link manually." });
    }
  }

  async function handleRevoke() {
    if (!currentUserId || !brief) return;
    setStatus({ tone: "loading", message: "Revoking the shared link…" });

    try {
      const result = await revokeProofBrief(brief.id, currentUserId);
      if (result.ok) {
        setBrief(result.data);
        setShareUrl(null);
        setShareConfirmed(false);
        setStatus({ tone: "success", message: "Link revoked. The brief is private again." });
      } else {
        setStatus({ tone: "error", message: result.message });
      }
    } catch {
      setStatus({
        tone: "error",
        message: "Could not confirm link revocation right now. Treat the existing link as active until the Proof Brief reloads and confirms otherwise.",
      });
    }
  }

  const isLoading = status.tone === "loading";
  return (
    <section className={premiumSurface} aria-labelledby="proof-brief-control-title">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={premiumEyebrow}>Candidate-controlled sharing</p>
          <h2 id="proof-brief-control-title" className="mt-2 text-2xl font-black">Proof Brief</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Create a minimal recruiter-readable evidence summary. It starts
            private and becomes viewable only after you create a link.
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${brief?.visibility === "LINK_ONLY" ? "border-amber-300 bg-amber-50 text-amber-900" : "border-emerald-300 bg-emerald-50 text-emerald-900"}`}>
          {brief?.visibility === "LINK_ONLY" ? "Link only" : "Private"}
        </span>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h3 className="font-bold text-emerald-950">Shared in the brief</h3>
          <p className="mt-2 text-sm leading-6 text-emerald-900">
            Derived direction, support summary, selected skill support states,
            evidence-entry counts, the main gap, and the next move.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h3 className="font-bold">Never added automatically</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Raw resume text or file, email, phone, address, account ID, browser
            data, employer, institution identifier, and source URLs.
          </p>
        </div>
      </div>

      {!currentUserId ? (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          Log in to create and control a Proof Brief.
        </p>
      ) : !sourceResumeAnalysisId ? (
        <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          Use an account-saved resume analysis as the active report before
          creating a Proof Brief. Browser-only reports are never shared.
        </p>
      ) : (
        <div className="mt-6 space-y-5">
          <button type="button" disabled={isLoading} onClick={handleCreatePrivate} className={premiumSecondaryCta}>
            {brief?.visibility === "LINK_ONLY"
              ? "Refresh and revoke link"
              : brief
                ? "Refresh private Proof Brief"
                : "Create private Proof Brief"}
          </button>

          {brief ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              {brief.visibility === "LINK_ONLY" ? (
                <div>
                  <h3 className="font-bold">This brief currently has an active link.</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Anyone who has the link can view the derived brief. It is
                    not listed or searchable. A signed-in recruiter can send
                    one structured review for a role map. Revoke the link to
                    stop further viewing and review submissions.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button type="button" disabled={isLoading} onClick={handleRevoke} className={premiumSecondaryCta}>Revoke link</button>
                    <button type="button" disabled={isLoading || !shareConfirmed} onClick={handlePublish} className={premiumPrimaryCta}>Replace with a new link</button>
                  </div>
                </div>
              ) : (
                <div>
                  <h3 className="font-bold">Nothing is shared.</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Create a link only when you want a specific person to review this brief.
                  </p>
                  <button type="button" disabled={isLoading || !shareConfirmed} onClick={handlePublish} className={`${premiumPrimaryCta} mt-4`}>Create link-only share</button>
                </div>
              )}
              <label className="mt-5 flex items-start gap-3 text-sm leading-6 text-slate-700">
                <input type="checkbox" checked={shareConfirmed} onChange={(event) => setShareConfirmed(event.target.checked)} className="mt-1 h-4 w-4 rounded border-slate-300 accent-emerald-700" />
                <span>I understand that anyone with the new link can view this derived brief, and a signed-in recruiter can send bounded structured feedback, until I revoke or replace it.</span>
              </label>
            </div>
          ) : null}

          {shareUrl ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <label htmlFor="proof-brief-share-url" className="font-bold text-emerald-950">Copy this link now</label>
              <input id="proof-brief-share-url" readOnly value={shareUrl} className="mt-3 w-full rounded-xl border border-emerald-300 bg-white px-4 py-3 text-sm text-slate-900" />
              <button type="button" onClick={handleCopy} className={`${premiumSecondaryCta} mt-3`}>Copy link</button>
            </div>
          ) : brief?.visibility === "LINK_ONLY" ? (
            <p className="text-sm leading-6 text-slate-600">
              For security, the raw link token is not stored. If you no longer
              have the link, confirm sharing and create a replacement.
            </p>
          ) : null}
        </div>
      )}

      {status.message ? (
        <p role={status.tone === "error" ? "alert" : "status"} aria-live={status.tone === "error" ? "assertive" : "polite"} className={`mt-5 rounded-xl border p-3 text-sm leading-6 ${status.tone === "error" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-slate-200 bg-white text-slate-700"}`}>
          {status.message}
        </p>
      ) : null}

      <p className="mt-5 text-xs leading-5 text-slate-500">
        Evidence signals are deterministic resume-internal interpretations, not
        independent verification or a hiring recommendation. Feedback already
        received remains in your account until the related Proof Brief, saved
        report, or account is deleted.
      </p>
    </section>
  );
}
