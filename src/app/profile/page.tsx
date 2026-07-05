import Link from "next/link";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import AuthStatusCard from "@/modules/auth/components/AuthStatusCard";
import PersistentProfileForm from "@/modules/profile/components/PersistentProfileForm";

export default function ProfilePage() {
  return (
    <DashboardLayout>
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-4xl font-black">
              Career Profile
            </h1>

            <p className="mt-4 max-w-2xl text-gray-400">
              Save your career direction so SkillMint can keep your next steps
              focused without changing your resume score.
            </p>
          </div>

          <Link
            href="/setup"
            className="w-fit rounded-xl border border-green-500/30 px-5 py-3 text-sm font-semibold text-green-100 transition hover:border-green-300 hover:text-white"
          >
            Open career setup
          </Link>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-6">
            <AuthStatusCard />

            <article className="rounded-lg border border-green-500/30 bg-green-500/10 p-6">
              <h2 className="text-xl font-bold">
                Your direction starts in Setup
              </h2>

              <p className="mt-3 text-sm leading-6 text-green-50/80">
                Choose a target role, level, and goal. When signed in,
                SkillMint saves that direction here.
              </p>
            </article>
          </div>

          <PersistentProfileForm />
        </div>

        <article className="mt-8 rounded-lg border border-gray-800 bg-neutral-900 p-6">
          <h2 className="text-xl font-bold">
            What gets saved
          </h2>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              "Your target role and career goal.",
              "Your resume and job matches when signed in.",
              "Your progress without changing any scores.",
            ].map((item) => (
              <p
                key={item}
                className="rounded-lg border border-gray-800 bg-black/30 p-4 text-sm leading-6 text-gray-300"
              >
                {item}
              </p>
            ))}
          </div>
        </article>
      </section>
    </DashboardLayout>
  );
}
