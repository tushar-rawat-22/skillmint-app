import Link from "next/link";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import { NextBestActionPanel } from "@/modules/activation";
import { TargetRoleSetupForm } from "@/modules/onboarding";

export default function SetupPage() {
  return (
    <DashboardLayout>
      <section className="mx-auto max-w-5xl">
        <div className="rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.9),rgba(2,6,23,0.94))] p-6 shadow-2xl shadow-black/25 md:p-8">
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
                className="rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300"
              >
                Upload resume
              </Link>

              <Link
                href="/dashboard"
                className="rounded-xl border border-white/15 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-gray-100 transition hover:border-green-500 hover:text-green-300"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-green-400">
            What this does
          </h2>

          <div className="mt-4 grid gap-3 text-sm leading-6 text-gray-300 md:grid-cols-3">
            <p className="rounded-xl border border-white/10 bg-black/25 p-4">
              Sets your target role.
            </p>

            <p className="rounded-xl border border-white/10 bg-black/25 p-4">
              Personalizes your next steps.
            </p>

            <p className="rounded-xl border border-white/10 bg-black/25 p-4">
              Frames your guidance without editing your resume.
            </p>
          </div>

          <p className="mt-4 text-sm leading-6 text-gray-400">
            Choose your career field so SkillMint can frame your direction
            better without rewriting your resume analysis.
          </p>

          <p className="mt-3 rounded-xl border border-emerald-400/15 bg-emerald-400/10 p-4 text-sm leading-6 text-emerald-50/90">
            Setup tells SkillMint what you want. Your resume tells SkillMint
            what you currently have. SkillMint uses both to frame your guidance
            without editing your resume analysis.
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
