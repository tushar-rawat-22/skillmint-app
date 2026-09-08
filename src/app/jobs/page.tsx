"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import { premiumPageStack, premiumPrimaryCta, premiumSurface } from "@/components/ui/premium";
import {
  buildCandidateJobResult,
  type CandidateJob,
  type CandidateJobRequirement,
  type CandidateJobResult,
  type ResumeEvidence,
} from "@/intelligence/jobs/explainableJobFit";
import type { UserProfile } from "@/intelligence/types/profile";
import { readVisibleStorageValue } from "@/lib/storage/ownedSkillMintStorage";
import { subscribeToSkillMintWorkspaceUpdates } from "@/lib/storage/skillMintStorageEvents";
import { useAuthSession } from "@/modules/auth/hooks/useAuthSession";
import { useCareerData } from "@/modules/dashboard/hooks/useCareerData";
import { ACTIVE_RESUME_ANALYSIS_STORAGE_DESCRIPTOR } from "@/modules/resume/services/activeResumeReportStorage";

type ApiJob = CandidateJob & {
  boardToken: string;
  titleMatchReason: string;
  requirements: CandidateJobRequirement[];
};

type JobsResponse = {
  ok: true;
  targetRole: string;
  jobs: ApiJob[];
  sourceStatus: {
    provider: "greenhouse";
    configuredSources: number;
    failedSources: number;
    fetchedAt: string;
    staleResultsServed: false;
  };
};

type LoadState =
  | {
      status: "idle" | "loading";
      jobs: CandidateJobResult[];
      sourceStatus: JobsResponse["sourceStatus"] | null;
      message: string | null;
    }
  | {
      status: "ready";
      jobs: CandidateJobResult[];
      sourceStatus: JobsResponse["sourceStatus"];
      message: string | null;
    }
  | { status: "error"; jobs: []; sourceStatus: null; message: string };

