type ScoreRingProps = {
  score: number;
  label: string;
  grade?: string;
  caption?: string;
};

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ScoreRing({
  score,
  label,
  grade,
  caption,
}: ScoreRingProps) {
  const normalizedScore = clampScore(score);
  const strokeOffset =
    CIRCUMFERENCE - (normalizedScore / 100) * CIRCUMFERENCE;

  return (
    <article className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.035)]">
      <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative h-40 w-40 shrink-0">
          <svg
            viewBox="0 0 140 140"
            className="h-40 w-40 -rotate-90"
            aria-hidden="true"
          >
            <circle
              cx="70"
              cy="70"
              r={RADIUS}
              fill="none"
              stroke="rgb(38 38 38)"
              strokeWidth="12"
            />

            <circle
              cx="70"
              cy="70"
              r={RADIUS}
              fill="none"
              stroke="rgb(52 211 153)"
              strokeLinecap="round"
              strokeWidth="12"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={strokeOffset}
              className="motion-safe:transition-[stroke-dashoffset] motion-safe:duration-700 motion-safe:ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black tabular-nums">
              {normalizedScore}
            </span>

            {grade && (
              <span className="mt-1 text-sm font-bold text-emerald-300">
                {grade}
              </span>
            )}
          </div>
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">
            {label}
          </p>

          <h2 className="mt-3 text-2xl font-black">
            Current readiness signal
          </h2>

          {caption && (
            <p className="mt-3 text-sm leading-6 text-neutral-400">
              {caption}
            </p>
          )}

          <p className="mt-3 text-xs leading-5 text-neutral-500">
            Band: {getScoreBand(normalizedScore)}. Directional, not externally
            verified.
          </p>
        </div>
      </div>
    </article>
  );
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function getScoreBand(score: number): string {
  if (score >= 85) return "Strong";
  if (score >= 70) return "Competitive";
  if (score >= 55) return "Developing";
  if (score >= 40) return "Weak";

  return "Critical";
}
