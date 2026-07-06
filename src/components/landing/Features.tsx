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
      className="mx-auto max-w-7xl px-6 py-24"
    >
      <div className="mb-14 text-center">
        <h2 className="text-4xl font-black md:text-5xl">
          What you get.
        </h2>

        <p className="mt-6 text-lg text-gray-400">
          Fewer vague suggestions. More clear proof, match, and action.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-white/10 bg-[linear-gradient(145deg,rgba(255,255,255,0.055),rgba(255,255,255,0.025))] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition duration-300 hover:border-emerald-400/35"
          >
            <h3 className="text-2xl font-bold text-white">
              {feature.title}
            </h3>

            <p className="mt-4 text-sm leading-6 text-gray-400">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
