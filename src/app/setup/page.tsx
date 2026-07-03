import Link from "next/link";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import { TargetRoleSetupForm } from "@/modules/onboarding";

export default function SetupPage() {
  return (
    <DashboardLayout>
      <section className="mx-auto max-w-5xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-green-400">
              Career Setup
            </p>

            <h1 className="mt-4 text-4xl font-black md:text-5xl">
              Career Setup
            </h1>

            <p className="mt-4 max-w-2xl text-gray-400">
              Tell SkillMint what you are aiming for so the roadmap and
              checklist can guide you better.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/upload"
              className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-500"
            >
              Upload resume
            </Link>

            <Link
              href="/dashboard"
              className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-100 transition hover:border-green-500 hover:text-green-300"
            >
              Dashboard
            </Link>
          </div>
        </div>

        <div className="mt-8">
          <TargetRoleSetupForm />
        </div>
      </section>
    </DashboardLayout>
  );
}
