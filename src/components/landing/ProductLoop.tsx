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
      className="border-y border-gray-800 bg-neutral-950 px-6 py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-green-400">
            How SkillMint Works
          </p>

          <h2 className="mt-4 text-4xl font-black text-white md:text-5xl">
            One loop from direction to action.
          </h2>

          <p className="mt-5 text-base leading-7 text-gray-400">
            SkillMint starts with where you want to go, then uses your resume
            and one job description at a time to show the most useful next move.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {productLoopSteps.map((step, index) => (
            <article
              key={step.title}
              className="min-w-0 rounded-lg border border-gray-800 bg-black/30 p-5"
            >
              <span className="rounded-full border border-green-500/30 px-3 py-1 text-xs font-semibold text-green-300">
                {index + 1}
              </span>

              <h3 className="mt-4 text-lg font-bold text-white">
                {step.title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-gray-400">
                {step.description}
              </p>
            </article>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href={ROUTES.SIGNUP}
            className="rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-500"
          >
            Start Free
          </Link>

          <a
            href="#preview"
            className="rounded-xl border border-gray-700 px-5 py-3 text-sm font-semibold text-gray-100 transition hover:border-green-500 hover:text-green-300"
          >
            See Preview
          </a>
        </div>
      </div>
    </section>
  );
}
