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
    <article className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-white">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
        {title}
      </p>

      <p className="mt-2 text-sm leading-6 text-neutral-400">
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

                  <p className="mt-1 truncate text-xs text-neutral-500">
                    {item.detail}
                  </p>
                </div>

                <p className="shrink-0 text-lg font-black tabular-nums">
                  {normalizedValue}%
                </p>
              </div>

              <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-800">
                <div
                  className={`h-full rounded-full ${getToneClassName(
                    item.tone,
                  )}`}
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
    return "bg-sky-400";
  }

  if (tone === "amber") {
    return "bg-amber-400";
  }

  if (tone === "violet") {
    return "bg-violet-400";
  }

  return "bg-emerald-400";
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
