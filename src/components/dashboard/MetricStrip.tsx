import { premiumCompactSurface } from "@/components/ui/premium";
import type { ProofScoreResult } from "@/intelligence/proof";
import type {
  ATSResult,
  RecruiterResult,
  RoleMatchResult,
} from "@/intelligence/types/results";

type Props = {
  proof: ProofScoreResult;
  ats: ATSResult;
  recruiter: RecruiterResult;
  bestMatch?: RoleMatchResult;
  latestJobMatch?: {
    title: string;
    matchScore: number;
  } | null;
};

export default function MetricStrip({
  proof,
  ats,
  recruiter,
  bestMatch,
  latestJobMatch,
}: Props) {
  const metrics = [
    {
      label: "Proof Confidence",
      value: `${Math.round(proof.proofConfidenceScore)}%`,
      detail: `${proof.proofCoverageLabel} · evidence candidates`,
      tone: "text-emerald-700",
    },
    {
      label: "ATS Readiness",
      value: `${Math.round(ats.score)}%`,
      detail: `${ats.verdict} · base resume scan`,
      tone: "text-sky-700",
    },
    {
      label: "Recruiter Confidence",
      value: `${Math.round(recruiter.score)}%`,
      detail: `${recruiter.confidence} · inferred shortlist signal`,
      tone: "text-amber-700",
    },
    {
      label: latestJobMatch ? "Latest JD Match" : "Profile-fit role",
      value: latestJobMatch
        ? `${Math.round(latestJobMatch.matchScore)}%`
        : bestMatch
          ? `${Math.round(bestMatch.matchScore)}%`
          : "--",
      detail: latestJobMatch
        ? `${latestJobMatch.title} · one JD`
        : bestMatch
          ? `${bestMatch.role} · profile-fit`
          : "Upload resume",
      tone: "text-slate-800",
    },
  ];

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <article
          key={metric.label}
          className={`${premiumCompactSurface} min-w-0 transition hover:border-emerald-200 hover:shadow-[0_14px_34px_rgba(15,23,42,0.08)]`}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            {metric.label}
          </p>

          <p className={`mt-3 truncate text-3xl font-black tabular-nums ${metric.tone}`}>
            {metric.value}
          </p>

          <p className="mt-2 break-words text-sm leading-6 text-slate-600">
            {metric.detail}
          </p>
        </article>
      ))}
    </section>
  );
}
