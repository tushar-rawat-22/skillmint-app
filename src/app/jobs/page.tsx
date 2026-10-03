"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import {
  premiumPageStack,
  premiumPrimaryCta,
  premiumSecondaryCta,
  premiumSurface,
} from "@/components/ui/premium";
import type { UserProfile } from "@/intelligence/types/profile";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import { useCareerData } from "@/modules/dashboard/hooks/useCareerData";
import type {
  CandidateJobLifecycleMutation,
  CandidateJobLifecycleRecord,
} from "@/modules/jobs/candidateJobLifecycle";
import {
  buildCandidateJobResult,
  type CandidateJob,
  type CandidateJobRequirement,
  type CandidateJobResult,
  type ResumeEvidence,
} from "@/modules/jobs/explainableJobFit";

type ApiJob = CandidateJob & {
  boardToken: string;
  titleMatchReason: string;
  requirements: CandidateJobRequirement[];
};
type SourceStatus = {
  provider: "greenhouse";
  configuredSources: number;
  failedSources: number;
  fetchedAt: string;
  staleResultsServed: false;
};
type JobsResponse = {
  ok: true;
  targetRole: string;
  jobs: ApiJob[];
  sourceStatus: SourceStatus;
};
type RecoveryAction = "login" | "retry" | "recruiter" | null;
type LoadState = {
  status: "idle" | "loading" | "ready" | "error";
  jobs: CandidateJobResult[];
  sourceStatus: SourceStatus | null;
  message: string | null;
  recovery: RecoveryAction;
};
type LifecycleState = {
  ownerId: string | null;
  status: "idle" | "loading" | "ready" | "error";
  records: CandidateJobLifecycleRecord[];
  message: string | null;
};

