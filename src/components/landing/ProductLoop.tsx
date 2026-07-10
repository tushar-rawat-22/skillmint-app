import Link from "next/link";

import { ROUTES } from "@/constants/routes";

const productLoopSteps = [
  {
    title: "Setup",
    description:
      "Choose your target role, goal, experience level, and weekly pace.",
  },
  {
    title: "Resume",
    description:
      "Upload your resume so SkillMint can read the proof you already have.",
  },
  {
    title: "Job Match",
    description:
      "Paste one job description to compare your resume against that role.",
  },
  {
    title: "Roadmap",
    description:
      "Build a focused 30/60/90-day plan from your direction, proof, and match.",
  },
];

export default function ProductLoop() {
  return (
    <section
      id="how-it-works"
      className="border-y border-slate-200 bg-[#f7f5ef] px-6 py-20"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">
            How SkillMint Works
          </p>

          <h2 className="mt-4 text-4xl font-black text-slate-950 md:text-5xl">
            One loop from direction to action.
          </h2>

          <p className="mt-5 text-base leading-7 text-slate-600">
            SkillMint starts with where you want to go, then uses your resume
            and one job description at a time to show the most useful next move.
          </p>
        </div>

        <div className="mt-10 grid max-w-5xl gap-4 md:grid-cols-2">
          {productLoopSteps.map((step, index) => (
            <article
              key={step.title}
              className="min-w-0 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_42px_rgba(15,23,42,0.04)]"
            >
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                {index + 1}
              </span>

              <h3 className="mt-4 text-lg font-bold text-slate-950">
                {step.title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {step.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href={ROUTES.SIGNUP}
            className="rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-[0_14px_30px_rgba(5,150,105,0.18)] transition hover:bg-emerald-700"
          >
            Start Free
          </Link>

          <a
            href="#preview"
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-800"
          >
            See Preview
          </a>
        </div>
      </div>
    </section>
  );
}
