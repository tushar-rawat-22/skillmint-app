const features = [
  {
    title: "Direction before scores",
    description:
      "Choose your target role, experience level, goal, and weekly pace first.",
  },
  {
    title: "Resume intelligence",
    description:
      "Upload once to see extracted skills, projects, gaps, and readiness signals.",
  },
  {
    title: "JD matching",
    description:
      "Paste one real job description and see where your resume is competitive.",
  },
  {
    title: "Roadmaps that stay practical",
    description:
      "Turn the latest resume and JD match into focused 30/60/90-day actions.",
  },
];

export default function Features() {
  return (
    <section
      id="features"
      className="mx-auto max-w-7xl px-6 py-28"
    >
      <div className="mb-16 text-center">

        <h2 className="text-5xl font-black">

          Why SkillMint.

        </h2>

        <p className="mt-6 text-lg text-gray-400">

          A simple operating system for students who need the next honest step.

        </p>

      </div>

      <div className="grid gap-8 md:grid-cols-2">

        {features.map((feature) => (

          <div
            key={feature.title}
            className="rounded-3xl border border-gray-200 bg-white p-10 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
          >

            <h3 className="text-3xl font-bold text-gray-950">

              {feature.title}

            </h3>

            <p className="mt-6 text-lg leading-8 text-gray-600">

              {feature.description}

            </p>

          </div>

        ))}

      </div>

    </section>
  );
}
