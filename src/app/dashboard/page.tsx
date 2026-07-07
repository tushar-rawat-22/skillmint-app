"use client";

import { useMemo, useSyncExternalStore } from "react";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import CareerReportHero from "@/components/dashboard/CareerReportHero";
import MetricStrip from "@/components/dashboard/MetricStrip";
import RealityCheckCard from "@/components/dashboard/RealityCheckCard";
import CareerMatchCard from "@/components/dashboard/CareerMatchCard";
import NextMissionsCard from "@/components/dashboard/NextMissionsCard";
import ShareableCareerCard from "@/components/dashboard/ShareableCareerCard";
import ProofConfidenceExplainer from "@/components/dashboard/ProofConfidenceExplainer";
import {
  ReadinessTrend,
  ScoreBars,
  ScoreRing,
  SkillDistribution,
  type ScoreBarItem,
  type SkillDistributionItem,
} from "@/components/dashboard/visuals";

import { AccountOverviewCard } from "@/modules/account";
import {
  NextBestActionPanel,
  UpgradeInterestCard,
} from "@/modules/activation";
import { useCareerData } from "@/modules/dashboard/hooks/useCareerData";
import { OnboardingChecklist } from "@/modules/onboarding";
import { subscribeToSkillMintWorkspaceUpdates } from "@/lib/storage/skillMintStorageEvents";

const RESUME_ANALYSIS_STORAGE_KEY = "skillmint:resume-analysis";
const JD_MATCH_STORAGE_KEY = "skillmint:jd-match";

type LatestJobMatchSummary = {
  title: string;
  matchScore: number;
  missingSkills: string[];
};

export default function DashboardPage() {
  const storedResume = useSyncExternalStore(
    subscribeToStoredData,
    readStoredResume,
    getServerSnapshot,
  );
  const storedJobMatch = useSyncExternalStore(
    subscribeToStoredData,
    readStoredJobMatch,
    getServerSnapshot,
  );
  const data = useCareerData();
  const hasResumeAnalysis = useMemo(
    () => hasValidResume(storedResume),
    [storedResume],
  );
  const hasJobMatch = useMemo(
    () => hasValidJobMatch(storedJobMatch),
    [storedJobMatch],
  );
  const latestJobMatch = useMemo(
    () => getLatestJobMatchSummary(storedJobMatch),
    [storedJobMatch],
  );
  const atsMissingSkills = latestJobMatch?.missingSkills ?? [];
  const hasUserProgress = hasResumeAnalysis || hasJobMatch;
  const bestMatch = data.roleMatches[0];
  const activeRole = getActiveRole(latestJobMatch, bestMatch);
  const heroCta = getHeroCta(
    hasResumeAnalysis,
    hasJobMatch,
    data.proof,
  );
  const topImprovement = getTopImprovement(
    data.proof.nextProofMove,
    data.missions,
    data.recommendations,
  );
  const readinessBars = getReadinessBars(
    data.careerIQ.score,
    data.careerIQ.grade,
    data.proof.proofConfidenceScore,
    data.proof.proofCoverageLabel,
    data.ats.score,
    data.ats.verdict,
    data.recruiter.score,
    data.recruiter.confidence,
  );
  const proofDistribution = getProofDistribution(data.profile, data.proof);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-7">
        <CareerReportHero
          careerIQ={data.careerIQ}
          proof={data.proof}
          cta={heroCta}
          activeRole={activeRole}
        />

        <OnboardingChecklist />

        <NextBestActionPanel />

        <MetricStrip
          proof={data.proof}
          ats={data.ats}
          recruiter={data.recruiter}
          bestMatch={bestMatch}
          latestJobMatch={latestJobMatch}
        />

        <ReportReadingGuide />

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <ScoreRing
            score={data.careerIQ.score}
            grade={data.careerIQ.grade}
            label="Career IQ"
            caption="Career IQ is trust-adjusted by Proof Confidence, so weak evidence caps the displayed readiness signal."
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <ScoreBars
              title="Readiness Signals"
              subtitle="A proof-aware comparison of the signals powering your career report."
              items={readinessBars}
            />

            <ReadinessTrend
              score={data.careerIQ.score}
              topMission={topImprovement}
            />
          </div>
        </section>

        <SkillDistribution
          title="Proof Evidence"
          subtitle="Evidence candidates, not verified sources. This section shows what is claimed, supported, and still unverified."
          items={proofDistribution}
        />

        <ProofConfidenceExplainer
          proof={data.proof}
          projectCount={data.profile.projects.length}
          hasMeasurableImpact={Boolean(
            data.profile.analysisFlags?.hasMeasurableImpact,
          )}
        />

        <RealityCheckCard
          careerIQ={data.careerIQ}
          ats={data.ats}
          recruiter={data.recruiter}
          roleMatches={data.roleMatches}
          missions={data.missions}
          recommendations={data.recommendations}
          profile={data.profile}
          hasLatestJobMatch={Boolean(latestJobMatch)}
        />

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <CareerMatchCard matches={data.roleMatches} />

          <NextMissionsCard
            missions={data.missions}
            recommendations={data.recommendations}
            proofNextMove={data.proof.nextProofMove}
            atsMissingSkills={atsMissingSkills}
            hasResumeAnalysis={hasResumeAnalysis}
          />
        </div>

        <ShareableCareerCard
          careerIQ={data.careerIQ}
          ats={data.ats}
          recruiter={data.recruiter}
          bestMatch={bestMatch}
          isReady={hasResumeAnalysis}
          nextProofMove={getShareableProofMove(data.proof.nextProofMove)}
          proof={data.proof}
        />

        {hasUserProgress && (
          <UpgradeInterestCard
            source="dashboard"
            title="Want a deeper career plan?"
            body="SkillMint is free during beta. Paid plans are not required for this report. Join paid-beta interest only if you would pay for advanced proof reviews and stronger 30-day guidance."
            cta="Join paid beta interest"
          />
        )}

        <AccountOverviewCard />
      </div>
    </DashboardLayout>
  );
}

