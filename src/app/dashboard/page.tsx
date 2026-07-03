"use client";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import CareerReportHero from "@/components/dashboard/CareerReportHero";
import MetricStrip from "@/components/dashboard/MetricStrip";
import RealityCheckCard from "@/components/dashboard/RealityCheckCard";
import CareerMatchCard from "@/components/dashboard/CareerMatchCard";
import NextMissionsCard from "@/components/dashboard/NextMissionsCard";
import ShareableCareerCard from "@/components/dashboard/ShareableCareerCard";

import { AccountOverviewCard } from "@/modules/account";
import { useCareerData } from "@/modules/dashboard/hooks/useCareerData";
import { OnboardingChecklist } from "@/modules/onboarding";

export default function DashboardPage() {
  const data = useCareerData();
  const bestMatch = data.roleMatches[0];
  const topImprovement = getTopImprovement(
    data.missions,
    data.recommendations,
  );

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <CareerReportHero
          careerIQ={data.careerIQ}
          bestMatch={bestMatch}
          salary={data.salary}
        />

        <OnboardingChecklist />

        <MetricStrip
          ats={data.ats}
          recruiter={data.recruiter}
          bestMatch={bestMatch}
          salary={data.salary}
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
