const problems = [
  {
    title: "You do not know what to fix first",
    body:
      "Scores are noisy unless they point to the next truthful improvement.",
  },
  {
    title: "Your resume proof feels thin",
    body:
      "Projects, skills, links, and outcomes need to show evidence, not just keywords.",
  },
  {
    title: "Every job description feels different",
    body:
      "SkillMint helps you compare one real role at a time before applying.",
  },
];

export default function Problem() {
  return (
    <section className="border-b border-slate-200 bg-white px-6 py-20">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-emerald-700">
            The Problem
          </p>

          <h2 className="mt-4 text-4xl font-black text-slate-950 md:text-5xl">
            Most students are applying without a clear signal.
          </h2>

          <p className="mt-5 text-base leading-7 text-slate-600">
            SkillMint turns scattered resume feedback into a guided career
            loop: direction, proof, job match, and roadmap.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {problems.map((problem) => (
            <article
              key={problem.title}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-[0_14px_42px_rgba(15,23,42,0.04)]"
            >
              <h3 className="text-lg font-bold text-slate-950">
                {problem.title}
              </h3>

              <p className="mt-3 text-sm leading-6 text-slate-600">
                {problem.body}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
