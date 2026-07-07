import Link from "next/link";

import { ROUTES } from "@/constants/routes";

export default function CTA() {
  return (
    <section
      id="cta"
      className="mx-auto max-w-5xl px-6 py-28 text-center"
    >
      <div className="rounded-3xl border border-emerald-400/20 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.16),transparent_45%),rgba(15,23,42,0.72)] p-8 shadow-2xl shadow-emerald-950/20 md:p-12">
        <h2 className="text-5xl font-black">
          Start free.
          <br />
          Build your next 30 days.
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-400">
          Create an account to save your career direction, resume proof, job
          matches, and roadmap as beta testing continues.
        </p>

        <p className="mt-3 text-sm text-gray-500">
          Free beta for now. Paid plans are not required for your report.
          Upgrade interest only helps shape future Pro guidance.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href={ROUTES.SIGNUP}
            className="rounded-xl bg-emerald-400 px-8 py-4 font-bold text-slate-950 shadow-lg shadow-emerald-950/35 transition hover:bg-emerald-300"
          >
            Start Free
          </Link>

          <a
            href="#preview"
            className="rounded-xl border border-white/15 bg-white/[0.03] px-8 py-4 font-semibold text-gray-100 transition hover:border-emerald-400/60 hover:text-emerald-200"
          >
            See Product Preview
          </a>
        </div>
      </div>
    </section>
  );
}
