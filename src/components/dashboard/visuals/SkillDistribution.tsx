export type SkillDistributionItem = {
  label: string;
  value: number;
  max: number;
  detail: string;
};

type SkillDistributionProps = {
  title: string;
  subtitle: string;
  items: SkillDistributionItem[];
};

export default function SkillDistribution({
  title,
  subtitle,
  items,
}: SkillDistributionProps) {
  return (
    <article className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/95 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="border-b border-neutral-800 bg-black/20 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
              {title}
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Proof signal distribution
            </h2>
          </div>

          <p className="max-w-xl text-sm leading-6 text-neutral-400">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="grid gap-px bg-neutral-800 md:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => {
          const percentage = getPercentage(item.value, item.max);

          return (
            <GaugeCard
              key={item.label}
              item={item}
              percentage={percentage}
            />
          );
        })}
      </div>
    </article>
  );
}

type GaugeCardProps = {
  item: SkillDistributionItem;
  percentage: number;
};

function GaugeCard({ item, percentage }: GaugeCardProps) {
  const needleRotation = -90 + percentage * 1.8;
  const tone = getGaugeTone(percentage);

  return (
    <div className="min-w-0 bg-neutral-950 p-5 transition-colors duration-200 hover:bg-neutral-900/80">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="truncate text-sm font-bold">
            {item.label}
          </p>

          <p className="mt-1 truncate text-xs text-neutral-500">
            {item.detail}
          </p>
        </div>

        <p className={`text-lg font-black tabular-nums ${tone.text}`}>
          {Math.round(percentage)}%
        </p>
      </div>

      <div className="mt-5 rounded-lg border border-neutral-800 bg-black/40 p-4">
        <svg
          viewBox="0 0 180 112"
          className="h-28 w-full"
          role="img"
          aria-label={`${item.label} proof signal ${Math.round(
            percentage,
          )}%`}
        >
          <path
            d="M25 88 A65 65 0 0 1 155 88"
            fill="none"
            pathLength="100"
            stroke="rgb(38 38 38)"
            strokeLinecap="round"
            strokeWidth="14"
          />

          <path
            d="M25 88 A65 65 0 0 1 155 88"
            fill="none"
            pathLength="100"
            stroke={tone.stroke}
            strokeDasharray={`${percentage} ${100 - percentage}`}
            strokeLinecap="round"
            strokeWidth="14"
            className="motion-safe:transition-[stroke-dasharray] motion-safe:duration-700 motion-safe:ease-out"
          />

          <line
            x1="90"
            y1="88"
            x2="90"
            y2="34"
            stroke="rgb(245 245 245)"
            strokeLinecap="round"
            strokeWidth="3"
            style={{
              transform: `rotate(${needleRotation}deg)`,
              transformBox: "fill-box",
              transformOrigin: "50% 100%",
            }}
            className="motion-safe:transition-transform motion-safe:duration-700 motion-safe:ease-out"
          />

          <circle
            cx="90"
            cy="88"
            r="6"
            fill="rgb(245 245 245)"
          />

          <text
            x="25"
            y="107"
            fill="rgb(115 115 115)"
            fontSize="10"
            fontWeight="700"
          >
            LOW
          </text>

          <text
            x="132"
            y="107"
            fill="rgb(115 115 115)"
            fontSize="10"
            fontWeight="700"
          >
            STRONG
          </text>
        </svg>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-xs">
        <span className="rounded-full border border-neutral-800 px-2.5 py-1 font-semibold text-neutral-400">
          {item.value}/{item.max}
        </span>

        <span className={`rounded-full border px-2.5 py-1 font-semibold ${
          tone.badge
        }`}
        >
          {getGaugeLabel(percentage)}
        </span>
      </div>
    </div>
  );
}

function getPercentage(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (value / max) * 100));
}

function getGaugeTone(percentage: number): {
  stroke: string;
  text: string;
  badge: string;
} {
  if (percentage >= 75) {
    return {
      stroke: "rgb(52 211 153)",
      text: "text-emerald-300",
      badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    };
  }

  if (percentage >= 50) {
    return {
      stroke: "rgb(251 191 36)",
      text: "text-amber-300",
      badge: "border-amber-500/30 bg-amber-500/10 text-amber-100",
    };
  }

  return {
    stroke: "rgb(248 113 113)",
    text: "text-red-300",
    badge: "border-red-500/30 bg-red-500/10 text-red-100",
  };
}

function getGaugeLabel(percentage: number): string {
  if (percentage >= 75) {
    return "Strong";
  }

  if (percentage >= 50) {
    return "Building";
  }

  return "Thin";
}
