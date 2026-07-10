const features = [
  {
    title: "Clarity before scores",
    description:
      "Start with the role, level, goal, and weekly pace you are aiming for.",
  },
  {
    title: "Resume proof gaps",
    description:
      "See where your projects, skills, links, and outcomes need stronger proof.",
  },
  {
    title: "One-job matching",
    description:
      "Paste one real job description and learn where your resume is competitive.",
  },
  {
    title: "A practical roadmap",
    description:
      "Turn your direction, resume proof, and latest match into 30/60/90-day actions.",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="mx-auto max-w-7xl px-6 py-20"
    >
      <div className="mb-14 text-center">
        <h2 className="text-4xl font-black text-slate-950 md:text-5xl">
          What you get.
        </h2>

        <p className="mt-6 text-lg text-slate-600">
          Fewer vague suggestions. More clear proof, match, and action.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_14px_42px_rgba(15,23,42,0.04)]"
          >
            <h3 className="text-2xl font-bold text-slate-950">
              {feature.title}
            </h3>

            <p className="mt-4 text-sm leading-6 text-slate-600">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
