"use client";

import { useEffect, useState } from "react";

import { premiumEyebrow, premiumSurface } from "@/components/ui/premium";
import type { CandidateEvidenceReview } from "../types";

type FeedbackState = {
  readonly ownerId: string | null;
  readonly sourceResumeAnalysisId: string | null;
  readonly status: "idle" | "loading" | "ready" | "unavailable";
  readonly reviews: CandidateEvidenceReview[];
};

export default function CandidateRecruiterFeedbackCard({ currentUserId, sourceResumeAnalysisId }: { currentUserId: string | null | undefined; sourceResumeAnalysisId: string | null }) {
  const [state, setState] = useState<FeedbackState>({ ownerId: null, sourceResumeAnalysisId: null, status: "idle", reviews: [] });
  useEffect(() => {
    let active = true;
    if (!currentUserId || !sourceResumeAnalysisId) return;
    const expectedUserId = currentUserId;
    const expectedSourceId = sourceResumeAnalysisId;
    const controller = new AbortController();
    const query = new URLSearchParams({ candidateSource: expectedSourceId, expectedUserId });
    void fetch(`/api/recruiter-evidence?${query}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal })
      .then(async (response) => ({ ok: response.ok, body: await response.json() as { ownerId?: string; reviews?: CandidateEvidenceReview[] } }))
      .then(({ ok, body }) => {
        if (!active) return;
        if (!ok || body.ownerId !== expectedUserId || !Array.isArray(body.reviews)) setState({ ownerId: expectedUserId, sourceResumeAnalysisId: expectedSourceId, status: "unavailable", reviews: [] });
        else setState({ ownerId: expectedUserId, sourceResumeAnalysisId: expectedSourceId, status: "ready", reviews: body.reviews });
      })
      .catch(() => { if (active && !controller.signal.aborted) setState({ ownerId: expectedUserId, sourceResumeAnalysisId: expectedSourceId, status: "unavailable", reviews: [] }); });
    return () => { active = false; controller.abort(); };
  }, [currentUserId, sourceResumeAnalysisId]);
  const isCurrent = Boolean(currentUserId && sourceResumeAnalysisId && state.ownerId === currentUserId && state.sourceResumeAnalysisId === sourceResumeAnalysisId);
  if (!isCurrent || state.status === "idle" || state.status === "loading" || (state.status === "ready" && !state.reviews.length)) return null;
  return <section className={premiumSurface} aria-labelledby="candidate-recruiter-feedback-title"><p className={premiumEyebrow}>Recruiter evidence feedback</p><h2 id="candidate-recruiter-feedback-title" className="mt-3 text-2xl font-black">Questions received through your Proof Brief</h2>{state.status === "unavailable" ? <p className="mt-3 text-sm text-slate-600">Recruiter feedback is unavailable in this environment.</p> : <div className="mt-5 grid gap-4">{state.reviews.map((review) => <article key={review.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">{review.roleTitle}</p><h3 className="mt-2 font-black">{review.questionText}</h3><p className="mt-3 text-sm text-slate-700">{feedbackLabel(review.feedbackCategory)}</p>{review.note ? <p className="mt-3 border-l-4 border-slate-300 pl-3 text-sm text-slate-600">{review.note}</p> : null}<p className="mt-3 text-xs text-slate-500">Structured human feedback · not a hiring decision</p></article>)}</div>}</section>;
}
function feedbackLabel(value: CandidateEvidenceReview["feedbackCategory"]) { return ({ BRIEF_MADE_EVIDENCE_CLEARER: "The brief made the evidence clearer.", NEEDS_MORE_OWNERSHIP_CONTEXT: "More ownership context would help.", NEEDS_MORE_OUTCOME_CONTEXT: "More outcome context would help.", NEEDS_MORE_VALIDATION_CONTEXT: "More testing or validation context would help.", ROLE_RELEVANCE_REMAINS_UNCLEAR: "Role relevance remains unclear." } as const)[value]; }
