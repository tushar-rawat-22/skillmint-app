import type {
  ATSResult,
  RecruiterResult,
  RoleMatchResult,
  SalaryResult,
} from "@/intelligence/types/results";

type Props = {
  ats: ATSResult;
  recruiter: RecruiterResult;
  bestMatch?: RoleMatchResult;
  salary: SalaryResult;
};

export default function MetricStrip({
  ats,
  recruiter,
  bestMatch,
  salary,
}: Props) {
  const metrics = [
    {
      label: "ATS Readiness",
      value: `${Math.round(ats.score)}%`,
      detail: ats.verdict,
      tone: "text-sky-300",
    },
    {
      label: "Recruiter Confidence",
      value: `${Math.round(recruiter.score)}%`,
      detail: recruiter.confidence,
      tone: "text-amber-300",
    },
    {
      label: "Role Match",
      value: bestMatch ? `${Math.round(bestMatch.matchScore)}%` : "--",
      detail: bestMatch?.role ?? "Upload resume",
      tone: "text-emerald-300",
    },
    {
      label: "Salary Signal",
      value: formatSalaryShort(salary.salary),
      detail: "Annual fresher estimate",
      tone: "text-violet-300",
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <article
          key={metric.label}
          className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.045] p-5 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-white/20 hover:bg-white/[0.06]"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
            {metric.label}
          </p>

          <p className={`mt-3 truncate text-3xl font-black tabular-nums ${metric.tone}`}>
            {metric.value}
          </p>

          <p className="mt-2 truncate text-sm text-neutral-400">
            {metric.detail}
          </p>
        </article>
      ))}
    </section>
  );
}

function formatSalaryShort(salary: number): string {
  const lpa = salary / 100000;
  const formattedLpa = Number.isInteger(lpa) ? `${lpa}` : lpa.toFixed(1);

  return `₹${formattedLpa}L`;
}
