const evidenceExamples = [
  "Synthetic project entry connects typed UI work to testing and accessibility.",
  "Synthetic outcome names one measured performance improvement.",
  "Synthetic experience entry supports component delivery only partially.",
];

export default function DashboardPreview() {
  return (
    <section id="preview" className="mx-auto max-w-7xl px-6 py-20">
      <div className="grid gap-8 lg:grid-cols-[0.72fr_1.28fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
            Evidence-first preview
          </p>
          <h2 className="mt-4 text-4xl font-black text-slate-950 md:text-5xl">
            Read the evidence before the score.
          </h2>
          <p className="mt-5 text-base leading-7 text-slate-600">
            This synthetic preview starts with what the resume supports, the
            strongest evidence, the main gap, and the next truthful move.
            Calculations remain available as supporting detail.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.1)]">
          <div className="flex flex-col gap-3 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">
                Evidence Summary
              </p>
              <h3 className="mt-2 text-2xl font-black text-slate-950">
                What this resume currently supports
              </h3>
            </div>
            <span className="w-fit rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-800">
              Synthetic preview data
            </span>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-700">
            This synthetic resume supports exploring junior frontend roles
            that value typed interfaces, accessibility, and component testing.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <PreviewSummary
              label="Strongest support"
              body="One project entry ties TypeScript and testing to a shipped interface and measured result."
              tone="emerald"
            />
            <PreviewSummary
              label="Main evidence gap"
              body="API work and collaboration are claimed without enough ownership detail or inspectable context."
              tone="amber"
            />
            <PreviewSummary
              label="Best next move"
              body="Rewrite one project bullet around the problem, contribution, result, and evidence candidate."
              tone="sky"
            />
          </div>

          <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Selected synthetic evidence
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                {evidenceExamples.map((example) => (
                  <li key={example}>• {example}</li>
                ))}
              </ul>
            </article>

            <details className="rounded-2xl border border-slate-200 bg-white p-5">
              <summary className="cursor-pointer font-bold text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-600">
                How this analysis was calculated
              </summary>
              <dl className="mt-4 grid gap-3 text-sm">
                <Calculation label="Career IQ" value="68%" />
                <Calculation label="Proof Confidence" value="63%" />
                <Calculation label="ATS readiness" value="71%" />
                <Calculation label="Synthetic JD relevance" value="74%" />
              </dl>
            </details>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-500">
            All information in this preview is invented. SkillMint has not
            externally verified any source or candidate claim.
          </p>
          <p className="mt-2 border-l-2 border-emerald-600 pl-3 text-xs font-semibold leading-5 text-slate-700">
            After the resume changes, saved reports can compare detected
            evidence. Completing an action alone never creates proof.
          </p>
        </div>
      </div>
    </section>
  );
}

function PreviewSummary({
  label,
  body,
  tone,
}: {
  label: string;
  body: string;
  tone: "emerald" | "amber" | "sky";
}) {
  const className = tone === "emerald"
    ? "border-emerald-200 bg-emerald-50"
    : tone === "amber"
      ? "border-amber-200 bg-amber-50"
      : "border-sky-200 bg-sky-50";

  return (
    <article className={`rounded-2xl border p-5 ${className}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
        {label}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-800">{body}</p>
    </article>
  );
}

function Calculation({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2 last:border-0 last:pb-0">
      <dt className="text-slate-600">{label}</dt>
      <dd className="font-black tabular-nums text-slate-950">{value}</dd>
    </div>
  );
}
