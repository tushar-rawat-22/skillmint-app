import Link from "next/link";

import { ROUTES } from "@/constants/routes";

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-slate-200 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.14),transparent_38%),linear-gradient(180deg,#ffffff,#f7f5ef)]">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-6 py-24 text-center md:py-32">
        <div className="rounded-full border border-emerald-200 bg-emerald-50 px-5 py-2 text-sm font-semibold text-emerald-800">
          Career Operating System for students and freshers
        </div>

        <h1 className="mt-10 max-w-5xl text-5xl font-black leading-[0.98] tracking-tight text-slate-950 md:text-7xl">
          Turn your resume into
          <span className="block text-emerald-600">
            a career action plan.
          </span>
        </h1>

        <p className="mt-8 max-w-3xl text-lg leading-8 text-slate-600 md:text-xl">
          SkillMint helps students and freshers understand their readiness, fix
          weak proof, match real jobs, and build a practical 30/60/90-day
          roadmap.
        </p>

        <div className="mt-6 max-w-3xl rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-[0_18px_55px_rgba(15,23,42,0.07)]">
          <p className="text-base leading-7 text-slate-700">
            Most resume tools rewrite your resume. SkillMint tells you which
            roles your resume actually fits, what proof is missing, and what
            to build next.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
            {[
              "Profile-fit roles",
              "Proof Confidence",
              "Latest JD Match",
              "30-day next actions",
            ].map((label) => (
              <span
                key={label}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-800"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link
            href={ROUTES.SIGNUP}
            className="rounded-xl bg-emerald-600 px-8 py-4 font-bold text-white shadow-[0_14px_30px_rgba(5,150,105,0.18)] transition hover:bg-emerald-700"
          >
            Start Free
          </Link>

          <a
            href="#preview"
            className="rounded-xl border border-slate-200 bg-white px-8 py-4 font-semibold text-slate-700 shadow-[0_10px_30px_rgba(15,23,42,0.05)] transition hover:border-emerald-300 hover:text-emerald-800"
          >
            See Product Preview
          </a>
        </div>

        <p className="mt-6 text-sm text-slate-500">
          No job guarantees. Just clearer proof, gaps, and next actions.
        </p>
      </div>
    </section>
  );
}
