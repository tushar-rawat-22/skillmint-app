import Link from "next/link";

import DashboardLayout from "@/components/dashboard/layout/DashboardLayout";
import { TargetRoleSetupForm } from "@/modules/onboarding";

export default function SetupPage() {
  return (
    <DashboardLayout>
      <section className="mx-auto max-w-3xl">
        <header className="border-b border-slate-300 pb-8">
          <p className="text-sm font-semibold text-emerald-800">Step 1 of 2</p>
          <h1 className="mt-3 text-4xl font-black tracking-[-0.03em] md:text-5xl">
            What role are you aiming for?
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
            A target role gives your resume feedback a real direction. You can
            change it later, and it never changes what your resume actually shows.
          </p>
        </header>

        <div className="mt-8">
          <TargetRoleSetupForm />
        </div>

        <Link
          href="/dashboard"
          className="mt-8 inline-flex min-h-11 items-center font-semibold text-slate-700 underline-offset-4 hover:text-emerald-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
        >
          Back to dashboard
        </Link>
      </section>
    </DashboardLayout>
  );
}
