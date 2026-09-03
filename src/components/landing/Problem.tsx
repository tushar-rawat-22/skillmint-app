const evidenceGap = [
  {
    claim: "API integration",
    currentSupport: "Listed as a skill",
    missingEvidence: "No owned endpoint, constraint, or result is described",
  },
  {
    claim: "Team delivery",
    currentSupport: "Collaboration is mentioned",
    missingEvidence: "The candidate's contribution and trade-offs are unclear",
  },
  {
    claim: "Project impact",
    currentSupport: "A project is present",
    missingEvidence: "The result is not measurable or inspectable",
  },
];

export default function Problem() {
  return (
    <section className="border-b border-slate-200 bg-[#f7f5ef] px-6 py-20">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-emerald-800">
            The evidence gap
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.03em] text-slate-950 md:text-5xl">
            A polished claim is not the same as supported evidence.
          </h2>
          <p className="mt-5 text-base leading-7 text-slate-600">
            SkillMint separates what the resume says from what the resume
            currently supports. Missing evidence is treated as unverified—not
            false—and becomes a concrete improvement target.
          </p>
        </div>

        <div className="overflow-hidden border-y border-slate-300 bg-white">
          <div className="hidden grid-cols-[0.7fr_1fr_1.25fr] gap-5 border-b border-slate-300 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500 sm:grid">
            <p>Resume claim</p>
            <p>Current support</p>
            <p>Evidence still needed</p>
          </div>
          {evidenceGap.map((item) => (
            <article
              key={item.claim}
              className="grid gap-3 border-b border-slate-200 px-5 py-5 last:border-b-0 sm:grid-cols-[0.7fr_1fr_1.25fr] sm:gap-5"
            >
              <h3 className="font-bold text-slate-950">{item.claim}</h3>
              <p className="text-sm leading-6 text-slate-700">
                {item.currentSupport}
              </p>
              <p className="text-sm leading-6 text-amber-900">
                {item.missingEvidence}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
