import { premiumCompactSurface } from "@/components/ui/premium";

export type ScoreBarItem = {
  label: string;
  value: number;
  detail: string;
  tone: "emerald" | "sky" | "amber" | "violet";
};

type ScoreBarsProps = {
  title: string;
  subtitle: string;
  items: ScoreBarItem[];
};

export default function ScoreBars({
  title,
  subtitle,
  items,
}: ScoreBarsProps) {
  return (
    <article className={premiumCompactSurface}>
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>

      <p className="mt-2 text-sm leading-6 text-slate-600">
        {subtitle}
      </p>

      <div className="mt-5 space-y-4">
        {items.map((item) => {
          const normalizedValue = clampScore(item.value);

          return (
            <div key={item.label}>
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {item.label}
                  </p>

                  <p className="mt-1 break-words text-xs leading-5 text-slate-500">
                    {item.detail} · {getScoreBand(normalizedValue)}
                  </p>
                </div>

                <p className="shrink-0 text-lg font-black tabular-nums">
                  {normalizedValue}%
                </p>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full ${getToneClassName(
                    item.tone,
                  )} motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out`}
                  style={{ width: `${normalizedValue}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function getToneClassName(tone: ScoreBarItem["tone"]): string {
  if (tone === "sky") {
    return "bg-sky-600";
  }

  if (tone === "amber") {
    return "bg-amber-500";
  }

  if (tone === "violet") {
    return "bg-slate-500";
  }

  return "bg-emerald-700";
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
