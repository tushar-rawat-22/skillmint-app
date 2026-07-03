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
