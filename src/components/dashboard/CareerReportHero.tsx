import Link from "next/link";

import type { ProofScoreResult } from "@/intelligence/proof";
import type { CareerIQResult } from "@/intelligence/types/results";

type Props = {
  careerIQ: CareerIQResult;
  proof: ProofScoreResult;
  cta: {
    label: string;
    href: string;
  };
  activeRole: {
    label: string;
    value: string;
    metricLabel: string;
    metricValue: string;
  };
};

export default function CareerReportHero({
  careerIQ,
  proof,
  cta,
  activeRole,
}: Props) {
  const score = Math.round(careerIQ.score);
  const careerIQBand = getScoreBand(score);

  return (
    <section className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(2,6,23,0.98))] text-white shadow-xl shadow-black/20">
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
              href={cta.href}
              className="w-fit rounded-xl bg-emerald-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-300"
            >
              {cta.label}
            </Link>
          </div>

          <p className="mt-6 max-w-3xl text-base leading-7 text-neutral-300">
            {careerIQ.summary}
          </p>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-emerald-100/80">
            Career IQ is a trust-adjusted readiness signal from base resume
            signals and Proof Confidence. It is not a hiring guarantee or
            external verification.
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
              label="Score band"
              value={careerIQBand}
            />

            <HeroDetail
              label={activeRole.label}
              value={activeRole.value}
            />

            <HeroDetail
              label="Score basis"
              value="Resume detection + proof candidates"
            />

            <HeroDetail
              label={activeRole.metricLabel}
              value={activeRole.metricValue}
            />
          </div>

          <div className="mt-4">
            <HeroDetail
              label="Proof Confidence"
              value={`${Math.round(proof.proofConfidenceScore)}% · ${
                proof.proofCoverageLabel
              }`}
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

      <p className="mt-2 break-words text-lg font-bold leading-snug text-white">
        {value}
      </p>
    </div>
  );
}

function getScoreBand(score: number): string {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Competitive";
  if (score >= 55) return "Developing";
  if (score >= 40) return "Weak";

  return "Critical";
}
