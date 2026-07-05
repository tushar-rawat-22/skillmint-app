import Link from "next/link";

import { ROUTES } from "@/constants/routes";

export default function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-gray-900 bg-black text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,197,94,0.18),transparent_42%)]" />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-6 py-28 text-center md:py-32">
        <div className="rounded-full border border-green-500/30 bg-green-500/10 px-5 py-2 text-sm font-medium text-green-100 shadow-sm">
          AI-powered Career Operating System for students and freshers
        </div>

        <h1 className="mt-10 max-w-5xl text-5xl font-black leading-tight tracking-tight text-white md:text-7xl">
          Turn your resume into
          <span className="block text-green-600">
            a career action plan.
          </span>
        </h1>

        <p className="mt-8 max-w-3xl text-lg leading-8 text-gray-300 md:text-xl">
          SkillMint helps students and freshers understand their readiness, fix
          weak proof, match real jobs, and build a practical 30/60/90-day
          roadmap.
        </p>

        <div className="mt-12 flex flex-wrap justify-center gap-4">
          <Link
            href={ROUTES.SIGNUP}
            className="rounded-xl bg-green-600 px-8 py-4 font-semibold text-white shadow-lg shadow-green-950/40 transition hover:bg-green-500"
          >
            Start Free
          </Link>

          <a
            href="#preview"
            className="rounded-xl border border-gray-700 bg-white/5 px-8 py-4 font-semibold text-gray-100 transition hover:border-green-500 hover:text-green-300"
          >
            See Product Preview
          </a>
        </div>

        <p className="mt-6 text-sm text-gray-500">
          No job guarantees. Just clearer proof, gaps, and next actions.
        </p>
      </div>
    </section>
  );
}