function ReportReadingGuide() {
  const guideItems = [
    {
      label: "Career IQ",
      description: "Final trust-adjusted readiness signal.",
    },
    {
      label: "Proof Confidence",
      description: "How much evidence supports your resume claims.",
    },
    {
      label: "Latest JD Match",
      description: "Fit against one specific pasted job description.",
    },
    {
      label: "Profile-fit roles",
      description: "General role suggestions based on your resume.",
    },
    {
      label: "Base Resume Signals",
      description: "Structure and detection signals, not final readiness.",
    },
  ];

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.035] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-300/80">
            How to read this report
          </p>

          <h2 className="mt-2 text-xl font-black text-white">
            Read the scores in the right order.
          </h2>
        </div>

        <p className="max-w-2xl text-sm leading-6 text-gray-400">
          SkillMint separates resume reality, proof trust, general role fit,
          and one-job matching so the dashboard does not collapse everything
          into one vague score.
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-5">
        {guideItems.map((item) => (
          <article
            key={item.label}
            className="rounded-2xl border border-white/10 bg-black/25 p-4"
          >
            <p className="text-sm font-bold text-white">
              {item.label}
            </p>

            <p className="mt-2 text-xs leading-5 text-gray-500">
              {item.description}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

function subscribeToStoredData(onStoreChange: () => void): () => void {
  return subscribeToSkillMintWorkspaceUpdates(onStoreChange);
}

function readStoredResume(): string | null {
  return getBrowserStorage()?.getItem(RESUME_ANALYSIS_STORAGE_KEY) ?? null;
}

function readStoredJobMatch(): string | null {
  return getBrowserStorage()?.getItem(JD_MATCH_STORAGE_KEY) ?? null;
}

function getServerSnapshot(): null {
  return null;
}

function getBrowserStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function hasValidResume(storedValue: string | null): boolean {
  const parsedValue = parseRecord(storedValue);

  return Boolean(
    parsedValue &&
      (
        typeof parsedValue.extractedText === "string" ||
        isRecord(parsedValue.userProfile) ||
        isRecord(parsedValue.parsedProfile)
      ),
  );
}

function hasValidJobMatch(storedValue: string | null): boolean {
  const parsedValue = parseRecord(storedValue);

  return Boolean(
    parsedValue &&
      isRecord(parsedValue.result) &&
      typeof parsedValue.result.matchScore === "number",
  );
}

function getLatestJobMatchSummary(
  storedValue: string | null,
): LatestJobMatchSummary | null {
  const parsedValue = parseRecord(storedValue);
  const result = isRecord(parsedValue?.result) ? parsedValue.result : null;
  const matchScore = result?.matchScore;

  if (typeof matchScore !== "number") {
    return null;
  }

  const jobTitle = typeof parsedValue?.jobTitle === "string"
    ? parsedValue.jobTitle.trim()
    : "";
  const companyName = typeof parsedValue?.companyName === "string"
    ? parsedValue.companyName.trim()
    : "";
  const title = jobTitle && companyName
    ? `${jobTitle} at ${companyName}`
    : jobTitle || `${Math.round(matchScore)}% latest JD match`;
  const missingSkills = result?.missingSkills;

  return {
    title,
    matchScore,
    missingSkills: Array.isArray(missingSkills)
      ? missingSkills.filter((skill): skill is string =>
          typeof skill === "string" && skill.trim().length > 0
        )
      : [],
  };
}

function parseRecord(storedValue: string | null): Record<string, unknown> | null {
  if (!storedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(storedValue);

    return isRecord(parsedValue) ? parsedValue : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" &&
    !Array.isArray(value);
}

function getTopImprovement(
  proofMove: string,
  missions: string[],
  recommendations: string[],
): string {
  return proofMove || [...missions, ...recommendations][0] ||
    "Upload a resume";
}

function getShareableProofMove(proofMove: string): string {
  return proofMove && !isOperationalShareTask(proofMove)
    ? proofMove
    : "Strengthen one deployed project";
}

function isOperationalShareTask(value: string): boolean {
  const normalizedValue = value.toLowerCase();

  return [
    "upload",
    "sign in",
    "signup",
    "create account",
    "setup",
    "choose direction",
    "open dashboard",
    "paste a job description",
  ].some((phrase) => normalizedValue.includes(phrase));
}

function getHeroCta(
  hasResumeAnalysis: boolean,
  hasJobMatch: boolean,
  proof: ReturnType<typeof useCareerData>["proof"],
): {
  label: string;
  href: string;
} {
  if (!hasResumeAnalysis) {
    return {
      label: "Upload Resume",
      href: "/upload",
    };
  }

  if (
    proof.proofCoverageLabel === "Missing" ||
    proof.proofCoverageLabel === "Weak" ||
    proof.proofCoverageLabel === "Moderate"
  ) {
    return {
      label: "Review Proof",
      href: "/resume",
    };
  }

  if (!hasJobMatch) {
    return {
      label: "Match a Job",
      href: "/ats",
    };
  }

  return {
    label: "Improve Proof",
    href: "/resume",
  };
}

function getActiveRole(
  latestJobMatch: LatestJobMatchSummary | null,
  bestMatch: ReturnType<typeof useCareerData>["roleMatches"][number] | undefined,
): {
  label: string;
  value: string;
  metricLabel: string;
  metricValue: string;
} {
  if (latestJobMatch) {
    return {
      label: "Latest JD",
      value: latestJobMatch.title,
      metricLabel: "Latest JD Match",
      metricValue: `${Math.round(latestJobMatch.matchScore)}%`,
    };
  }

  return {
    label: "Profile-fit role",
    value: bestMatch?.role ?? "Not enough data",
    metricLabel: "Profile-fit match",
    metricValue: bestMatch ? `${Math.round(bestMatch.matchScore)}%` : "--",
  };
}

function getReadinessBars(
  careerIQScore: number,
  careerIQGrade: string,
  proofScore: number,
  proofLabel: string,
  atsScore: number,
  atsVerdict: string,
  recruiterScore: number,
  recruiterConfidence: string,
): ScoreBarItem[] {
  return [
    {
      label: "Career IQ",
      value: careerIQScore,
      detail: `Grade ${careerIQGrade}`,
      tone: "emerald",
    },
    {
      label: "Proof Confidence",
      value: proofScore,
      detail: proofLabel,
      tone: "violet",
    },
    {
      label: "ATS Readiness",
      value: atsScore,
      detail: atsVerdict,
      tone: "sky",
    },
    {
      label: "Recruiter Confidence",
      value: recruiterScore,
      detail: recruiterConfidence,
      tone: "amber",
    },
  ];
}

function getProofDistribution(
  profile: ReturnType<typeof useCareerData>["profile"],
  proof: ReturnType<typeof useCareerData>["proof"],
): SkillDistributionItem[] {
  const hasExperience = profile.experience.length > 0;
  const backedSkills = proof.evidenceBackedSkills.length;
  const weakSkills = proof.weaklySupportedSkills.length;
  const unverifiedSkills = proof.unverifiedSkills.length;
  const mostlyBacked =
    profile.skills.length > 0 && backedSkills / profile.skills.length >= 0.6;
  const skillMeta = backedSkills === 0
    ? "Needs proof"
    : unverifiedSkills > 0
      ? "Partial"
      : mostlyBacked
        ? "Backed"
        : "Partial";
  const experienceStatus = hasExperience
    ? profile.experienceScore >= 8
      ? "Present"
      : "Thin"
    : "Missing";

  return [
    {
      label: "Skills",
      value: `${profile.skills.length} claimed`,
      detail:
        `${backedSkills} backed · ${weakSkills} weak · ${unverifiedSkills} unverified`,
      meta: skillMeta,
      tone: skillMeta === "Backed"
        ? "emerald"
        : skillMeta === "Partial"
          ? "amber"
          : "rose",
    },
    {
      label: "Projects",
      value: `${profile.projects.length} detected`,
      detail: profile.analysisFlags?.hasMeasurableImpact
        ? "Needs inspectable proof links plus measurable project outcomes."
        : "Needs measurable proof, README, demo, or public evidence candidates.",
      meta: profile.analysisFlags?.hasMeasurableImpact
        ? "Needs proof"
        : "Needs proof",
      tone: profile.analysisFlags?.hasMeasurableImpact ? "sky" : "amber",
    },
    {
      label: "Proof links",
      value: `${proof.extractedProofLinks.length} candidates`,
      detail: "Evidence candidates only. Not externally verified.",
      meta: "Candidates",
      tone: proof.extractedProofLinks.length ? "violet" : "rose",
    },
    {
      label: "Experience",
      value: experienceStatus,
      detail: hasExperience
        ? `${profile.experience.length} experience entr${
            profile.experience.length === 1 ? "y" : "ies"
          } detected.`
        : "No internship, work, freelance, or experience signal detected.",
      meta: hasExperience ? "Found" : "Missing",
      tone: hasExperience ? "sky" : "amber",
    },
    {
      label: "Next proof move",
      value: "Next action",
      detail: proof.nextProofMove,
      meta: "Priority",
      tone: "emerald",
    },
  ];
}
