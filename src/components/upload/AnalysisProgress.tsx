type Props = {
  loading: boolean;
};

export default function AnalysisProgress({
  loading,
}: Props) {
  if (!loading) return null;

  return (
    <section className="mx-auto mt-12 max-w-5xl">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-[0_14px_42px_rgba(15,23,42,0.06)] md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Resume Intelligence Builder
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Building your career signal
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              SkillMint is moving through staged resume processing. These are
              status labels, not fake percentages, so the report opens as soon
              as the real analysis finishes.
            </p>
          </div>

          <span className="w-fit rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
            Processing
          </span>
        </div>

        <div className="relative mt-7 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-200/60 to-transparent skillmint-scan-line" />

          <div className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Uploading resume",
              "Extracting text",
              "Detecting skills and projects",
              "Building career report",
              "Saving progress",
            ].map((step, index) => (
              <div
                key={step}
                className="rounded-lg border border-slate-200 bg-white p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 text-xs font-black text-emerald-800">
                    {index + 1}
                  </span>

                  <p className="text-sm font-semibold text-slate-800">
                    {step}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 h-1 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/2 rounded-full bg-emerald-700 skillmint-indeterminate-bar" />
        </div>
      </div>
    </section>
  );
}
