import Link from "next/link";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import AuthStatusCard from "@/modules/auth/components/AuthStatusCard";
import PersistentProfileForm from "@/modules/profile/components/PersistentProfileForm";

export default function ProfilePage() {
  return (
    <DashboardLayout>
      <section className="max-w-4xl">
        <h1 className="text-4xl font-black">
          Profile
        </h1>

        <p className="mt-4 max-w-2xl text-gray-400">
          Your career profile will be generated from resume intelligence.
        </p>

        <div className="mt-8">
          <AuthStatusCard />
        </div>

        <article className="mt-8 rounded-lg border border-green-500/30 bg-green-500/10 p-6">
          <h2 className="text-xl font-bold">
            Career setup feeds this profile
          </h2>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-green-50/80">
            Use guided setup to choose a target role, experience level, and
            primary goal. When signed in, SkillMint can sync that direction to
            your persistent profile.
          </p>

          <Link
            href="/setup"
            className="mt-5 inline-flex rounded-lg border border-green-500/30 px-4 py-2 text-sm font-semibold text-green-100 transition hover:border-green-300 hover:text-white"
          >
            Open career setup
          </Link>
        </article>

        <div className="mt-8">
          <PersistentProfileForm />
        </div>

        <article className="mt-8 rounded-lg border border-gray-800 bg-neutral-900 p-6">
          <h2 className="text-xl font-bold">
            Candidate Profile coming soon
          </h2>

          <p className="mt-3 text-sm leading-6 text-gray-400">
            SkillMint will turn your resume intelligence into a clearer
            candidate profile in an upcoming sprint.
          </p>

          <p className="mt-3 text-sm leading-6 text-gray-400">
            Resume, ATS, and roadmap sync will come in later Sprint 6 units.
          </p>
        </article>
      </section>
    </DashboardLayout>
  );
}
