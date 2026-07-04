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
    <article className="rounded-lg border border-neutral-800 bg-neutral-900 p-6 text-white">
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

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {items.map((item) => {
          const percentage = getPercentage(item.value, item.max);

          return (
            <div
              key={item.label}
              className="min-w-0 rounded-lg border border-neutral-800 bg-black/30 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">
                    {item.label}
                  </p>

                  <p className="mt-1 truncate text-xs text-neutral-500">
                    {item.detail}
                  </p>
                </div>

                <p className="shrink-0 text-sm font-black tabular-nums text-emerald-300">
                  {Math.round(percentage)}%
                </p>
              </div>

              <div className="mt-4 h-16 overflow-hidden rounded-lg bg-neutral-800">
                <div
                  className="h-full rounded-lg bg-gradient-to-t from-emerald-500 to-green-300"
                  style={{
                    transform: `translateY(${100 - percentage}%)`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
}

function getPercentage(value: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, (value / max) * 100));
}
