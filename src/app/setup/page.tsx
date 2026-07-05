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
              Set your career direction
            </h1>

            <p className="mt-4 max-w-2xl text-gray-400">
              Choose your target role, experience level, and career goal. This
              becomes the direction SkillMint uses to guide your next steps.
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

        <section className="mt-8 grid gap-4 lg:grid-cols-3">
          <article className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-green-100">
              Setup is direction
            </h2>

            <p className="mt-2 text-sm leading-6 text-green-50/80">
              Define what you are aiming for before SkillMint suggests the
              next best move.
            </p>
          </article>

          <article className="rounded-lg border border-gray-800 bg-neutral-900 p-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-gray-400">
              Resume is evidence
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              Upload your resume next so SkillMint can compare your direction
              against real proof.
            </p>
          </article>

          <article className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
            <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-blue-100">
              ATS is job-specific
            </h2>

            <p className="mt-2 text-sm leading-6 text-blue-50/80">
              Paste one JD in ATS Match when you want to compare against a
              specific opening.
            </p>
          </article>
        </section>

        <div className="mt-8">
          <TargetRoleSetupForm />
        </div>
      </section>
    </DashboardLayout>
  );
}