export default function JobsPage() {
  const { user, session, isLoading: authLoading, isConfigured } = useAuthSession();
  const currentUserId = authLoading ? undefined : user?.id ?? null;
  const data = useCareerData(currentUserId);
  const targetRole = data.targetRole?.trim() ?? "";
  const evidence = useMemo(() => buildResumeEvidence(data.profile), [data.profile]);
  const hasOwnedResume = data.hasStoredAnalysis && evidence.length > 0;
  const [state, setState] = useState<LoadState>({ status: "idle", jobs: [], sourceStatus: null, message: null, recovery: null });
  const [lifecycle, setLifecycle] = useState<LifecycleState>({ ownerId: null, status: "idle", records: [], message: null });
  const [pendingSourceKey, setPendingSourceKey] = useState<string | null>(null);
  const [mutationMessages, setMutationMessages] = useState<Record<string, string>>({});
  const requestIdRef = useRef(0);
  const lifecycleRequestIdRef = useRef(0);

  const loadJobs = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !targetRole || !hasOwnedResume) return;
    const requestId = ++requestIdRef.current;
    setState({ status: "loading", jobs: [], sourceStatus: null, message: null, recovery: null });
    try {
      const response = await fetch(`/api/jobs/greenhouse?targetRole=${encodeURIComponent(targetRole)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await response.json() as JobsResponse | { ok: false; error?: string };
      if (requestId !== requestIdRef.current) return;
      if (!response.ok || !payload.ok) {
        const errorCode = "error" in payload ? payload.error : undefined;
        setState({ status: "error", jobs: [], sourceStatus: null, message: describeError(response.status, errorCode), recovery: recoveryForError(response.status, errorCode) });
        return;
      }
      const jobs = payload.jobs.flatMap((job) => {
        const result = buildCandidateJobResult({ job, requirements: job.requirements, resumeEvidence: evidence, targetRole, whyShown: job.titleMatchReason });
        return result.ok ? [result.result] : [];
      });
      setState({
        status: "ready",
        jobs,
        sourceStatus: payload.sourceStatus,
        message: jobs.length === 0
          ? "No current Greenhouse job in the bounded source set has both direct target-role title overlap and safely extracted explicit requirements. Nothing stale or loosely ranked was substituted."
          : null,
        recovery: null,
      });
    } catch {
      if (requestId !== requestIdRef.current) return;
      setState({ status: "error", jobs: [], sourceStatus: null, message: "Live job sources are unavailable right now. SkillMint did not substitute cached or stale jobs.", recovery: "retry" });
    }
  }, [evidence, hasOwnedResume, session?.access_token, targetRole]);

  const loadLifecycle = useCallback(async (expectedUserId: string) => {
    const requestId = ++lifecycleRequestIdRef.current;
    setLifecycle({ ownerId: expectedUserId, status: "loading", records: [], message: null });
    try {
      const response = await fetch("/api/candidate/jobs", { cache: "no-store" });
      const payload = await response.json() as { records?: unknown; code?: string };
      if (requestId !== lifecycleRequestIdRef.current) return;
      if (!response.ok || !Array.isArray(payload.records)) {
        setLifecycle({ ownerId: expectedUserId, status: "error", records: [], message: describeLifecycleError(response.status, payload.code) });
        return;
      }
      const records = payload.records.filter(
        (record): record is CandidateJobLifecycleRecord => isLifecycleRecord(record, expectedUserId),
      );
      if (records.length !== payload.records.length) {
        setLifecycle({ ownerId: expectedUserId, status: "error", records: [], message: "Saved job history returned an invalid owner or record." });
        return;
      }
      setLifecycle({ ownerId: expectedUserId, status: "ready", records, message: null });
    } catch {
      if (requestId !== lifecycleRequestIdRef.current) return;
      setLifecycle({ ownerId: expectedUserId, status: "error", records: [], message: "Saved job history is temporarily unavailable. Live jobs remain read-only until it recovers." });
    }
  }, []);

  useEffect(() => {
    if (authLoading || typeof currentUserId !== "string") return;
    const timer = window.setTimeout(() => void loadLifecycle(currentUserId), 0);
    return () => {
      window.clearTimeout(timer);
      lifecycleRequestIdRef.current += 1;
    };
  }, [authLoading, currentUserId, loadLifecycle]);

  useEffect(() => {
    if (authLoading || typeof currentUserId !== "string" || !hasOwnedResume || !targetRole) return;
    const timer = window.setTimeout(() => void loadJobs(), 0);
    return () => {
      window.clearTimeout(timer);
      requestIdRef.current += 1;
    };
  }, [authLoading, currentUserId, hasOwnedResume, loadJobs, targetRole]);

  const visibleLifecycle = lifecycle.ownerId === currentUserId
    ? lifecycle
    : { ownerId: currentUserId ?? null, status: "idle" as const, records: [], message: null };
  const lifecycleBySourceKey = useMemo(
    () => new Map(visibleLifecycle.records.map((record) => [record.sourceKey, record])),
    [visibleLifecycle.records],
  );
  const savedOnlyRecords = visibleLifecycle.records.filter(
    (record) => !state.jobs.some((result) => result.job.sourceKey === record.sourceKey),
  );

  async function mutateLifecycle(sourceKey: string, mutation: CandidateJobLifecycleMutation) {
    if (typeof currentUserId !== "string" || pendingSourceKey) return;
    const expectedUserId = currentUserId;
    setPendingSourceKey(sourceKey);
    setMutationMessages((messages) => ({ ...messages, [sourceKey]: "" }));
    try {
      const response = await fetch(`/api/candidate/jobs/${encodeURIComponent(sourceKey)}`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(mutation),
      });
      const payload = await response.json() as { record?: unknown; code?: string };
      if (!response.ok || !isLifecycleRecord(payload.record, expectedUserId)) {
        setMutationMessages((messages) => ({ ...messages, [sourceKey]: describeLifecycleMutationError(response.status, payload.code) }));
        return;
      }
      const nextRecord = payload.record;
      setLifecycle((current) => {
        if (current.ownerId !== expectedUserId) return current;
        const records = [nextRecord, ...current.records.filter((record) => record.sourceKey !== sourceKey)];
        return { ownerId: expectedUserId, status: "ready", records, message: null };
      });
      setMutationMessages((messages) => ({ ...messages, [sourceKey]: successMessage(mutation, nextRecord) }));
    } catch {
      setMutationMessages((messages) => ({ ...messages, [sourceKey]: "The update did not finish. Your last saved state was preserved; try again." }));
    } finally {
      setPendingSourceKey((current) => current === sourceKey ? null : current);
    }
  }

  if (authLoading) return <DashboardLayout><section className={premiumSurface} role="status"><p className="text-sm text-slate-600">Checking your candidate session…</p></section></DashboardLayout>;
  if (!isConfigured || !user || !session) return <Gate title="Sign in to use your private resume evidence." copy="Job discovery is part of the authenticated candidate workspace. Resume evidence is not sent to Greenhouse." href="/login" action="Candidate login" />;
  if (!targetRole) return <Gate title="Set your target role first." copy="SkillMint only shows jobs with explicit title overlap to the role you chose. It does not invent a target from your resume." href="/setup" action="Set target role" />;
  if (!hasOwnedResume) return <Gate title="Add a resume before comparing job evidence." copy="Your owned active resume stays in the candidate workspace. The job-source request contains your target role and authenticated session only." href="/upload" action="Upload resume" />;

  const primaryResult = state.jobs[0] ?? null;
  const primaryRecord = primaryResult
    ? lifecycleBySourceKey.get(primaryResult.job.sourceKey) ?? null
    : visibleLifecycle.records[0] ?? null;

  return (
    <DashboardLayout>
      <div className={premiumPageStack}>
        <DecisionWorkspaceHeader targetRole={targetRole} result={primaryResult} record={primaryRecord} isRefreshing={state.status === "loading"} onRefresh={() => void loadJobs()} />

        {visibleLifecycle.status === "loading" && <section className={premiumSurface} role="status"><p className="text-sm text-slate-600">Restoring your saved application decisions…</p></section>}
        {visibleLifecycle.status === "error" && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5" role="alert">
            <h2 className="font-bold text-rose-950">Saved job history unavailable</h2>
            <p className="mt-2 text-sm leading-6 text-rose-900">{visibleLifecycle.message}</p>
            <button type="button" onClick={() => void loadLifecycle(user.id)} className={`${premiumSecondaryCta} mt-4`}>Retry saved history</button>
          </section>
        )}

        {state.status === "loading" && <section className={premiumSurface} role="status"><p className="text-sm text-slate-600">Checking current Greenhouse postings and explicit requirements…</p></section>}
        {state.status === "error" && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5" role="alert">
            <h2 className="font-bold text-rose-950">Live jobs unavailable</h2>
            <p className="mt-2 text-sm leading-6 text-rose-900">{state.message}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {state.recovery === "login" ? <Link href="/login" className={premiumPrimaryCta}>Sign in again</Link> : state.recovery === "recruiter" ? <Link href="/recruiters" className={premiumPrimaryCta}>Open recruiter workspace</Link> : <button type="button" onClick={() => void loadJobs()} className={premiumPrimaryCta}>Retry live jobs</button>}
              {state.recovery !== "recruiter" && <Link href="/setup" className="text-sm font-semibold text-rose-950 underline underline-offset-4">Review target role</Link>}
            </div>
          </section>
        )}
        {state.status === "ready" && state.message && (
          <section className={premiumSurface} role="status">
            <h2 className="font-bold text-slate-950">No trustworthy live match to show yet</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{state.message}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void loadJobs()} className={premiumPrimaryCta}>Refresh live jobs</button>
              <Link href="/setup" className="text-sm font-semibold text-emerald-800 underline underline-offset-4">Review target role</Link>
            </div>
          </section>
        )}

        {state.jobs.length > 0 && (
          <section aria-labelledby="live-jobs-title" className="space-y-5">
            <div className="flex flex-col gap-2 border-b border-slate-300 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">Live opportunities</p><h2 id="live-jobs-title" className="mt-2 text-2xl font-black text-slate-950">Jobs for {targetRole}</h2></div>
              <p className="max-w-xl text-sm leading-6 text-slate-600">Evidence explains the decision; it is not a hiring score or prediction.</p>
            </div>
            {state.jobs.map((job) => (
              <JobCard key={job.job.sourceKey} result={job} record={lifecycleBySourceKey.get(job.job.sourceKey) ?? null} pending={pendingSourceKey === job.job.sourceKey} message={mutationMessages[job.job.sourceKey] ?? ""} lifecycleAvailable={visibleLifecycle.status === "ready"} onMutate={mutateLifecycle} />
            ))}
          </section>
        )}

        {savedOnlyRecords.length > 0 && (
          <section aria-labelledby="saved-jobs-title" className="space-y-5">
            <div className="border-b border-slate-300 pb-4"><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">Durable history</p><h2 id="saved-jobs-title" className="mt-2 text-2xl font-black text-slate-950">Saved jobs outside the current live result set</h2><p className="mt-2 text-sm leading-6 text-slate-600">Provider availability and your application state stay separate. A missing or closed posting is not an employer decision.</p></div>
            {savedOnlyRecords.map((record) => <SavedJobCard key={record.sourceKey} record={record} pending={pendingSourceKey === record.sourceKey} message={mutationMessages[record.sourceKey] ?? ""} onMutate={mutateLifecycle} />)}
          </section>
        )}

        {state.sourceStatus && <section className="border-t border-slate-300 pt-5 text-xs leading-5 text-slate-500"><p>Source: Greenhouse public Job Board API · checked {new Date(state.sourceStatus.fetchedAt).toLocaleString()} · {state.sourceStatus.failedSources} of {state.sourceStatus.configuredSources} bounded sources unavailable · stale results served: no.</p><p className="mt-1">Results are alphabetical after explicit target-role title overlap and requirement extraction. SkillMint does not rank candidates or infer hiring probability.</p></section>}
      </div>
    </DashboardLayout>
  );
}

function DecisionWorkspaceHeader({ targetRole, result, record, isRefreshing, onRefresh }: { targetRole: string; result: CandidateJobResult | null; record: CandidateJobLifecycleRecord | null; isRefreshing: boolean; onRefresh: () => void }) {
  const strongest = result?.explanation.supportedRequirements[0];
  const gap = result?.explanation.evidenceGaps[0];
  return (
    <section className={premiumSurface} aria-labelledby="decision-workspace-title">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div><p className="text-sm font-semibold text-emerald-800">Career Decision Workspace</p><h1 id="decision-workspace-title" className="mt-3 text-4xl font-black tracking-[-0.03em] text-slate-950">Choose the next truthful move</h1><p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">Compare live requirements with your current resume evidence, save the opportunity you choose, and recover your application decision after a fresh session. Resume evidence is not sent to the job provider.</p></div>
        <button type="button" onClick={onRefresh} disabled={isRefreshing} className={premiumSecondaryCta}>{isRefreshing ? "Checking live jobs…" : "Refresh live jobs"}</button>
      </div>
      <dl className="mt-7 divide-y divide-slate-200 border-y border-slate-200">
        <DecisionRow term="Active target" detail={targetRole} />
        <DecisionRow term="Strongest evidence" detail={strongest ? `${strongest.requirement} — ${strongest.evidence.map((item) => item.label).join(", ")}` : result ? "No extracted requirement has matching resume evidence yet." : "Load a live job to compare explicit requirements with your resume."} />
        <DecisionRow term="Biggest gap" detail={gap?.requirement ?? (result ? "No unmatched extracted requirement in this posting. This is not a hiring prediction." : "No live requirement is available to assess right now.")} />
        <DecisionRow term="One next action" detail={nextAction(record, Boolean(result))} />
      </dl>
      <div className="mt-5 grid gap-3 text-xs leading-5 text-slate-600 sm:grid-cols-3">
        <p><strong className="text-slate-900">No auto-apply.</strong> You open the original posting and record your own action.</p>
        <p><strong className="text-slate-900">No hiring probability.</strong> Evidence coverage does not predict employer behavior.</p>
        <p><strong className="text-slate-900">No invented outcome.</strong> Closed or unavailable describes the posting, not your application.</p>
      </div>
    </section>
  );
}

function DecisionRow({ term, detail }: { term: string; detail: string }) {
  return <div className="grid gap-1 py-4 sm:grid-cols-[10rem_1fr] sm:gap-5"><dt className="text-sm font-bold text-slate-950">{term}</dt><dd className="text-sm leading-6 text-slate-700">{detail}</dd></div>;
}

function Gate({ title, copy, href, action }: { title: string; copy: string; href: string; action: string }) {
  return <DashboardLayout><section className={premiumSurface}><p className="text-sm font-semibold text-emerald-800">Career Decision Workspace</p><h1 className="mt-3 text-3xl font-black text-slate-950">{title}</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">{copy}</p><Link href={href} className={`${premiumPrimaryCta} mt-6`}>{action}</Link></section></DashboardLayout>;
}

function JobCard({ result, record, pending, message, lifecycleAvailable, onMutate }: { result: CandidateJobResult; record: CandidateJobLifecycleRecord | null; pending: boolean; message: string; lifecycleAvailable: boolean; onMutate: (sourceKey: string, mutation: CandidateJobLifecycleMutation) => void }) {
  const supported = result.explanation.supportedRequirements;
  const gaps = result.explanation.evidenceGaps;
  return <article className={premiumSurface}>
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">{result.job.companyName ?? "Employer"} · Greenhouse</p><h3 className="mt-2 text-2xl font-black text-slate-950">{result.job.title}</h3><p className="mt-2 text-sm text-slate-600">{result.job.location ?? "Location not provided by source"}</p><p className="mt-2 text-xs leading-5 text-slate-500">Posting updated by source: {formatFreshnessTimestamp(result.job.sourceUpdatedAt)} · checked by SkillMint: {formatFreshnessTimestamp(result.job.fetchedAt)}</p><p className="mt-4 max-w-3xl text-sm leading-6 text-slate-700">{result.explanation.whyShown}</p></div><JobActions sourceKey={result.job.sourceKey} originalApplyUrl={result.primaryAction.href} record={record} pending={pending} lifecycleAvailable={lifecycleAvailable} onMutate={onMutate} /></div>
    {record && <LifecycleProgress record={record} />}
    {message && <p className="mt-4 text-sm font-semibold text-slate-700" role="status">{message}</p>}
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><h4 className="font-bold text-emerald-950">Supported by this resume ({supported.length})</h4>{supported.length === 0 ? <p className="mt-3 text-sm leading-6 text-emerald-900">No extracted requirement has matching resume evidence yet.</p> : <ul className="mt-3 space-y-4">{supported.map((item) => <li key={item.requirementId} className="text-sm leading-6 text-emerald-950"><p className="font-semibold">{item.requirement}</p><p className="mt-1 text-xs leading-5 text-emerald-800">Resume evidence: {item.evidence.map((entry) => entry.label).join(", ")}</p></li>)}</ul>}</section>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h4 className="font-bold text-amber-950">Not evidenced in this resume ({gaps.length})</h4>{gaps.length === 0 ? <p className="mt-3 text-sm leading-6 text-amber-900">Every extracted requirement has some resume evidence. That is not a hiring prediction.</p> : <ul className="mt-3 space-y-3">{gaps.map((item) => <li key={item.requirementId} className="text-sm leading-6 text-amber-950">{item.requirement}</li>)}</ul>}</section>
    </div>
    <p className="mt-5 text-xs leading-5 text-slate-500">{result.trust.disclaimer}</p>
  </article>;
}

function SavedJobCard({ record, pending, message, onMutate }: { record: CandidateJobLifecycleRecord; pending: boolean; message: string; onMutate: (sourceKey: string, mutation: CandidateJobLifecycleMutation) => void }) {
  return <article className={premiumSurface}>
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-600">{record.companyName} · saved Greenhouse posting</p><h3 className="mt-2 text-2xl font-black text-slate-950">{record.roleTitle}</h3><p className="mt-2 text-sm text-slate-600">{record.location ?? "Location not provided by source"}</p><p className="mt-4 max-w-3xl text-sm leading-6 text-slate-700">This posting is not in the current live result set. Your candidate-recorded state remains available and has not been rewritten as an employer outcome.</p></div><JobActions sourceKey={record.sourceKey} originalApplyUrl={record.originalApplyUrl} record={record} pending={pending} lifecycleAvailable onMutate={onMutate} /></div>
    <LifecycleProgress record={record} />
    {message && <p className="mt-4 text-sm font-semibold text-slate-700" role="status">{message}</p>}
  </article>;
}

function JobActions({ sourceKey, originalApplyUrl, record, pending, lifecycleAvailable, onMutate }: { sourceKey: string; originalApplyUrl: string; record: CandidateJobLifecycleRecord | null; pending: boolean; lifecycleAvailable: boolean; onMutate: (sourceKey: string, mutation: CandidateJobLifecycleMutation) => void }) {
  const [followUpDate, setFollowUpDate] = useState("");
  if (!record) return <div className="flex min-w-52 flex-col gap-3"><button type="button" disabled={pending || !lifecycleAvailable} onClick={() => onMutate(sourceKey, { action: "save" })} className={premiumPrimaryCta}>{pending ? "Saving…" : "Save job"}</button><a href={originalApplyUrl} target="_blank" rel="noopener noreferrer" className={premiumSecondaryCta}>View original job</a></div>;
  return <div className="flex min-w-52 flex-col gap-3">
    <a href={record.originalApplyUrl} target="_blank" rel="noopener noreferrer" className={record.workflowState === "saved" ? premiumPrimaryCta : premiumSecondaryCta}>View original job</a>
    {record.workflowState === "saved" && <button type="button" disabled={pending} onClick={() => onMutate(sourceKey, { action: "mark_applied" })} className={premiumSecondaryCta}>{pending ? "Updating…" : "Mark as applied"}</button>}
    {record.workflowState === "applied" && !record.followUpCompletedAt && <div className="rounded-xl border border-slate-200 p-3"><label className="block text-xs font-bold text-slate-800" htmlFor={`follow-up-${sourceKey}`}>Follow-up date</label><input id={`follow-up-${sourceKey}`} type="date" value={followUpDate} onChange={(event) => setFollowUpDate(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700" /><button type="button" disabled={pending || !followUpDate} onClick={() => onMutate(sourceKey, { action: "set_follow_up", followUpAt: new Date(`${followUpDate}T09:00:00`).toISOString() })} className={`${premiumSecondaryCta} mt-2 w-full`}>{record.followUpAt ? "Change follow-up" : "Set follow-up"}</button></div>}
    {record.workflowState === "applied" && record.followUpAt && !record.followUpCompletedAt && <button type="button" disabled={pending} onClick={() => onMutate(sourceKey, { action: "complete_follow_up" })} className={premiumPrimaryCta}>Complete follow-up</button>}
    <button type="button" disabled={pending} onClick={() => onMutate(sourceKey, { action: "refresh_provider" })} className={premiumSecondaryCta}>{pending ? "Checking…" : "Refresh posting status"}</button>
    {record.workflowState === "applied" && <button type="button" disabled={pending} onClick={() => onMutate(sourceKey, { action: "withdraw" })} className="text-sm font-semibold text-slate-600 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700">Record withdrawal</button>}
  </div>;
}

function LifecycleProgress({ record }: { record: CandidateJobLifecycleRecord }) {
  const steps = [
    { label: "Saved", complete: true, detail: `Saved ${formatShortDate(record.createdAt)}` },
    { label: "Applied", complete: Boolean(record.appliedAt), detail: record.appliedAt ? formatShortDate(record.appliedAt) : "Not recorded" },
    { label: "Follow-up", complete: Boolean(record.followUpCompletedAt), detail: record.followUpCompletedAt ? `Completed ${formatShortDate(record.followUpCompletedAt)}` : record.followUpAt ? `Planned ${formatShortDate(record.followUpAt)}` : "Optional after applying" },
    { label: "Posting", complete: record.providerAvailability === "live", detail: providerAvailabilityLabel(record.providerAvailability) },
  ];
  return <ol className="mt-6 grid gap-2 border-y border-slate-200 py-4 sm:grid-cols-4" aria-label="Application progression">{steps.map((step, index) => <li key={step.label} className="min-w-0 border-l-2 border-slate-300 pl-3 first:border-emerald-700"><p className="text-xs font-bold uppercase tracking-wide text-slate-700">{index + 1}. {step.label}</p><p className={`mt-1 text-sm leading-5 ${step.complete ? "font-semibold text-slate-950" : "text-slate-600"}`}>{step.detail}</p></li>)}</ol>;
}

function formatFreshnessTimestamp(value: string | null): string {
  if (!value) return "not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "not provided" : date.toLocaleString();
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "date unavailable" : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function providerAvailabilityLabel(value: CandidateJobLifecycleRecord["providerAvailability"]): string {
  if (value === "live") return "Live at last provider check";
  if (value === "stale") return "Saved snapshot is stale; refresh before relying on it";
  if (value === "closed") return "Posting closed or removed; no employer outcome inferred";
  return "Provider unavailable; saved candidate state preserved";
}

function nextAction(record: CandidateJobLifecycleRecord | null, hasLiveResult: boolean): string {
  if (!record) return hasLiveResult ? "Save the opportunity you want to pursue." : "Refresh live jobs while keeping your active target specific.";
  if (record.workflowState === "saved") return "Open the original posting; record Applied only after you submit.";
  if (record.workflowState === "applied" && !record.followUpAt) return "Choose an optional follow-up date you can actually honor.";
  if (record.workflowState === "applied" && !record.followUpCompletedAt) return `Complete the follow-up planned for ${formatShortDate(record.followUpAt!)}.`;
  if (record.workflowState === "withdrawn") return "Keep this as candidate-recorded history or archive it later.";
  return "Refresh the provider status before making another decision.";
}

function buildResumeEvidence(profile: UserProfile): ResumeEvidence[] {
  const rows: ResumeEvidence[] = [];
  profile.skills.forEach((text, index) => text.trim() && rows.push({ id: `skill-${index + 1}`, label: `Skill: ${text.trim()}`, text }));
  profile.projects.forEach((text, index) => text.trim() && rows.push({ id: `project-${index + 1}`, label: `Project ${index + 1}`, text }));
  profile.experience.forEach((text, index) => text.trim() && rows.push({ id: `experience-${index + 1}`, label: `Experience ${index + 1}`, text }));
  if (profile.education.trim()) rows.push({ id: "education", label: "Education", text: profile.education });
  return rows;
}

function isLifecycleRecord(value: unknown, expectedUserId: string): value is CandidateJobLifecycleRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return record.userId === expectedUserId && typeof record.id === "string" && record.provider === "greenhouse" && typeof record.sourceKey === "string" && typeof record.originalApplyUrl === "string" && typeof record.roleTitle === "string" && typeof record.companyName === "string" && typeof record.sourceFetchedAt === "string" && ["live", "stale", "closed", "unavailable"].includes(String(record.providerAvailability)) && ["saved", "applied", "withdrawn", "archived"].includes(String(record.workflowState));
}

function successMessage(mutation: CandidateJobLifecycleMutation, record: CandidateJobLifecycleRecord): string {
  if (mutation.action === "save") return "Saved to your private candidate workspace.";
  if (mutation.action === "mark_applied") return "Applied recorded by you; this does not claim employer receipt or response.";
  if (mutation.action === "set_follow_up") return "Follow-up date saved.";
  if (mutation.action === "complete_follow_up") return "Follow-up marked complete without changing application outcome.";
  if (mutation.action === "withdraw") return "Withdrawal recorded by you.";
  if (mutation.action === "archive") return "Job archived in your private history.";
  return providerAvailabilityLabel(record.providerAvailability);
}

function recoveryForError(status: number, code?: string): RecoveryAction {
  if (status === 401 || code === "not_authenticated") return "login";
  if (status === 403 && code === "candidate_persona_required") return "recruiter";
  return "retry";
}

function describeError(status: number, code?: string): string {
  if (status === 401 || code === "not_authenticated") return "Your candidate session is no longer valid. Sign in again before loading jobs.";
  if (status === 403 && code === "candidate_persona_required") return "This account is assigned to the recruiter workspace, so candidate job discovery is unavailable here.";
  if (code === "upstream_unavailable") return "The bounded Greenhouse sources are unavailable right now. SkillMint did not serve stale results.";
  if (status === 503) return "The job dependency is temporarily unavailable. SkillMint did not substitute cached or stale jobs.";
  return "SkillMint could not load trustworthy jobs for this target role right now.";
}

function describeLifecycleError(status: number, code?: string): string {
  if (status === 401 || code === "not_authenticated") return "Your session ended before saved job history could be restored. Sign in again.";
  if (status === 403 || code === "candidate_persona_required") return "Saved candidate job history is only available in the candidate workspace.";
  return "Saved job history is temporarily unavailable. Live jobs remain read-only until it recovers.";
}

function describeLifecycleMutationError(status: number, code?: string): string {
  if (status === 401 || code === "not_authenticated") return "Your session ended before the update. Sign in again; no candidate state was changed.";
  if (code === "provider_unavailable") return "The provider could not verify this posting. Your last saved candidate state was preserved.";
  if (code === "job_not_live") return "The posting is no longer live, so it was not newly saved.";
  if (status === 409 || code === "invalid_transition") return "That step is not available from the current saved state. Reload the workspace and try again.";
  return "The update did not finish. Your last saved state was preserved; try again.";
}
