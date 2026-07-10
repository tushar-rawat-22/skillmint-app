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
      className="mx-auto max-w-7xl px-6 py-20"
    >
      <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Product Preview
          </p>

          <h2 className="mt-4 text-4xl font-black text-slate-950 md:text-5xl">
            A serious career report, not another resume checker.
          </h2>

          <p className="mt-5 text-base leading-7 text-slate-600">
            This example preview shows how SkillMint turns resume proof into
            readiness, job match signals, and one practical next action.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.1)]">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Example Career IQ Report
              </p>

              <h3 className="mt-2 text-2xl font-black text-slate-950">
                Frontend Intern Readiness
              </h3>
            </div>

            <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              Preview data
            </span>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-sm font-semibold text-emerald-800">
                Career IQ
              </p>

              <div className="mt-5 grid place-items-center">
                <div className="grid size-36 place-items-center rounded-full bg-[conic-gradient(#047857_0_78%,#d1fae5_78%_100%)]">
                  <div className="grid size-28 place-items-center rounded-full bg-white">
                    <div className="text-center">
                      <p className="text-5xl font-black text-slate-950">78</p>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
                        Developing
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <p className="mt-5 text-sm leading-6 text-emerald-950">
                Good direction, but proof needs stronger project evidence.
              </p>
            </article>

            <div className="grid gap-4">
              <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-800">
                    Proof Confidence
                  </p>

                  <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                    Medium
                  </span>
                </div>

                <div className="mt-4 space-y-3">
                  {proofBars.map(([label, value]) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>{label}</span>
                        <span>{value}%</span>
                      </div>

                      <div className="mt-2 h-2 rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-emerald-700"
                          style={{ width: `${value}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <div className="grid gap-4 sm:grid-cols-3">
                <PreviewMetric
                  label="Latest JD Match"
                  value="72%"
                  detail="One pasted JD"
                />

                <PreviewMetric
                  label="Recruiter Confidence"
                  value="72%"
                  detail="Inferred signal"
                />

                <PreviewMetric
                  label="Roadmap"
                  value="30d"
                  detail="Proof focus"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Profile-fit role
              </p>

              <div className="mt-4 flex items-end justify-between gap-4">
                <div>
                  <p className="text-2xl font-black text-slate-950">
                    Frontend Intern
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Separate from Latest JD Match
                  </p>
                </div>

                <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full w-2/3 rounded-full bg-slate-700" />
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
                Next best action
              </p>

              <h4 className="mt-3 text-lg font-bold text-slate-950">
                Add stronger project proof before applying.
              </h4>

              <p className="mt-2 text-sm leading-6 text-emerald-950">
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
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
      <p className="text-xs leading-5 text-slate-500">
        {label}
      </p>

      <p className="mt-2 text-3xl font-black text-slate-950">
        {value}
      </p>

      <p className="mt-1 text-xs text-slate-500">
        {detail}
      </p>
    </article>
  );
}