export default function JobsPage() {
  const {
    user,
    session,
    isLoading: isAuthLoading,
    isConfigured,
  } = useAuthSession();
  const currentUserId = isAuthLoading ? undefined : user?.id ?? null;
  const storedResumeAnalysis = useSyncExternalStore(
    subscribeToSkillMintWorkspaceUpdates,
    () => readVisibleStorageValue(ACTIVE_RESUME_ANALYSIS_STORAGE_DESCRIPTOR, {
      currentUserId,
    }),
    getServerSnapshot,
  );
  const hasResumeAnalysis = Boolean(storedResumeAnalysis);
  const data = useCareerData(currentUserId);
  const targetRole = data.targetRole?.trim() ?? "";
  const resumeEvidence = useMemo(
    () => buildResumeEvidence(data.profile),
    [data.profile],
  );
  const [state, setState] = useState<LoadState>({
    status: "idle",
    jobs: [],
    sourceStatus: null,
    message: null,
  });

  const loadJobs = useCallback(async () => {
    const accessToken = session?.access_token;
    if (
      !accessToken ||
      !targetRole ||
      !hasResumeAnalysis ||
      resumeEvidence.length === 0
    ) {
      return;
    }

    setState({ status: "loading", jobs: [], sourceStatus: null, message: null });
    try {
      const response = await fetch(
        `/api/jobs/greenhouse?targetRole=${encodeURIComponent(targetRole)}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        },
      );
      const payload = await response.json() as
        | JobsResponse
        | { ok: false; error?: string };
      if (!response.ok || !payload.ok) {
        setState({
          status: "error",
          jobs: [],
          sourceStatus: null,
          message: describeLoadError(
            response.status,
            "error" in payload ? payload.error : undefined,
          ),
        });
        return;
      }

      const candidateJobs = payload.jobs.flatMap((job) => {
        const explained = buildCandidateJobResult({
          job,
          requirements: job.requirements,
          resumeEvidence,
          targetRole,
          whyShown: job.titleMatchReason,
        });
        return explained.ok ? [explained.result] : [];
      });

      setState({
        status: "ready",
        jobs: candidateJobs,
        sourceStatus: payload.sourceStatus,
        message: candidateJobs.length === 0
          ? "No current Greenhouse job in the bounded source set has both direct target-role title overlap and safely extracted explicit requirements. Nothing stale or loosely ranked was substituted."
          : null,
      });
    } catch {
      setState({
        status: "error",
        jobs: [],
        sourceStatus: null,
        message: "Live job sources are unavailable right now. SkillMint did not substitute cached or stale jobs.",
      });
    }
  }, [
    hasResumeAnalysis,
    resumeEvidence,
    session?.access_token,
    targetRole,
  ]);

  useEffect(() => {
    if (
      !isAuthLoading &&
      typeof currentUserId === "string" &&
      hasResumeAnalysis &&
      targetRole &&
      resumeEvidence.length > 0
    ) {
      void loadJobs();
    }
  }, [
    currentUserId,
    hasResumeAnalysis,
    isAuthLoading,
    loadJobs,
    resumeEvidence.length,
    targetRole,
  ]);

  if (isAuthLoading) {
    return (
      <DashboardLayout>
        <section className={premiumSurface} aria-live="polite">
          <p className="text-sm text-slate-600">Checking your candidate session…</p>
        </section>
      </DashboardLayout>
    );
  }

  if (!isConfigured || !user || !session) {
    return (
      <DashboardLayout>
        <section className={premiumSurface}>
          <p className="text-sm font-semibold text-emerald-800">Candidate jobs</p>
          <h1 className="mt-3 text-3xl font-black text-slate-950">
            Sign in to use your private resume evidence.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            Job discovery is part of the authenticated candidate workspace. Resume evidence is not sent to Greenhouse.
          </p>
          <Link href="/login" className={`${premiumPrimaryCta} mt-6`}>
            Candidate login
          </Link>
        </section>
      </DashboardLayout>
    );
  }

  if (!targetRole) {
    return (
      <DashboardLayout>
        <section className={premiumSurface}>
          <p className="text-sm font-semibold text-emerald-800">Candidate jobs</p>
          <h1 className="mt-3 text-3xl font-black text-slate-950">
            Set your target role first.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            SkillMint only shows jobs with explicit title overlap to the role you chose. It does not invent a target from your resume.
          </p>
          <Link href="/setup" className={`${premiumPrimaryCta} mt-6`}>
            Set target role
          </Link>
        </section>
      </DashboardLayout>
    );
  }

  if (!hasResumeAnalysis || resumeEvidence.length === 0) {
    return (
      <DashboardLayout>
        <section className={premiumSurface}>
          <p className="text-sm font-semibold text-emerald-800">Candidate jobs</p>
          <h1 className="mt-3 text-3xl font-black text-slate-950">
            Add a resume before comparing job evidence.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-600">
            Your resume stays in the candidate workspace. The job-source request contains your target role and authenticated session only.
          </p>
          <Link href="/upload" className={`${premiumPrimaryCta} mt-6`}>
            Upload resume
          </Link>
        </section>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className={premiumPageStack}>
        <section className={premiumSurface}>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-emerald-800">
                Trustworthy jobs · Greenhouse
              </p>
              <h1 className="mt-3 text-4xl font-black tracking-[-0.03em] text-slate-950">
                Jobs for {targetRole}
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-600">
                SkillMint checks a small public Greenhouse source set for current title overlap, then compares explicit job-description requirements with evidence already in this browser. No resume text is sent to the job provider.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void loadJobs()}
              disabled={state.status === "loading"}
              className={premiumPrimaryCta}
            >
              {state.status === "loading"
                ? "Checking live jobs…"
                : "Refresh live jobs"}
            </button>
          </div>

          <div className="mt-6 grid gap-3 text-xs leading-5 text-slate-600 sm:grid-cols-3">
            <p>
              <span className="font-bold text-slate-900">No auto-apply.</span>{" "}
              You choose whether to open the original posting.
            </p>
            <p>
              <span className="font-bold text-slate-900">No hiring score.</span>{" "}
              Evidence coverage is not a shortlist or offer probability.
            </p>
            <p>
              <span className="font-bold text-slate-900">No stale fallback.</span>{" "}
              If live sources fail, SkillMint shows the failure instead of old jobs.
            </p>
          </div>
        </section>

        {state.status === "loading" && (
          <section className={premiumSurface} role="status" aria-live="polite">
            <p className="text-sm text-slate-600">
              Checking current Greenhouse postings and explicit requirements…
            </p>
          </section>
        )}

        {state.status === "error" && (
          <section
            className="rounded-2xl border border-rose-200 bg-rose-50 p-5"
            role="alert"
          >
            <h2 className="font-bold text-rose-950">Live jobs unavailable</h2>
            <p className="mt-2 text-sm leading-6 text-rose-900">{state.message}</p>
          </section>
        )}

        {state.status === "ready" && state.message && (
          <section className={premiumSurface} role="status">
            <h2 className="font-bold text-slate-950">No trustworthy match to show yet</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{state.message}</p>
          </section>
        )}

        {state.jobs.map((result) => (
          <JobResultCard key={result.job.sourceKey} result={result} />
        ))}

        {state.sourceStatus && (
          <section className="border-t border-slate-300 pt-5 text-xs leading-5 text-slate-500">
            <p>
              Source: Greenhouse public Job Board API · checked {formatTimestamp(state.sourceStatus.fetchedAt)} · {state.sourceStatus.failedSources} of {state.sourceStatus.configuredSources} bounded sources unavailable · stale results served: no.
            </p>
            <p className="mt-1">
              Jobs are presented alphabetically after explicit target-role title overlap and requirement extraction. SkillMint does not rank candidates or infer hiring probability.
            </p>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}

function JobResultCard({ result }: { result: CandidateJobResult }) {
  const supported = result.explanation.supportedRequirements;
  const gaps = result.explanation.evidenceGaps;

  return (
    <article className={premiumSurface}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
            {result.job.companyName ?? "Employer"} · Greenhouse
          </p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">
            {result.job.title}
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            {result.job.location ?? "Location not provided by source"}
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-700">
            {result.explanation.whyShown}
          </p>
        </div>
        <a
          href={result.primaryAction.href}
          target="_blank"
          rel="noopener noreferrer"
          className={premiumPrimaryCta}
        >
          {result.primaryAction.label}
        </a>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <section
          className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5"
          aria-labelledby={`${result.job.sourceKey}-supported`}
        >
          <h3
            id={`${result.job.sourceKey}-supported`}
            className="font-bold text-emerald-950"
          >
            Supported by this resume ({supported.length})
          </h3>
          {supported.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-emerald-900">
              No extracted requirement has matching resume evidence yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-4">
              {supported.map((item) => (
                <li
                  key={item.requirementId}
                  className="text-sm leading-6 text-emerald-950"
                >
                  <p className="font-semibold">{item.requirement}</p>
                  <p className="mt-1 text-xs leading-5 text-emerald-800">
                    Resume evidence: {item.evidence.map((entry) => entry.label).join(", ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="rounded-2xl border border-amber-200 bg-amber-50 p-5"
          aria-labelledby={`${result.job.sourceKey}-gaps`}
        >
          <h3
            id={`${result.job.sourceKey}-gaps`}
            className="font-bold text-amber-950"
          >
            Not evidenced in this resume ({gaps.length})
          </h3>
          {gaps.length === 0 ? (
            <p className="mt-3 text-sm leading-6 text-amber-900">
              Every extracted requirement has some resume evidence. That is not a hiring prediction.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {gaps.map((item) => (
                <li
                  key={item.requirementId}
                  className="text-sm leading-6 text-amber-950"
                >
                  {item.requirement}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <p className="mt-5 text-xs leading-5 text-slate-500">
        {result.trust.disclaimer}
      </p>
    </article>
  );
}

function buildResumeEvidence(profile: UserProfile): ResumeEvidence[] {
  const evidence: ResumeEvidence[] = [];
  profile.skills.forEach((text, index) => {
    if (text.trim()) {
      evidence.push({
        id: `skill-${index + 1}`,
        label: `Skill: ${text.trim()}`,
        text,
      });
    }
  });
  profile.projects.forEach((text, index) => {
    if (text.trim()) {
      evidence.push({
        id: `project-${index + 1}`,
        label: `Project ${index + 1}`,
        text,
      });
    }
  });
  profile.experience.forEach((text, index) => {
    if (text.trim()) {
      evidence.push({
        id: `experience-${index + 1}`,
        label: `Experience ${index + 1}`,
        text,
      });
    }
  });
  if (profile.education.trim()) {
    evidence.push({ id: "education", label: "Education", text: profile.education });
  }
  return evidence;
}

function describeLoadError(status: number, code?: string): string {
  if (status === 401 || code === "not_authenticated") {
    return "Your candidate session is no longer valid. Sign in again before loading jobs.";
  }
  if (code === "upstream_unavailable") {
    return "The bounded Greenhouse sources are unavailable right now. SkillMint did not serve stale results.";
  }
  if (status === 503) {
    return "The job dependency is temporarily unavailable. SkillMint did not substitute cached or stale jobs.";
  }
  return "SkillMint could not load trustworthy jobs for this target role right now.";
}

function formatTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "just now" : date.toLocaleString();
}

function getServerSnapshot(): null {
  return null;
}
