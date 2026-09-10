"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import { premiumPageStack, premiumPrimaryCta, premiumSurface } from "@/components/ui/premium";
import type { UserProfile } from "@/intelligence/types/profile";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import { useCareerData } from "@/modules/dashboard/hooks/useCareerData";
import {
  buildCandidateJobResult,
  type CandidateJob,
  type CandidateJobRequirement,
  type CandidateJobResult,
  type ResumeEvidence,
} from "@/modules/jobs/explainableJobFit";

type ApiJob = CandidateJob & { boardToken: string; titleMatchReason: string; requirements: CandidateJobRequirement[] };
type SourceStatus = { provider: "greenhouse"; configuredSources: number; failedSources: number; fetchedAt: string; staleResultsServed: false };
type JobsResponse = { ok: true; targetRole: string; jobs: ApiJob[]; sourceStatus: SourceStatus };
type RecoveryAction = "login" | "retry" | "recruiter" | null;
type LoadState = { status: "idle" | "loading" | "ready" | "error"; jobs: CandidateJobResult[]; sourceStatus: SourceStatus | null; message: string | null; recovery: RecoveryAction };

export default function JobsPage() {
  const { user, session, isLoading: authLoading, isConfigured } = useAuthSession();
  const currentUserId = authLoading ? undefined : user?.id ?? null;
  const data = useCareerData(currentUserId);
  const targetRole = data.targetRole?.trim() ?? "";
  const evidence = useMemo(() => buildResumeEvidence(data.profile), [data.profile]);
  const hasOwnedResume = data.hasStoredAnalysis && evidence.length > 0;
  const [state, setState] = useState<LoadState>({ status: "idle", jobs: [], sourceStatus: null, message: null, recovery: null });

  const loadJobs = useCallback(async () => {
    const token = session?.access_token;
    if (!token || !targetRole || !hasOwnedResume) return;
    setState({ status: "loading", jobs: [], sourceStatus: null, message: null, recovery: null });
    try {
      const response = await fetch(`/api/jobs/greenhouse?targetRole=${encodeURIComponent(targetRole)}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      const payload = await response.json() as JobsResponse | { ok: false; error?: string };
      if (!response.ok || !payload.ok) {
        const errorCode = "error" in payload ? payload.error : undefined;
        setState({
          status: "error",
          jobs: [],
          sourceStatus: null,
          message: describeError(response.status, errorCode),
          recovery: recoveryForError(response.status, errorCode),
        });
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
      setState({ status: "error", jobs: [], sourceStatus: null, message: "Live job sources are unavailable right now. SkillMint did not substitute cached or stale jobs.", recovery: "retry" });
    }
  }, [evidence, hasOwnedResume, session?.access_token, targetRole]);

  useEffect(() => {
    if (authLoading || typeof currentUserId !== "string" || !hasOwnedResume || !targetRole) return;
    const timer = window.setTimeout(() => {
      void loadJobs();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, currentUserId, hasOwnedResume, loadJobs, targetRole]);

  if (authLoading) return <DashboardLayout><section className={premiumSurface}><p className="text-sm text-slate-600">Checking your candidate session…</p></section></DashboardLayout>;
  if (!isConfigured || !user || !session) return <Gate title="Sign in to use your private resume evidence." copy="Job discovery is part of the authenticated candidate workspace. Resume evidence is not sent to Greenhouse." href="/login" action="Candidate login" />;
  if (!targetRole) return <Gate title="Set your target role first." copy="SkillMint only shows jobs with explicit title overlap to the role you chose. It does not invent a target from your resume." href="/setup" action="Set target role" />;
  if (!hasOwnedResume) return <Gate title="Add a resume before comparing job evidence." copy="Your owned active resume stays in the candidate workspace. The job-source request contains your target role and authenticated session only." href="/upload" action="Upload resume" />;

  return (
    <DashboardLayout>
      <div className={premiumPageStack}>
        <section className={premiumSurface}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-800">Trustworthy jobs · Greenhouse</p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.03em] text-slate-950">Jobs for {targetRole}</h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">SkillMint checks a bounded public Greenhouse source set for current title overlap, then compares explicit requirements with evidence already in this browser. Resume evidence is not sent to the job provider.</p>
            </div>
            <button type="button" onClick={() => void loadJobs()} disabled={state.status === "loading"} className={premiumPrimaryCta}>{state.status === "loading" ? "Checking live jobs…" : "Refresh live jobs"}</button>
          </div>
          <div className="mt-6 grid gap-3 text-xs leading-5 text-slate-600 sm:grid-cols-3">
            <p><strong className="text-slate-900">No auto-apply.</strong> You choose whether to open the original posting.</p>
            <p><strong className="text-slate-900">No hiring score.</strong> Evidence coverage is not a shortlist or offer probability.</p>
            <p><strong className="text-slate-900">No stale fallback.</strong> Dependency failure is shown instead of old jobs.</p>
          </div>
        </section>

        {state.status === "loading" && <section className={premiumSurface} role="status"><p className="text-sm text-slate-600">Checking current Greenhouse postings and explicit requirements…</p></section>}
        {state.status === "error" && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5" role="alert">
            <h2 className="font-bold text-rose-950">Live jobs unavailable</h2>
            <p className="mt-2 text-sm leading-6 text-rose-900">{state.message}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {state.recovery === "login" ? (
                <Link href="/login" className={premiumPrimaryCta}>Sign in again</Link>
              ) : state.recovery === "recruiter" ? (
                <Link href="/recruiters" className={premiumPrimaryCta}>Open recruiter workspace</Link>
              ) : (
                <button type="button" onClick={() => void loadJobs()} className={premiumPrimaryCta}>Retry live jobs</button>
              )}
              {state.recovery !== "recruiter" && <Link href="/setup" className="text-sm font-semibold text-rose-950 underline underline-offset-4">Review target role</Link>}
            </div>
          </section>
        )}
        {state.status === "ready" && state.message && (
          <section className={premiumSurface} role="status">
            <h2 className="font-bold text-slate-950">No trustworthy match to show yet</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{state.message}</p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => void loadJobs()} className={premiumPrimaryCta}>Refresh live jobs</button>
              <Link href="/setup" className="text-sm font-semibold text-emerald-800 underline underline-offset-4">Review target role</Link>
            </div>
          </section>
        )}
        {state.jobs.map((job) => <JobCard key={job.job.sourceKey} result={job} />)}
        {state.sourceStatus && <section className="border-t border-slate-300 pt-5 text-xs leading-5 text-slate-500"><p>Source: Greenhouse public Job Board API · checked {new Date(state.sourceStatus.fetchedAt).toLocaleString()} · {state.sourceStatus.failedSources} of {state.sourceStatus.configuredSources} bounded sources unavailable · stale results served: no.</p><p className="mt-1">Results are alphabetical after explicit target-role title overlap and requirement extraction. SkillMint does not rank candidates or infer hiring probability.</p></section>}
      </div>
    </DashboardLayout>
  );
}

function Gate({ title, copy, href, action }: { title: string; copy: string; href: string; action: string }) {
  return <DashboardLayout><section className={premiumSurface}><p className="text-sm font-semibold text-emerald-800">Candidate jobs</p><h1 className="mt-3 text-3xl font-black text-slate-950">{title}</h1><p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">{copy}</p><Link href={href} className={`${premiumPrimaryCta} mt-6`}>{action}</Link></section></DashboardLayout>;
}

function JobCard({ result }: { result: CandidateJobResult }) {
  const supported = result.explanation.supportedRequirements;
  const gaps = result.explanation.evidenceGaps;
  return <article className={premiumSurface}>
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">{result.job.companyName ?? "Employer"} · Greenhouse</p><h2 className="mt-2 text-2xl font-black text-slate-950">{result.job.title}</h2><p className="mt-2 text-sm text-slate-600">{result.job.location ?? "Location not provided by source"}</p><p className="mt-2 text-xs leading-5 text-slate-500">Posting updated by source: {formatFreshnessTimestamp(result.job.sourceUpdatedAt)} · checked by SkillMint: {formatFreshnessTimestamp(result.job.fetchedAt)}</p><p className="mt-4 max-w-3xl text-sm leading-6 text-slate-700">{result.explanation.whyShown}</p></div><a href={result.primaryAction.href} target="_blank" rel="noopener noreferrer" className={premiumPrimaryCta}>{result.primaryAction.label}</a></div>
    <div className="mt-6 grid gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><h3 className="font-bold text-emerald-950">Supported by this resume ({supported.length})</h3>{supported.length === 0 ? <p className="mt-3 text-sm leading-6 text-emerald-900">No extracted requirement has matching resume evidence yet.</p> : <ul className="mt-3 space-y-4">{supported.map((item) => <li key={item.requirementId} className="text-sm leading-6 text-emerald-950"><p className="font-semibold">{item.requirement}</p><p className="mt-1 text-xs leading-5 text-emerald-800">Resume evidence: {item.evidence.map((entry) => entry.label).join(", ")}</p></li>)}</ul>}</section>
      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><h3 className="font-bold text-amber-950">Not evidenced in this resume ({gaps.length})</h3>{gaps.length === 0 ? <p className="mt-3 text-sm leading-6 text-amber-900">Every extracted requirement has some resume evidence. That is not a hiring prediction.</p> : <ul className="mt-3 space-y-3">{gaps.map((item) => <li key={item.requirementId} className="text-sm leading-6 text-amber-950">{item.requirement}</li>)}</ul>}</section>
    </div>
    <p className="mt-5 text-xs leading-5 text-slate-500">{result.trust.disclaimer}</p>
  </article>;
}

function formatFreshnessTimestamp(value: string | null): string {
  if (!value) return "not provided";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "not provided" : date.toLocaleString();
}

function buildResumeEvidence(profile: UserProfile): ResumeEvidence[] {
  const rows: ResumeEvidence[] = [];
  profile.skills.forEach((text, index) => text.trim() && rows.push({ id: `skill-${index + 1}`, label: `Skill: ${text.trim()}`, text }));
  profile.projects.forEach((text, index) => text.trim() && rows.push({ id: `project-${index + 1}`, label: `Project ${index + 1}`, text }));
  profile.experience.forEach((text, index) => text.trim() && rows.push({ id: `experience-${index + 1}`, label: `Experience ${index + 1}`, text }));
  if (profile.education.trim()) rows.push({ id: "education", label: "Education", text: profile.education });
  return rows;
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
