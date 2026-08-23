"use client";

/* eslint-disable react-hooks/set-state-in-effect -- The review fetch deliberately initializes server-authorized recruiter context after mount. */

import Link from "next/link";
import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { premiumEyebrow, premiumPrimaryCta, premiumSecondaryCta, premiumSurface } from "@/components/ui/premium";
import { ROUTES } from "@/constants/routes";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import type { ProofBriefPayload } from "@/modules/proofBrief/types";
import type { AccountPersona, RecruiterRoleMap } from "../types";

export default function RecruiterReviewClient({ shareToken, brief }: { shareToken: string; brief: ProofBriefPayload }) {
  const { user, isLoading: isAuthLoading } = useAuthSession();
  const currentUserId = isAuthLoading ? undefined : user?.id ?? null;
  const activeOwnerRef = useRef<string | null | undefined>(currentUserId);
  const [loadedOwnerId, setLoadedOwnerId] = useState<string | null>(null);
  const [persona, setPersona] = useState<AccountPersona | null>(null);
  const [maps, setMaps] = useState<RecruiterRoleMap[]>([]);
  const [status, setStatus] = useState("Loading recruiter context…");
  const [signedOut, setSignedOut] = useState(false);
  const [roleMapId, setRoleMapId] = useState("");
  const [questionCategory, setQuestionCategory] = useState("APPLIED_EXAMPLE");
  const [evidenceLabel, setEvidenceLabel] = useState(brief.evidenceSignals[0]?.label ?? "");
  const [feedbackCategory, setFeedbackCategory] = useState("BRIEF_MADE_EVIDENCE_CLEARER");
  const [reviewEase, setReviewEase] = useState("EASIER");
  const [reviewTimeSignal, setReviewTimeSignal] = useState("NOT_SURE");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const load = useCallback(async (expectedUserId: string, signal?: AbortSignal) => {
    try {
      const response = await fetch(`/api/recruiter-evidence?expectedUserId=${encodeURIComponent(expectedUserId)}`, { credentials: "same-origin", cache: "no-store", signal });
      if (activeOwnerRef.current !== expectedUserId) return;
      if (response.status === 401) { setLoadedOwnerId(expectedUserId); setSignedOut(true); setStatus("Log in with a recruiter account to send a question or feedback."); return; }
      const body = await response.json() as { ownerId?: string; persona?: AccountPersona | null; roleMaps?: RecruiterRoleMap[] };
      if (!response.ok || body.ownerId !== expectedUserId || !Array.isArray(body.roleMaps)) throw new Error();
      setLoadedOwnerId(expectedUserId); setSignedOut(false); setPersona(body.persona ?? null); setMaps(body.roleMaps); setRoleMapId(body.roleMaps[0]?.id || ""); setStatus("");
    } catch {
      if (signal?.aborted || activeOwnerRef.current !== expectedUserId) return;
      setLoadedOwnerId(expectedUserId); setStatus("Recruiter review actions are unavailable in this environment.");
    }
  }, []);
  useEffect(() => { activeOwnerRef.current = currentUserId; }, [currentUserId]);
  useEffect(() => {
    setPersona(null); setMaps([]); setRoleMapId(""); setSubmitted(false); setSubmitting(false); setLoadedOwnerId(null);
    setQuestionCategory("APPLIED_EXAMPLE"); setEvidenceLabel(brief.evidenceSignals[0]?.label ?? ""); setFeedbackCategory("BRIEF_MADE_EVIDENCE_CLEARER"); setReviewEase("EASIER"); setReviewTimeSignal("NOT_SURE"); setNote("");
    if (currentUserId === undefined) { setSignedOut(false); setStatus("Loading recruiter context…"); return; }
    if (currentUserId === null) { setSignedOut(true); setStatus("Log in with a recruiter account to send a question or feedback."); return; }
    setSignedOut(false); setStatus("Loading recruiter context…");
    const controller = new AbortController();
    void load(currentUserId, controller.signal);
    return () => controller.abort();
  }, [brief.evidenceSignals, currentUserId, load]);
  const chosenMap = useMemo(() => maps.find((map) => map.id === roleMapId) ?? null, [maps, roleMapId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (typeof currentUserId !== "string" || loadedOwnerId !== currentUserId) return;
    const expectedUserId = currentUserId;
    setSubmitting(true); setStatus("");
    try {
      const response = await fetch("/api/recruiter-evidence", { method: "POST", credentials: "same-origin", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "submit_review", expectedUserId, shareToken, roleMapId, questionCategory, evidenceLabel: questionCategory === "APPLIED_EXAMPLE" ? evidenceLabel : null, feedbackCategory, reviewEase, reviewTimeSignal, note: note || null }) });
      if (activeOwnerRef.current !== expectedUserId) return;
      if (!response.ok) { setStatus(response.status === 409 ? "Feedback for this brief and role map was already submitted." : response.status === 404 ? "The candidate link or role map is no longer available." : "The structured review could not be sent."); return; }
      setSubmitted(true); setStatus("Structured evidence feedback was sent to the candidate.");
    } catch { if (activeOwnerRef.current === expectedUserId) setStatus("The structured review could not reach the server."); } finally { if (activeOwnerRef.current === expectedUserId) setSubmitting(false); }
  }

  if (currentUserId === undefined || (typeof currentUserId === "string" && loadedOwnerId !== currentUserId)) return <Gate message="Loading recruiter context…" />;
  if (signedOut) return <Gate message={status} login />;
  if (persona === null) return <Gate message={status || "Set up a server-owned recruiter persona in the recruiter workspace before sending feedback."} workspace />;
  if (persona !== "RECRUITER") return <Gate message="This account is set up as a candidate and cannot submit recruiter feedback." />;
  if (!maps.length) return <Gate message="Create a role evidence map before reviewing this candidate-authorized brief." workspace />;

  return <section className={premiumSurface} aria-labelledby="review-form-title"><p className={premiumEyebrow}>Human evidence review</p><h2 id="review-form-title" className="mt-3 text-2xl font-black">Ask one focused question and send structured feedback</h2><p className="mt-3 text-sm leading-6 text-slate-600">The candidate receives the role title, generated evidence question, selected categories, and optional note. Your account identifier and the raw JD are not sent.</p>
    <form className="mt-6 grid gap-5" onSubmit={submit}>
      <Select label="Role evidence map" value={roleMapId} onChange={setRoleMapId} options={maps.map((map) => [map.id, map.roleTitle])} />
      {chosenMap ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><strong>{chosenMap.roleTitle}</strong><p className="mt-1 text-slate-600">{chosenMap.evidenceMap.summary}</p></div> : null}
      <Select label="Evidence question" value={questionCategory} onChange={setQuestionCategory} options={[["APPLIED_EXAMPLE", "Ask for an applied example"], ["OWNERSHIP_CONTEXT", "Ask about ownership"], ["OUTCOME_CONTEXT", "Ask about outcomes"], ["VALIDATION_CONTEXT", "Ask about testing or validation"], ["TEAM_REVIEW_CONTEXT", "Ask about team review"]]} />
      {questionCategory === "APPLIED_EXAMPLE" ? <Select label="Evidence signal" value={evidenceLabel} onChange={setEvidenceLabel} options={brief.evidenceSignals.map((signal) => [signal.label, `${signal.label} · ${signal.state.toLowerCase()} support`])} /> : null}
      <Select label="Structured feedback" value={feedbackCategory} onChange={setFeedbackCategory} options={[["BRIEF_MADE_EVIDENCE_CLEARER", "The brief made the evidence clearer"], ["NEEDS_MORE_OWNERSHIP_CONTEXT", "Needs more ownership context"], ["NEEDS_MORE_OUTCOME_CONTEXT", "Needs more outcome context"], ["NEEDS_MORE_VALIDATION_CONTEXT", "Needs more validation context"], ["ROLE_RELEVANCE_REMAINS_UNCLEAR", "Role relevance remains unclear"]]} />
      <Select label="Compared with a resume alone" value={reviewEase} onChange={setReviewEase} options={[["EASIER", "Easier to evaluate"], ["ABOUT_THE_SAME", "About the same"], ["HARDER", "Harder to evaluate"]]} />
      <Select label="Review-time signal" value={reviewTimeSignal} onChange={setReviewTimeSignal} options={[["LESS_TIME", "Took less time"], ["ABOUT_THE_SAME", "Took about the same time"], ["MORE_TIME", "Took more time"], ["NOT_SURE", "Not sure"]]} />
      <label className="text-sm font-bold">Optional note<textarea maxLength={1000} rows={4} value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal" /></label>
      <button disabled={submitting || submitted || (questionCategory === "APPLIED_EXAMPLE" && !evidenceLabel)} className={`${premiumPrimaryCta} disabled:opacity-60`}>{submitting ? "Sending…" : submitted ? "Feedback sent" : "Send structured feedback"}</button>
    </form>{status ? <p role="status" className={`mt-4 text-sm ${submitted ? "text-emerald-800" : "text-rose-700"}`}>{status}</p> : null}
  </section>;
}

function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<readonly [string, string]> }) { return <label className="text-sm font-bold">{label}<select required value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-normal">{options.map(([option, text]) => <option key={option} value={option}>{text}</option>)}</select></label>; }
function Gate({ message, login = false, workspace = false }: { message: string; login?: boolean; workspace?: boolean }) { return <section className={`${premiumSurface} text-center`}><p className={premiumEyebrow}>Recruiter action gate</p><h2 className="mt-3 text-2xl font-black">{message}</h2>{login ? <Link href={ROUTES.LOGIN} className={`${premiumSecondaryCta} mt-5`}>Log in</Link> : null}{workspace ? <Link href={ROUTES.RECRUITER_WORKSPACE} className={`${premiumSecondaryCta} mt-5`}>Open recruiter workspace</Link> : null}</section>; }
