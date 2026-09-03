import Link from "next/link";

export default function UploadHero() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
      <div className="border-b border-slate-300 pb-9">
        <p className="text-sm font-semibold text-emerald-800">Step 2 of 2</p>

        <h1 className="mt-3 max-w-4xl text-4xl font-black tracking-[-0.03em] md:text-6xl">
          Now, show us what your resume says.
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-600">
          SkillMint will show what your resume supports for the role you want,
          the clearest gap, and one practical next step.
        </p>

        <Link
          href="/setup"
          className="mt-5 inline-flex min-h-11 items-center font-semibold text-slate-700 underline-offset-4 hover:text-emerald-900 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald-700"
        >
          Change target role
        </Link>
      </div>
    </section>
  );
}
