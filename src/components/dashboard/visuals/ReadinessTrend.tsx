type ReadinessTrendProps = {
  score: number;
  topMission: string;
};

const trendLabels = ["Now", "30d", "60d", "90d"];

export default function ReadinessTrend({
  score,
  topMission,
}: ReadinessTrendProps) {
  const projectedScores = buildProjectedScores(score);
  const points = projectedScores.map((value, index) => ({
    label: trendLabels[index],
    value,
    x: 18 + index * 66,
    y: 108 - value * 0.86,
  }));
  const polylinePoints = points
    .map((point) => `${point.x},${point.y}`)
    .join(" ");

  return (
    <article className="rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.06),rgba(255,255,255,0.025))] p-6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition duration-200 hover:border-violet-400/30">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
        Projected Readiness Path
      </p>

      <p className="mt-2 text-sm leading-6 text-neutral-400">
        Projection only, based on completing the next visible mission.
      </p>

      <div className="mt-5 rounded-2xl border border-white/10 bg-black/28 p-4">
        <svg
          viewBox="0 0 220 120"
          className="h-36 w-full"
          role="img"
          aria-label="Projected readiness path"
        >
          <line
            x1="18"
            y1="108"
            x2="216"
            y2="108"
            stroke="rgb(64 64 64)"
            strokeWidth="1"
          />

          <polyline
            points={polylinePoints}
            fill="none"
            stroke="rgb(167 139 250)"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="4"
            className="motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out"
          />

          {points.map((point) => (
            <g key={point.label}>
              <circle
                cx={point.x}
                cy={point.y}
                r="5"
                fill="rgb(139 92 246)"
                stroke="rgb(10 10 10)"
                strokeWidth="3"
                className="motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-out"
              />

              <text
                x={point.x}
                y="119"
                fill="rgb(163 163 163)"
                fontSize="9"
                textAnchor="middle"
              >
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-neutral-300">
        Next mission: {topMission}
      </p>
    </article>
  );
}

function buildProjectedScores(score: number): number[] {
  const currentScore = clampScore(score);
  const gain = currentScore >= 80 ? 4 : 6;

  return [0, 1, 2, 3].map((step) =>
    Math.min(95, currentScore + step * gain),
  );
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
