import Link from "next/link";

import { ROUTES } from "@/constants/routes";

export default function Hero() {
  return (
    <section className="relative overflow-hidden text-gray-950">

      <div className="absolute inset-0 bg-gradient-to-b from-green-50 via-white to-white" />

      <div className="relative mx-auto flex max-w-7xl flex-col items-center px-6 py-32 text-center">

        <div className="rounded-full border border-green-200 bg-white px-5 py-2 text-sm font-medium text-gray-800 shadow-sm">
          AI-powered Career Operating System for students and freshers
        </div>

        <h1 className="mt-10 max-w-5xl text-6xl font-black leading-tight tracking-tight text-gray-950 md:text-8xl">

          Turn your resume into

          <span className="block text-green-600">
            a career action plan.
          </span>

        </h1>

        <p className="mt-10 max-w-3xl text-xl leading-9 text-gray-600">

          SkillMint helps students and freshers choose a target role, analyze
          resume proof, match real job descriptions, and build a practical
          30/60/90-day roadmap.

        </p>

        <div className="mt-14 flex flex-wrap justify-center gap-5">

          <Link
            href={ROUTES.SETUP}
            className="rounded-xl bg-black px-10 py-5 font-semibold text-white transition hover:scale-105"
          >

            Start Career Setup

          </Link>

          <Link
            href={ROUTES.UPLOAD}
            className="rounded-xl border border-gray-300 px-10 py-5 font-semibold text-gray-900 transition hover:bg-gray-100"
          >

            Upload Resume

          </Link>

          <Link
            href={ROUTES.DASHBOARD}
            className="rounded-xl border border-gray-300 px-10 py-5 font-semibold text-gray-700 transition hover:bg-gray-100"
          >
            View Dashboard Preview
          </Link>

        </div>

      </div>

    </section>
  );
}
