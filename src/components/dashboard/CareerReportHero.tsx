import Link from "next/link";

import type {
  CareerIQResult,
  RoleMatchResult,
  SalaryResult,
} from "@/intelligence/types/results";

type Props = {
  careerIQ: CareerIQResult;
  bestMatch?: RoleMatchResult;
  salary: SalaryResult;
};

export default function CareerReportHero({
  careerIQ,
  bestMatch,
  salary,
}: Props) {
  const score = Math.round(careerIQ.score);

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_38%),linear-gradient(135deg,rgba(15,23,42,0.94),rgba(2,6,23,0.98))] text-white shadow-2xl shadow-black/30">
      <div className="grid gap-0 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-300">
                SkillMint Career Report
              </p>

              <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-normal md:text-5xl">
                Honest career readiness, based on your current proof.
              </h1>
            </div>

            <Link
              href="/upload"
              className="w-fit rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300"
            >
              Upload Resume
            </Link>
          </div>

          <p className="mt-6 max-w-3xl text-base leading-7 text-neutral-300">
            {careerIQ.summary}
          </p>
        </div>

        <div className="border-t border-white/10 bg-black/28 p-6 lg:border-l lg:border-t-0 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-neutral-500">
            Career IQ
          </p>

          <div className="mt-3 flex min-w-0 items-end gap-3">
            <p className="max-w-full truncate text-7xl font-black leading-none tabular-nums text-white md:text-8xl">
              {score}
            </p>

            <p className="pb-2 text-2xl font-bold text-emerald-300">
              {careerIQ.grade}
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <HeroDetail
              label="Best Match"
              value={bestMatch?.role ?? "Not enough data"}
            />

            <HeroDetail
              label="Estimated Salary"
              value={formatSalaryBand(salary.salary)}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

type HeroDetailProps = {
  label: string;
  value: string;
};

function HeroDetail({ label, value }: HeroDetailProps) {
  return (
    <div className="min-w-0 rounded-2xl border border-white/10 bg-white/[0.04] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">
        {label}
      </p>

      <p className="mt-2 truncate text-lg font-bold text-white">
        {value}
      </p>
    </div>
  );
}

function formatSalaryBand(salary: number): string {
  const lpa = salary / 100000;
  const lower = Math.max(3, Math.floor((lpa - 0.75) * 2) / 2);
  const upper = Math.max(lower + 0.5, Math.ceil((lpa + 0.75) * 2) / 2);

  return `₹${formatLpa(lower)}-${formatLpa(upper)} LPA`;
}

function formatLpa(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}
