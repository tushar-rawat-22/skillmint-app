const features = [
  {
    title: "Career IQ",
    description:
      "Measure your complete employability with transparent AI.",
  },
  {
    title: "ATS Optimization",
    description:
      "Know exactly why your resume gets rejected.",
  },
  {
    title: "Recruiter Confidence",
    description:
      "See your profile exactly like recruiters do.",
  },
  {
    title: "Career Roadmaps",
    description:
      "Receive missions that maximize long-term growth.",
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

          Everything your career needs.

        </h2>

        <p className="mt-6 text-lg text-gray-600">

          Built around intelligence instead of guesswork.

        </p>

      </div>

      <div className="grid gap-8 md:grid-cols-2">

        {features.map((feature) => (

          <div
            key={feature.title}
            className="rounded-3xl border border-gray-200 bg-white p-10 shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-xl"
          >

            <h3 className="text-3xl font-bold">

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