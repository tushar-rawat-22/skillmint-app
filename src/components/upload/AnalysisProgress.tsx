type Props = {
  loading: boolean;
};

export default function AnalysisProgress({
  loading,
}: Props) {
  if (!loading) return null;

  return (
    <section className="mx-auto mt-12 max-w-5xl">
      <div className="overflow-hidden rounded-3xl border border-cyan-400/25 bg-[linear-gradient(145deg,rgba(8,145,178,0.13),rgba(15,23,42,0.86))] p-6 text-white shadow-2xl shadow-cyan-950/15 md:p-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-300">
              Resume Intelligence Builder
            </p>

            <h2 className="mt-3 text-2xl font-black">
              Building your career signal
            </h2>

            <p className="mt-3 max-w-2xl text-sm leading-6 text-neutral-400">
              SkillMint is extracting structure, reading proof signals, and
              preparing your career intelligence dashboard. This may take a
              few seconds.
            </p>
          </div>

          <span className="w-fit rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs font-bold text-cyan-100">
            Processing
          </span>
        </div>

        <div className="relative mt-7 overflow-hidden rounded-2xl border border-white/10 bg-black/35 p-5">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent skillmint-scan-line" />

          <div className="relative grid gap-3 md:grid-cols-4">
            {[
              "Resume received",
              "Scanning resume structure",
              "Building career intelligence",
              "Preparing results",
            ].map((step, index) => (
              <div
                key={step}
                className="rounded-lg border border-neutral-800 bg-neutral-950/80 p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/10 text-xs font-black text-cyan-100">
                    {index + 1}
                  </span>

                  <p className="text-sm font-semibold text-neutral-100">
                    {step}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-5 h-1 overflow-hidden rounded-full bg-neutral-800">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-cyan-400 via-violet-400 to-emerald-400 skillmint-indeterminate-bar" />
        </div>
      </div>
    </section>
  );
}
