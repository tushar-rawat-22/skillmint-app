"use client";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import CareerReportHero from "@/components/dashboard/CareerReportHero";
import MetricStrip from "@/components/dashboard/MetricStrip";
import RealityCheckCard from "@/components/dashboard/RealityCheckCard";
import CareerMatchCard from "@/components/dashboard/CareerMatchCard";
import NextMissionsCard from "@/components/dashboard/NextMissionsCard";
import ShareableCareerCard from "@/components/dashboard/ShareableCareerCard";
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

export default function DashboardPage() {
  const data = useCareerData();
  const bestMatch = data.roleMatches[0];
  const topImprovement = getTopImprovement(
    data.missions,
    data.recommendations,
  );
  const readinessBars = getReadinessBars(
    data.careerIQ.score,
    data.careerIQ.grade,
    data.ats.score,
    data.ats.verdict,
    data.recruiter.score,
    data.recruiter.confidence,
    bestMatch?.matchScore ?? 0,
    bestMatch?.role ?? "Upload resume",
  );
  const proofDistribution = getProofDistribution(data.profile);

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <CareerReportHero
          careerIQ={data.careerIQ}
          bestMatch={bestMatch}
          salary={data.salary}
        />

        <OnboardingChecklist />

        <NextBestActionPanel />

        <MetricStrip
          ats={data.ats}
          recruiter={data.recruiter}
          bestMatch={bestMatch}
          salary={data.salary}
        />

        <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
          <ScoreRing
            score={data.careerIQ.score}
            grade={data.careerIQ.grade}
            label="Career IQ"
            caption="One compact view of resume structure, proof, ATS readiness, recruiter confidence, and public signals."
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <ScoreBars
              title="Readiness Signals"
              subtitle="A quick comparison of the scores already powering your career report."
              items={readinessBars}
            />

            <ReadinessTrend
              score={data.careerIQ.score}
              topMission={topImprovement}
            />
          </div>
        </section>

        <SkillDistribution
          title="Proof Map"
          subtitle="This shows which parts of your resume evidence are carrying the profile right now."
          items={proofDistribution}
        />

        <RealityCheckCard
          careerIQ={data.careerIQ}
          ats={data.ats}
          recruiter={data.recruiter}
          roleMatches={data.roleMatches}
          missions={data.missions}
          recommendations={data.recommendations}
          profile={data.profile}
        />

        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <CareerMatchCard matches={data.roleMatches} />

          <NextMissionsCard
            missions={data.missions}
            recommendations={data.recommendations}
          />
        </div>

        <ShareableCareerCard
          careerIQ={data.careerIQ}
          ats={data.ats}
          recruiter={data.recruiter}
          bestMatch={bestMatch}
          topImprovement={topImprovement}
        />

        <UpgradeInterestCard
          source="dashboard"
          title="Want a deeper career plan?"
          body="SkillMint is free during beta. Join paid-beta interest if you would pay for advanced proof reviews and stronger 30-day guidance."
          cta="Join paid beta interest"
        />

        <AccountOverviewCard />
      </div>
    </DashboardLayout>
  );
}

function getTopImprovement(
  missions: string[],
  recommendations: string[],
): string {
  return [...missions, ...recommendations][0] ?? "Upload a resume";
}

function getReadinessBars(
  careerIQScore: number,
  careerIQGrade: string,
  atsScore: number,
  atsVerdict: string,
  recruiterScore: number,
  recruiterConfidence: string,
  roleMatchScore: number,
  roleLabel: string,
): ScoreBarItem[] {
  return [
    {
      label: "Career IQ",
      value: careerIQScore,
      detail: `Grade ${careerIQGrade}`,
      tone: "emerald",
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
    {
      label: "Best Role Match",
      value: roleMatchScore,
      detail: roleLabel,
      tone: "violet",
    },
  ];
}

function getProofDistribution(
  profile: ReturnType<typeof useCareerData>["profile"],
): SkillDistributionItem[] {
  return [
    {
      label: "Skills",
      value: profile.skillsScore,
      max: 15,
      detail: `${profile.skills.length} detected`,
    },
    {
      label: "Projects",
      value: profile.projectsScore,
      max: 15,
      detail: `${profile.projects.length} listed`,
    },
    {
      label: "Experience",
      value: profile.experienceScore,
      max: 12,
      detail: `${profile.experience.length} entries`,
    },
    {
      label: "GitHub",
      value: profile.githubScore,
      max: 8,
      detail: profile.github ? "Public proof" : "Missing link",
    },
    {
      label: "LinkedIn",
      value: profile.linkedinScore,
      max: 5,
      detail: profile.linkedin ? "Profile signal" : "Missing link",
    },
  ];
}
