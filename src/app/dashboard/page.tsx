import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import CareerIQCard from "@/components/dashboard/CareerIQCard";
import ATSCard from "@/components/dashboard/ATSCard";
import RecruiterConfidenceCard from "@/components/dashboard/RecruiterConfidenceCard";
import SalaryCard from "@/components/dashboard/SalaryCard";
import MissionCard from "@/components/dashboard/MissionCard";
import QuickActions from "@/components/dashboard/QuickActions";
import CareerMatchCard from "@/components/dashboard/CareerMatchCard";

import { useCareerData } from "@/modules/dashboard/hooks/useCareerData";

export default function DashboardPage() {
  const data = useCareerData();

  return (
    <DashboardLayout>
      <DashboardHeader />

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <CareerIQCard score={data.careerIQ.score} />

        <ATSCard score={data.ats.score} />

        <RecruiterConfidenceCard score={data.recruiter.score} />

        <SalaryCard salary={data.salary.salary} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <MissionCard missions={data.missions} />

        <QuickActions recommendations={data.recommendations} />
      </div>

      <div className="mt-8">
        <CareerMatchCard matches={data.roleMatches} />
      </div>
    </DashboardLayout>
  );
}