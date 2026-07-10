type Props = {
  score: number;
};

export default function RecruiterConfidenceCard({ score }: Props) {
  const roundedScore = Math.round(score);

  return (
    <div className="min-w-0 rounded-3xl border border-slate-200 bg-white p-6 text-slate-950 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
        Recruiter Confidence
      </p>

      <h2 className="mt-3 max-w-full truncate text-4xl font-bold leading-none tabular-nums md:text-5xl">
        {roundedScore}%
      </h2>
    </div>
  );
}
