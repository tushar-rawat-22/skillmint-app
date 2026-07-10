import { premiumCompactSurface } from "@/components/ui/premium";

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
    <article className={premiumCompactSurface}>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
        Projected Readiness Path
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        Projection only, based on completing the next visible mission.
      </p>

      <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
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
            stroke="rgb(203 213 225)"
            strokeWidth="1"
          />

          <polyline
            points={polylinePoints}
            fill="none"
            stroke="rgb(4 120 87)"
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
                fill="rgb(5 150 105)"
                stroke="rgb(248 250 252)"
                strokeWidth="3"
                className="motion-safe:transition-all motion-safe:duration-500 motion-safe:ease-out"
              />

              <text
                x={point.x}
                y="119"
                fill="rgb(100 116 139)"
                fontSize="9"
                textAnchor="middle"
              >
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-700">
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
