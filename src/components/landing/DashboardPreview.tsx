const proofBars = [
  ["Skills", 82],
  ["Projects", 58],
  ["Experience", 64],
  ["Links", 46],
] satisfies Array<[string, number]>;

export default function DashboardPreview() {
  return (
    <section
      id="preview"
      className="mx-auto max-w-7xl px-6 py-24"
    >
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-green-400">
            Product Preview
          </p>

          <h2 className="mt-4 text-4xl font-black text-white md:text-5xl">
            A career cockpit, not another resume score.
          </h2>

          <p className="mt-5 text-base leading-7 text-gray-400">
            This example preview shows how SkillMint turns resume proof into
            readiness, job match signals, and one practical next action.
          </p>
        </div>

        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(15,118,110,0.18),rgba(15,23,42,0.94)_38%,rgba(2,6,23,0.98))] p-5 shadow-2xl shadow-emerald-950/25">
          <div className="pointer-events-none absolute inset-x-12 top-0 h-28 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="flex flex-col gap-3 border-b border-white/10 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-green-300">
                Example Career IQ Report
              </p>

              <h3 className="mt-2 text-2xl font-black text-white">
                Frontend Intern Readiness
              </h3>
            </div>

            <span className="w-fit rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-xs font-semibold text-green-200">
              Preview data
            </span>
          </div>

          <div className="relative mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-2xl border border-emerald-400/20 bg-black/35 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <p className="text-sm font-semibold text-gray-400">
                Career IQ
              </p>

              <div className="mt-5 grid place-items-center">
                <div className="grid size-36 place-items-center rounded-full bg-[conic-gradient(#22c55e_0_78%,rgba(255,255,255,0.08)_78%_100%)]">
                  <div className="grid size-28 place-items-center rounded-full bg-neutral-950">
                    <div className="text-center">
                      <p className="text-5xl font-black text-white">78</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-green-300">
                        Medium
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-gray-400">
                Good direction, but proof needs stronger project evidence.
              </p>
            </article>

            <div className="grid gap-4">
              <article className="rounded-2xl border border-white/10 bg-black/35 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-gray-300">
                    Resume proof strength
                  </p>

                  <span className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-3 py-1 text-xs font-semibold text-yellow-100">
                    Medium
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {proofBars.map(([label, value]) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>{label}</span>
                        <span>{value}%</span>
                      </div>

                      <div className="mt-2 h-2 rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-sky-300"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <div className="grid gap-4 sm:grid-cols-3">
                <PreviewMetric
                  label="ATS Readiness"
                  value="72%"
                  detail="Job-specific"
                />

                <PreviewMetric
                  label="Recruiter Confidence"
                  value="B"
                  detail="Proof score"
                />

                <PreviewMetric
                  label="Roadmap"
                  value="30"
                  detail="Day focus"
                />
              </div>
            </div>
          </div>

          <div className="relative mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <article className="rounded-2xl border border-violet-400/20 bg-violet-400/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-200">
                Roadmap progress
              </p>

              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-3xl font-black text-white">30d</p>
                  <p className="mt-1 text-xs text-violet-100/70">
                    Proof sprint
                  </p>
                </div>

                <div className="h-2 w-32 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-violet-400 to-emerald-300" />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                Next best action
              </p>

              <h4 className="mt-3 text-lg font-bold text-white">
                Add stronger project proof before applying.
              </h4>

              <p className="mt-2 text-sm leading-6 text-emerald-50/80">
                Strengthen one role-aligned project with a README, screenshots,
                deployment link, and measurable outcome.
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}

type PreviewMetricProps = {
  label: string;
  value: string;
  detail: string;
};

function PreviewMetric({ label, value, detail }: PreviewMetricProps) {
  return (
    <article className="rounded-2xl border border-white/10 bg-black/35 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="text-xs leading-5 text-gray-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black text-white">
        {value}
      </p>

      <p className="mt-1 text-xs text-gray-500">
        {detail}
      </p>
    </article>
  );
}
