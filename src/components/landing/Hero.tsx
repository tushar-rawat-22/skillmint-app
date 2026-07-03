import Link from "next/link";

export default function Hero() {
  return (
    <section className="relative overflow-hidden">

      <div className="absolute inset-0 bg-gradient-to-b from-green-50 via-white to-white" />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-6 py-32 text-center">

        <div className="rounded-full border border-green-200 bg-white px-5 py-2 text-sm font-medium shadow-sm">
          🚀 The AI Career Operating System
        </div>

        <h1 className="mt-10 max-w-5xl text-6xl font-black leading-tight tracking-tight md:text-8xl">

          Build Your Career

          <span className="block text-green-600">
            with Intelligence.
          </span>

        </h1>

        <p className="mt-10 max-w-3xl text-xl leading-9 text-gray-600">

          SkillMint continuously understands your profile,
          measures your employability,
          identifies your weaknesses,
          and recommends the highest-impact next step.

        </p>

        <div className="mt-14 flex flex-wrap justify-center gap-5">

          <Link
            href="/upload"
            className="rounded-xl bg-black px-10 py-5 text-white transition hover:scale-105"
          >

            Start with resume upload

          </Link>

          <button className="rounded-xl border border-gray-300 px-10 py-5 transition hover:bg-gray-100">

            Explore Career IQ

          </button>

        </div>

      </div>

    </section>
  );
}
