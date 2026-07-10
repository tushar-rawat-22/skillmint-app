import Link from "next/link";

import {
  premiumEyebrow,
  premiumHeroSurface,
  premiumPrimaryCta,
} from "@/components/ui/premium";
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
  const careerIQBand = careerIQ.label ?? getScoreBand(score);
  const strongestDriver = careerIQ.drivers?.[0];
  const mainCap = careerIQ.capsApplied?.[0];
  const heroDetails = [
    {
      label: "Score band",
      value: careerIQBand,
    },
    {
      label: activeRole.label,
      value: activeRole.value,
    },
    {
      label: "Score basis",
      value: "Weighted resume evidence categories",
    },
    {
      label: activeRole.metricLabel,
      value: activeRole.metricValue,
    },
    mainCap
      ? {
          label: "Score limit",
          value: `${mainCap.maxScore} cap · ${mainCap.reason}`,
        }
      : strongestDriver
        ? {
            label: "Top driver",
            value: strongestDriver,
          }
        : undefined,
  ].filter((detail): detail is HeroDetailProps => Boolean(detail));

  return (
    <section className={`${premiumHeroSurface} overflow-hidden p-0`}>
      <div className="grid gap-0 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="p-6 md:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className={premiumEyebrow}>
                SkillMint Career Report
              </p>

              <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-normal md:text-5xl">
                Honest career readiness, based on your current proof.
              </h1>
            </div>

            <Link
              href={cta.href}
              className={`${premiumPrimaryCta} w-fit`}
            >
              {cta.label}
            </Link>
          </div>

          <p className="mt-6 max-w-3xl text-base leading-7 text-slate-700">
            {careerIQ.summary}
          </p>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
            Career IQ is a weighted readiness signal from resume-internal
            evidence, proof candidates, and explainable caps. It is not a
            hiring guarantee or external verification.
          </p>
        </div>

        <div className="border-t border-slate-200 bg-emerald-50/70 p-6 lg:border-l lg:border-t-0 md:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
            Career IQ
          </p>

          <div className="mt-3 flex min-w-0 items-end gap-3">
            <p className="max-w-full truncate text-7xl font-black leading-none tabular-nums text-slate-950 md:text-8xl">
              {score}
            </p>

            <p className="pb-2 text-2xl font-bold text-emerald-800">
              {careerIQ.grade}
            </p>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {heroDetails.map((detail) => (
              <HeroDetail
                key={detail.label}
                label={detail.label}
                value={detail.value}
              />
            ))}
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
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.05)]">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>

      <p className="mt-2 break-words text-lg font-bold leading-snug text-slate-950">
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
