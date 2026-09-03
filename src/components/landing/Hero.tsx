import Link from "next/link";

import { ROUTES } from "@/constants/routes";

type HeroProps = {
  publicSignupEnabled: boolean;
  publicDemoEnabled: boolean;
};

export default function Hero({
  publicSignupEnabled,
  publicDemoEnabled,
}: HeroProps) {
  return (
    <section className="border-b border-slate-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-14 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-24">
        <div>
          <p className="text-sm font-semibold text-emerald-800">
            {publicDemoEnabled
              ? "For candidates · synthetic beta preview"
              : "For candidates · invite-only beta"}
          </p>

          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
            Know what your resume proves.
            <span className="mt-2 block text-emerald-800">
              Know what to fix next.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            Choose the role you want, upload your resume, and see what it already
            supports, what is holding you back, and the clearest next step.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <Link
              href={publicDemoEnabled
                ? ROUTES.DEMO
                : publicSignupEnabled
                  ? ROUTES.SIGNUP
                  : ROUTES.LOGIN}
              className="inline-flex min-h-12 items-center justify-center rounded-lg bg-emerald-800 px-7 py-3 font-bold text-white transition hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
            >
              {publicDemoEnabled
                ? "See a candidate example"
                : publicSignupEnabled
                  ? "Create candidate account"
                  : "Candidate login"}
            </Link>

            <a
              href="#how-it-works"
              className="inline-flex min-h-12 items-center font-semibold text-emerald-900 underline decoration-emerald-300 underline-offset-4 hover:decoration-emerald-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
            >
              See how it works
            </a>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {publicDemoEnabled ? (
              <Link className="font-semibold text-slate-700 underline-offset-4 hover:underline" href={ROUTES.LOGIN}>
                Existing user login
              </Link>
            ) : null}
            {!publicDemoEnabled && !publicSignupEnabled ? (
              <Link className="font-semibold text-slate-700 underline-offset-4 hover:underline" href={ROUTES.SIGNUP}>
                Invite-only beta details
              </Link>
            ) : null}
            <Link className="text-slate-600 underline-offset-4 hover:text-slate-900 hover:underline" href={ROUTES.RECRUITERS}>
              Hiring? See the recruiter workflow
            </Link>
          </div>

          <p className="mt-6 max-w-xl border-l-2 border-emerald-700 pl-4 text-sm leading-6 text-slate-600">
            Your resume stays private unless you choose to share a derived Proof
            Brief. SkillMint does not rank candidates or predict hiring outcomes.
          </p>
        </div>

        <div className="border-y border-slate-300 bg-[#f7f5ef] py-2 sm:p-6">
          <div className="border-b border-slate-300 px-4 py-5 sm:px-0 sm:pt-0">
            <p className="text-xs font-semibold text-emerald-800">
              Example from a synthetic resume
            </p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">
              Junior frontend product work
            </h2>
          </div>
          <HeroEvidenceRow
            index="01"
            label="Supported"
            value="Typed interface delivery, accessibility checks, and component testing."
          />
          <HeroEvidenceRow
            index="02"
            label="Missing"
            value="Specific API ownership and an inspectable team-delivery example."
          />
          <HeroEvidenceRow
            index="03"
            label="Next step"
            value="Rewrite one project entry around contribution, result, and evidence."
          />
          <p className="px-4 py-4 text-xs leading-5 text-slate-600 sm:px-0 sm:pb-0">
            Synthetic resume-internal signals only. No external verification.
          </p>
        </div>
      </div>
    </section>
  );
}

function HeroEvidenceRow({
  index,
  label,
  value,
}: {
  index: string;
  label: string;
  value: string;
}) {
  return (
    <div className="grid grid-cols-[2.25rem_1fr] gap-3 border-b border-slate-300 px-4 py-5 last:border-b-0 sm:grid-cols-[2.25rem_7rem_1fr] sm:px-0">
      <span className="font-mono text-xs font-bold text-emerald-800">{index}</span>
      <p className="text-sm font-bold text-slate-950">{label}</p>
      <p className="col-start-2 text-sm leading-6 text-slate-700 sm:col-start-auto">
        {value}
      </p>
    </div>
  );
}
