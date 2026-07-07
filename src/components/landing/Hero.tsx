import Link from "next/link";

import { ROUTES } from "@/constants/routes";

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-white/10 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(16,185,129,0.24),transparent_44%),linear-gradient(180deg,rgba(15,23,42,0.22),rgba(2,6,23,0.92))]" />
      <div className="absolute left-1/2 top-28 h-72 w-[min(920px,90vw)] -translate-x-1/2 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-6 py-24 text-center md:py-32">
        <div className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-5 py-2 text-sm font-semibold text-emerald-100 shadow-[0_0_40px_rgba(16,185,129,0.08)]">
          Career Operating System for students and freshers
        </div>

        <h1 className="mt-10 max-w-5xl text-5xl font-black leading-[0.98] tracking-tight text-white md:text-7xl">
          Turn your resume into
          <span className="block bg-gradient-to-r from-emerald-200 via-emerald-400 to-sky-300 bg-clip-text text-transparent">
            a career action plan.
          </span>
        </h1>

        <p className="mt-8 max-w-3xl text-lg leading-8 text-gray-300 md:text-xl">
          SkillMint helps students and freshers understand their readiness, fix
          weak proof, match real jobs, and build a practical 30/60/90-day
          roadmap.
        </p>

        <div className="mt-6 max-w-3xl rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <p className="text-base leading-7 text-gray-200">
            Most resume tools rewrite your resume. SkillMint tells you which
            roles your resume actually fits, what proof is missing, and what
            to build next.
          </p>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-gray-300">
            {[
              "Profile-fit roles",
              "Proof Confidence",
              "Latest JD Match",
              "30-day next actions",
            ].map((label) => (
              <span
                key={label}
                className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-emerald-100"
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link
            href={ROUTES.SIGNUP}
            className="rounded-xl bg-emerald-400 px-8 py-4 font-bold text-slate-950 shadow-2xl shadow-emerald-950/50 transition hover:bg-emerald-300"
          >
            Start Free
          </Link>

          <a
            href="#preview"
            className="rounded-xl border border-white/15 bg-white/[0.04] px-8 py-4 font-semibold text-gray-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] transition hover:border-emerald-400/60 hover:bg-white/[0.07] hover:text-emerald-200"
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
