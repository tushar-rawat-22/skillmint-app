import Link from "next/link";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import { NextBestActionPanel } from "@/modules/activation";
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
              Choose your career direction
            </h1>

            <p className="mt-4 max-w-2xl text-gray-400">
              Pick the role, level, and goal you are aiming for. SkillMint uses
              this as your direction before analyzing your resume.
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

        <section className="mt-8 rounded-lg border border-gray-800 bg-neutral-900 p-5">
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-green-400">
            What this does
          </h2>

          <div className="mt-4 grid gap-3 text-sm leading-6 text-gray-300 md:grid-cols-3">
            <p className="rounded-lg border border-gray-800 bg-black/30 p-4">
              Sets your target role.
            </p>

            <p className="rounded-lg border border-gray-800 bg-black/30 p-4">
              Personalizes your next steps.
            </p>

            <p className="rounded-lg border border-gray-800 bg-black/30 p-4">
              Does not change your resume score yet.
            </p>
          </div>

          <p className="mt-4 text-sm leading-6 text-gray-400">
            Choose your career field so SkillMint can frame your direction
            better. This does not change your resume score yet.
          </p>
        </section>

        <NextBestActionPanel className="mt-6" />

        <div className="mt-8">
          <TargetRoleSetupForm />
        </div>
      </section>
    </DashboardLayout>
  );
}
