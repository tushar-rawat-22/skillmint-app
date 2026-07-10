export type SkillDistributionItem = {
  label: string;
  value: string;
  detail: string;
  meta?: string;
  tone: "emerald" | "sky" | "amber" | "rose" | "violet" | "neutral";
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
    <article className="overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-950 shadow-[0_14px_42px_rgba(15,23,42,0.06)]">
      <div className="border-b border-slate-200 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              {title}
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Proof evidence breakdown
            </h2>
          </div>

          <p className="max-w-xl text-sm leading-6 text-slate-600">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <EvidenceCard key={item.label} item={item} />
        ))}
      </div>
    </article>
  );
}

type EvidenceCardProps = {
  item: SkillDistributionItem;
};

function EvidenceCard({ item }: EvidenceCardProps) {
  const tone = getToneClassName(item.tone);

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-5 transition-colors duration-200 hover:border-emerald-200 hover:bg-white">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-slate-950">
          {item.label}
        </p>

        <span className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>
          {item.meta ?? "Found"}
        </span>
      </div>

      <p className={`mt-5 break-words text-2xl font-black leading-tight ${tone.text}`}>
        {item.value}
      </p>

      <p className="mt-3 text-sm leading-6 text-slate-600">
        {item.detail}
      </p>
    </div>
  );
}

function getToneClassName(tone: SkillDistributionItem["tone"]): {
  text: string;
  badge: string;
} {
  if (tone === "emerald") {
    return {
      text: "text-emerald-700",
      badge: "border-emerald-200 bg-emerald-50 text-emerald-800",
    };
  }

  if (tone === "sky") {
    return {
      text: "text-sky-700",
      badge: "border-sky-200 bg-sky-50 text-sky-800",
    };
  }

  if (tone === "amber") {
    return {
      text: "text-amber-700",
      badge: "border-amber-200 bg-amber-50 text-amber-800",
    };
  }

  if (tone === "rose") {
    return {
      text: "text-rose-700",
      badge: "border-rose-200 bg-rose-50 text-rose-800",
    };
  }

  if (tone === "violet") {
    return {
      text: "text-slate-700",
      badge: "border-slate-200 bg-white text-slate-700",
    };
  }

  return {
    text: "text-slate-700",
    badge: "border-slate-200 bg-white text-slate-700",
  };
}
