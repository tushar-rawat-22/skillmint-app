import Link from "next/link";

import { ROUTES } from "@/constants/routes";

const productLoopSteps = [
  {
    title: "Resume",
    description: "Start with the candidate's current resume, not a generated profile.",
  },
  {
    title: "Evidence map",
    description: "Separate supported direction, strongest proof, and weak support.",
  },
  {
    title: "Gap",
    description: "Connect the most important missing evidence to the target role.",
  },
  {
    title: "Next action",
    description: "Choose one practical action that could create clearer evidence.",
  },
  {
    title: "Re-analyze",
    description: "Compare saved reports after the resume actually changes.",
  },
];

type ProductLoopProps = {
  publicSignupEnabled: boolean;
  publicDemoEnabled: boolean;
};

export default function ProductLoop({
  publicSignupEnabled,
  publicDemoEnabled,
}: ProductLoopProps) {
  return (
    <section
      id="how-it-works"
      className="border-y border-slate-200 bg-white px-6 py-20"
    >
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
            The product loop
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.03em] text-slate-950 md:text-5xl">
            Progress means the evidence changed—not that a score was gamed.
          </h2>
          <p className="mt-5 text-base leading-7 text-slate-600">
            SkillMint keeps action and evidence separate. Completing an action
            does not manufacture proof; only a later resume analysis can detect
            changed evidence.
          </p>
        </div>

        <ol className="mt-12 grid border-y border-slate-300 md:grid-cols-5">
          {productLoopSteps.map((step, index) => (
            <li
              key={step.title}
              className="border-b border-slate-200 py-6 md:border-r md:border-b-0 md:px-5 md:last:border-r-0"
            >
              <span className="font-mono text-xs font-bold text-emerald-800">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="mt-3 font-bold text-slate-950">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {step.description}
              </p>
            </li>
          ))}
        </ol>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href={publicDemoEnabled ? ROUTES.DEMO : ROUTES.SIGNUP}
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-emerald-800 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
          >
            {publicDemoEnabled
              ? "Explore live demo"
              : publicSignupEnabled
                ? "Create account"
                : "View early access"}
          </Link>
          <a
            href="#preview"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-emerald-400 hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
          >
            See evidence preview
          </a>
        </div>
      </div>
    </section>
  );
}
