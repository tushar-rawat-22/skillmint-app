const boundaries = [
  {
    title: "Evidence before rewriting",
    description:
      "SkillMint identifies support and gaps before suggesting what to improve. It does not generate a more impressive career story.",
  },
  {
    title: "Action before application volume",
    description:
      "The product focuses on one useful evidence-building move, not job scraping, autofill, auto-apply, or a generic tracker.",
  },
  {
    title: "Explanation before prediction",
    description:
      "Deterministic calculations remain inspectable and subordinate. They are not recruiter, shortlist, interview, or hiring probabilities.",
  },
];

export default function Features() {
  return (
    <section id="difference" className="mx-auto max-w-7xl px-6 py-20">
      <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-emerald-700">
            Deliberately focused
          </p>
          <h2 className="mt-4 text-4xl font-black tracking-[-0.03em] text-slate-950 md:text-5xl">
            SkillMint is not another all-in-one job-search suite.
          </h2>
          <p className="mt-5 text-base leading-7 text-slate-600">
            The private pilot is testing one wedge: whether clearer evidence
            gaps lead early-career candidates to take better improvement
            actions and return with stronger resume evidence.
          </p>
        </div>

        <div className="border-y border-slate-300">
          {boundaries.map((boundary, index) => (
            <article
              key={boundary.title}
              className="grid gap-3 border-b border-slate-200 py-6 last:border-b-0 sm:grid-cols-[2.5rem_0.8fr_1.2fr] sm:gap-5"
            >
              <span className="font-mono text-xs font-bold text-emerald-800">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="font-bold text-slate-950">{boundary.title}</h3>
              <p className="text-sm leading-6 text-slate-600">
                {boundary.description}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
