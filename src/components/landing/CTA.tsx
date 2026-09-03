import Link from "next/link";

import { ROUTES } from "@/constants/routes";

type CTAProps = {
  publicSignupEnabled: boolean;
  publicDemoEnabled: boolean;
};

export default function CTA({
  publicSignupEnabled,
  publicDemoEnabled,
}: CTAProps) {
  return (
    <section
      id="cta"
      className="mx-auto max-w-5xl px-6 py-20"
    >
      <div className="border-y border-slate-300 bg-white py-10 md:py-12">
        <p className="text-sm font-semibold text-emerald-800">
          {publicDemoEnabled
            ? "Synthetic beta preview"
            : publicSignupEnabled
              ? "Early-access registration"
              : "Invite-only candidate beta"}
        </p>

        <h2 className="mt-4 text-4xl font-black text-slate-950 md:text-5xl">
          {publicDemoEnabled
            ? "See the same evidence layer from both sides."
            : publicSignupEnabled
              ? "Create your account."
              : "Already invited? Start with your target role."}
        </h2>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          {publicDemoEnabled
            ? "Candidate and recruiter demos use fixed synthetic data. Real resume analysis and candidate sharing remain authenticated and private by default."
            : publicSignupEnabled
              ? "Registration is open for early access. Create an account to save your career direction, resume proof, job matches, and roadmap."
              : "Account creation is intentionally invite-only while the first candidate cohort is supported closely. Existing invited users can log in now."}
        </p>

        <p className="mt-3 text-sm text-slate-500">
          {publicDemoEnabled
            ? "Synthetic data only. No employment or hiring outcome is promised."
            : publicSignupEnabled
              ? "Early access does not guarantee employment outcomes."
              : "There is no public signup or waitlist form."}
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href={publicDemoEnabled
              ? ROUTES.DEMO
              : publicSignupEnabled
                ? ROUTES.SIGNUP
                : ROUTES.LOGIN}
            className="rounded-lg bg-emerald-800 px-8 py-4 font-bold text-white transition hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
          >
            {publicDemoEnabled
              ? "See a candidate example"
              : publicSignupEnabled
                ? "Create candidate account"
                : "Candidate login"}
          </Link>

          <Link
            href={ROUTES.RECRUITERS}
            className="inline-flex min-h-12 items-center font-semibold text-slate-700 underline-offset-4 hover:text-emerald-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
          >
            For recruiters
          </Link>
        </div>
      </div>
    </section>
  );
}
