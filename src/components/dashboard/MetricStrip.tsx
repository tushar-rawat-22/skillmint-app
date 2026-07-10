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
      tone: "text-emerald-300",
    },
    {
      label: "ATS Readiness",
      value: `${Math.round(ats.score)}%`,
      detail: `${ats.verdict} · base resume scan`,
      tone: "text-sky-300",
    },
    {
      label: "Recruiter Confidence",
      value: `${Math.round(recruiter.score)}%`,
      detail: `${recruiter.confidence} · inferred shortlist signal`,
      tone: "text-amber-300",
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

          <p className="mt-2 break-words text-sm leading-6 text-neutral-400">
            {metric.detail}
          </p>
        </article>
      ))}
    </section>
  );
}
