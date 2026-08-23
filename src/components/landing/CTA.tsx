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
      className="mx-auto max-w-5xl px-6 py-20 text-center"
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.1)] md:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
          {publicDemoEnabled
            ? "Public beta in preparation · synthetic demos"
            : publicSignupEnabled
              ? "Early-access registration"
              : "Controlled early access"}
        </p>

        <h2 className="mt-4 text-4xl font-black text-slate-950 md:text-5xl">
          {publicDemoEnabled
            ? "See the same evidence layer from both sides."
            : publicSignupEnabled
              ? "Create your account."
              : "Account creation is currently closed."}
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          {publicDemoEnabled
            ? "Candidate and recruiter demos use fixed synthetic data. Real resume analysis and candidate sharing remain authenticated and private by default."
            : publicSignupEnabled
              ? "Registration is open for early access. Create an account to save your career direction, resume proof, job matches, and roadmap."
              : "SkillMint is preparing a controlled early-access cohort. Existing users can continue to log in."}
        </p>

        <p className="mt-3 text-sm text-slate-500">
          {publicDemoEnabled
            ? "Synthetic data only. No employment or hiring outcome is promised."
            : publicSignupEnabled
              ? "Early access does not guarantee employment outcomes."
              : "No applications, invitations, or waitlist enrollment are open from this page."}
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href={ROUTES.CANDIDATES}
            className="rounded-xl bg-emerald-600 px-8 py-4 font-bold text-white shadow-[0_14px_30px_rgba(5,150,105,0.18)] transition hover:bg-emerald-700"
          >
            I&apos;m a Candidate
          </Link>

          <Link
            href={ROUTES.RECRUITERS}
            className="rounded-xl border border-slate-300 bg-white px-8 py-4 font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
          >
            I&apos;m Hiring
          </Link>
        </div>
      </div>
    </section>
  );
}
