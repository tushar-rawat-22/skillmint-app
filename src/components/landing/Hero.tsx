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
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:py-24">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
            {publicDemoEnabled
              ? "Private pilot · synthetic demo"
              : "Private pilot · controlled access"}
          </p>

          <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.02] tracking-[-0.04em] text-slate-950 sm:text-5xl lg:text-6xl">
            Know what your resume supports.
            <span className="mt-2 block text-emerald-800">
              Build the evidence it does not.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
            SkillMint helps students and fresh graduates turn a resume into an
            evidence map: strongest support, the main gap for a target role,
            and the next useful action.
          </p>

          <p className="mt-5 max-w-2xl border-l-4 border-emerald-700 pl-4 text-sm leading-6 text-slate-700">
            Not an AI resume writer or a hiring-probability score. The product
            makes resume-internal evidence easier to inspect and improve.
          </p>

          <div className="mt-9 flex flex-wrap gap-3">
            <Link
              href={publicDemoEnabled ? ROUTES.DEMO : ROUTES.SIGNUP}
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-800 px-7 py-3 font-bold text-white transition hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
            >
              {publicDemoEnabled
                ? "Explore live demo"
                : publicSignupEnabled
                  ? "Create account"
                  : "View early access"}
            </Link>

            <Link
              href={ROUTES.LOGIN}
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-7 py-3 font-semibold text-slate-800 transition hover:border-emerald-400 hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-emerald-700"
            >
              Existing user login
            </Link>
          </div>

          <p className="mt-5 text-sm text-slate-500">
            No employment, interview, shortlist, or salary guarantees.
          </p>
        </div>

        <div className="border-y border-slate-300 bg-[#f7f5ef] py-2 sm:border sm:p-6">
          <div className="border-b border-slate-300 px-4 py-5 sm:px-0 sm:pt-0">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">
              Evidence summary · synthetic
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
            label="Next action"
            value="Rewrite one project entry around contribution, result, and evidence."
          />
          <p className="px-4 py-4 text-xs leading-5 text-slate-500 sm:px-0 sm:pb-0">
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
