import Link from "next/link";

import { ROUTES } from "@/constants/routes";

export default function CTA() {
  return (
    <section
      id="cta"
      className="mx-auto max-w-5xl px-6 py-20 text-center"
    >
      <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,23,42,0.1)] md:p-12">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
          Free beta
        </p>

        <h2 className="mt-4 text-4xl font-black text-slate-950 md:text-5xl">
          Start free.
          <br />
          Build your next 30 days.
        </h2>

        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
          Create an account to save your career direction, resume proof, job
          matches, and roadmap as beta testing continues.
        </p>

        <p className="mt-3 text-sm text-slate-500">
          Free beta for now. Paid plans are not required for your report.
          Upgrade interest only helps shape future Pro guidance.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link
            href={ROUTES.SIGNUP}
            className="rounded-xl bg-emerald-600 px-8 py-4 font-bold text-white shadow-[0_14px_30px_rgba(5,150,105,0.18)] transition hover:bg-emerald-700"
          >
            Start Free
          </Link>

          <a
            href="#preview"
            className="rounded-xl border border-slate-300 bg-white px-8 py-4 font-semibold text-slate-700 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-900"
          >
            See Product Preview
          </a>
        </div>
      </div>
    </section>
  );
}
