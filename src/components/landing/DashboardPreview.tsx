const evidenceExamples = [
  "Synthetic project entry connects typed UI work to testing and accessibility.",
  "Synthetic outcome names one measured performance improvement.",
  "Synthetic experience entry supports component delivery only partially.",
];

export default function DashboardPreview() {
  return (
    <section id="preview" className="border-y border-slate-200 bg-[#f1efe8] px-6 py-20 lg:py-24">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:items-center">
        <div className="max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-800">
            Evidence-first preview
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.04em] text-slate-950 md:text-5xl">
            Read the evidence before the score.
          </h2>
          <p className="mt-5 text-base leading-7 text-slate-600">
            This synthetic preview starts with what the resume supports, the
            strongest evidence, the main gap, and the next truthful move.
            Calculations remain available as supporting detail.
          </p>
          <div className="mt-8 rounded-2xl border border-slate-300/80 bg-white/70 p-4 text-sm leading-6 text-slate-600 shadow-sm">
            <p className="font-bold text-slate-900">Why this matters</p>
            <p className="mt-1">
              A score without inspectable evidence is easy to over-trust. SkillMint keeps the evidence visible and the calculation secondary.
            </p>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_28px_70px_rgba(15,23,42,0.10)] sm:p-6">
          <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">
                What the resume shows
              </p>
              <h3 className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">
                What this resume currently supports
              </h3>
            </div>
            <span className="w-fit rounded-full bg-violet-50 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-violet-800">
              Synthetic preview
            </span>
          </div>

          <p className="mt-5 max-w-3xl text-sm leading-6 text-slate-700">
            This synthetic resume supports exploring junior frontend roles
            that value typed interfaces, accessibility, and component testing.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
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

          <div className="mt-4 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
            <article className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                Selected synthetic evidence
              </p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
                {evidenceExamples.map((example) => (
                  <li key={example} className="flex gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />
                    <span>{example}</span>
                  </li>
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

          <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-3 text-xs leading-5 text-slate-300">
            <p>
              All information in this preview is invented. SkillMint has not externally verified any source or candidate claim.
            </p>
            <p className="mt-2 font-semibold text-emerald-300">
              After the resume changes, saved reports can compare detected evidence. Completing an action alone never creates proof.
            </p>
          </div>
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
    ? "bg-emerald-50 border-emerald-200"
    : tone === "amber"
      ? "bg-amber-50 border-amber-200"
      : "bg-sky-50 border-sky-200";

  return (
    <article className={`rounded-2xl border p-4 ${className}`}>
      <p className="text-xs font-bold text-slate-700">
        {label}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-800">{body}</p>
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
