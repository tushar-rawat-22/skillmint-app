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
    <section className="relative overflow-hidden border-b border-slate-800 bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(16,185,129,0.17),transparent_30%),radial-gradient(circle_at_12%_90%,rgba(45,212,191,0.08),transparent_34%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-14 px-6 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:py-24">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" aria-hidden="true" />
            {publicDemoEnabled
              ? "For candidates · synthetic beta preview"
              : "For candidates · invite-only beta"}
          </div>

          <h1 className="mt-7 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.05em] text-white sm:text-5xl lg:text-7xl">
            Know what your resume proves.
            <span className="mt-2 block text-emerald-300">
              Know what to fix next.
            </span>
          </h1>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
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
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-300 px-7 py-3 font-bold text-slate-950 shadow-[0_12px_36px_rgba(52,211,153,0.16)] transition hover:bg-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-200"
            >
              {publicDemoEnabled
                ? "See a candidate example"
                : publicSignupEnabled
                  ? "Create candidate account"
                  : "Candidate login"}
            </Link>

            <a
              href="#how-it-works"
              className="inline-flex min-h-12 items-center font-semibold text-slate-200 underline decoration-slate-600 underline-offset-4 transition hover:text-white hover:decoration-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-200"
            >
              See how it works
            </a>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
            {publicDemoEnabled ? (
              <Link className="font-semibold text-slate-300 underline-offset-4 hover:text-white hover:underline" href={ROUTES.LOGIN}>
                Existing user login
              </Link>
            ) : null}
            {!publicDemoEnabled && !publicSignupEnabled ? (
              <Link className="font-semibold text-slate-300 underline-offset-4 hover:text-white hover:underline" href={ROUTES.SIGNUP}>
                Invite-only beta details
              </Link>
            ) : null}
            <Link className="text-slate-400 underline-offset-4 hover:text-white hover:underline" href={ROUTES.RECRUITERS}>
              Hiring? See the recruiter workflow
            </Link>
          </div>

          <div className="mt-8 grid max-w-2xl gap-3 border-t border-white/10 pt-5 text-xs leading-5 text-slate-400 sm:grid-cols-3">
            <p><span className="font-bold text-slate-200">Private by default.</span> Resume analysis stays with the candidate.</p>
            <p><span className="font-bold text-slate-200">Evidence first.</span> Missing support is marked unverified, not false.</p>
            <p><span className="font-bold text-slate-200">No hiring prediction.</span> Scores are product signals, not outcomes.</p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-white/10 bg-white p-3 shadow-[0_32px_90px_rgba(0,0,0,0.34)] sm:p-5">
          <div className="rounded-[1.5rem] border border-slate-200 bg-[#fbfaf7] p-5 text-slate-950 sm:p-7">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
                  Synthetic evidence brief
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">
                  Junior frontend product work
                </h2>
              </div>
              <span className="w-fit rounded-full bg-slate-950 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                Example only
              </span>
            </div>
            <div className="divide-y divide-slate-200">
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
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              Synthetic resume-internal signals only. No external verification.
            </p>
          </div>
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
    <div className="grid grid-cols-[2.25rem_1fr] gap-3 py-5 sm:grid-cols-[2.25rem_7rem_1fr]">
      <span className="font-mono text-xs font-bold text-emerald-800">{index}</span>
      <p className="text-sm font-black text-slate-950">{label}</p>
      <p className="col-start-2 text-sm leading-6 text-slate-600 sm:col-start-auto">
        {value}
      </p>
    </div>
  );
}
