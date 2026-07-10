import Link from "next/link";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import {
  premiumCompactSurface,
  premiumEyebrow,
  premiumHeroSurface,
  premiumPrimaryCta,
  premiumSecondaryCta,
} from "@/components/ui/premium";
import { NextBestActionPanel } from "@/modules/activation";
import { TargetRoleSetupForm } from "@/modules/onboarding";

export default function SetupPage() {
  return (
    <DashboardLayout>
      <section className="mx-auto max-w-5xl">
        <div className={premiumHeroSurface}>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className={premiumEyebrow}>
                Career Setup
              </p>

              <h1 className="mt-4 text-4xl font-black md:text-5xl">
                Choose your career direction
              </h1>

              <p className="mt-4 max-w-2xl text-slate-600">
                Pick the role, level, and goal you are aiming for. SkillMint uses
                this as your direction before analyzing your resume.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/upload"
                className={premiumPrimaryCta}
              >
                Upload resume
              </Link>

              <Link
                href="/dashboard"
                className={premiumSecondaryCta}
              >
                Dashboard
              </Link>
            </div>
          </div>
        </div>

        <section className={`mt-6 ${premiumCompactSurface}`}>
          <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
            What this does
          </h2>

          <div className="mt-4 grid gap-3 text-sm leading-6 text-slate-700 md:grid-cols-3">
            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              Sets your target role.
            </p>

            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              Personalizes your next steps.
            </p>

            <p className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              Frames your guidance without editing your resume.
            </p>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            Choose your career field so SkillMint can frame your direction
            better without rewriting your resume analysis.
          </p>

          <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
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
