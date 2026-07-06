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
    <article className="overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <div className="border-b border-white/10 bg-black/20 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-neutral-500">
              {title}
            </p>

            <h2 className="mt-2 text-2xl font-black">
              Proof evidence breakdown
            </h2>
          </div>

          <p className="max-w-xl text-sm leading-6 text-neutral-400">
            {subtitle}
          </p>
        </div>
      </div>

      <div className="grid gap-px bg-white/10 md:grid-cols-2 xl:grid-cols-5">
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
    <div className="min-w-0 bg-slate-950/70 p-5 transition-colors duration-200 hover:bg-slate-900/70">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold text-white">
          {item.label}
        </p>

        <span className={`shrink-0 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${tone.badge}`}>
          {item.meta ?? "Found"}
        </span>
      </div>

      <p className={`mt-5 break-words text-2xl font-black leading-tight ${tone.text}`}>
        {item.value}
      </p>

      <p className="mt-3 text-sm leading-6 text-neutral-400">
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
      text: "text-emerald-300",
      badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-100",
    };
  }

  if (tone === "sky") {
    return {
      text: "text-sky-300",
      badge: "border-sky-500/30 bg-sky-500/10 text-sky-100",
    };
  }

  if (tone === "amber") {
    return {
      text: "text-amber-300",
      badge: "border-amber-500/30 bg-amber-500/10 text-amber-100",
    };
  }

  if (tone === "rose") {
    return {
      text: "text-rose-300",
      badge: "border-rose-500/30 bg-rose-500/10 text-rose-100",
    };
  }

  if (tone === "violet") {
    return {
      text: "text-violet-300",
      badge: "border-violet-500/30 bg-violet-500/10 text-violet-100",
    };
  }

  return {
    text: "text-neutral-200",
    badge: "border-neutral-700 bg-neutral-900 text-neutral-300",
  };
}
